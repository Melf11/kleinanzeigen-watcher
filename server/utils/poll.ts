import { query, withTransaction } from './db'
import { getSearchById, type SearchRow } from './searches'
import { getUserById } from './users'
import { searchAds, KlazError, type KlazAd } from './klaz'
import { filterAds, parseKeywords, type IncludeMode } from './matcher'
import { computeNextRunAt } from './schedule'
import { notifyForRun } from './notify'

export interface RunResult {
  status: 'ok' | 'error'
  matched: number
  newCount: number
  removedCount: number
  pagesFetched: number
  error?: string
}

function toCents(ad: KlazAd): number | null {
  const amount = ad.price?.amount
  return amount == null || Number.isNaN(amount) ? null : Math.round(amount)
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

async function scheduleNext(search: SearchRow, status: string, error: string | null) {
  const tz = useRuntimeConfig().tz || 'Europe/Berlin'
  const nextRun = computeNextRunAt(search.interval_minutes, search.run_time, tz)
  await query(
    `UPDATE searches
       SET last_run_at = now(),
           next_run_at = $2,
           last_run_status = $3,
           last_error = $4
     WHERE id = $1`,
    [search.id, nextRun, status, error],
  )
}

/**
 * Poll a single search: live search → local keyword filter → persist ads,
 * price changes and an aggregate run snapshot. Builds the price history that
 * the API itself does not provide.
 */
export async function runSearch(
  searchId: string,
  opts: { notify?: boolean } = {},
): Promise<RunResult> {
  const search = await getSearchById(searchId)
  if (!search) return { status: 'error', matched: 0, newCount: 0, removedCount: 0, pagesFetched: 0, error: 'Suche nicht gefunden' }

  const owner = await getUserById(search.user_id)
  const token = owner?.klaz_api_key

  if (!token) {
    const error = 'Kein API-Token hinterlegt (unter Einstellungen eintragen)'
    await scheduleNext(search, 'error', error)
    await query(
      `INSERT INTO search_runs (search_id, status, error) VALUES ($1, 'error', $2)`,
      [search.id, error],
    )
    return { status: 'error', matched: 0, newCount: 0, removedCount: 0, pagesFetched: 0, error }
  }

  let ads: KlazAd[]
  let pagesFetched = 0
  let truncated = false
  try {
    const res = await searchAds(
      token,
      {
        q: search.query,
        location_id: search.location_id,
        distance: search.distance,
        min_price: search.min_price,
        max_price: search.max_price,
        category_id: search.category_id,
        poster_type: search.poster_type,
        ad_type: search.ad_type,
        picture_required: search.picture_required,
        shippable: search.shippable,
      },
      search.max_pages,
    )
    ads = res.ads
    pagesFetched = res.pagesFetched
    truncated = res.truncated
  } catch (err) {
    const error = err instanceof KlazError ? `${err.code}: ${err.message}` : (err as Error).message
    await scheduleNext(search, 'error', error)
    await query(
      `INSERT INTO search_runs (search_id, status, error, pages_fetched) VALUES ($1, 'error', $2, $3)`,
      [search.id, error, pagesFetched],
    )
    return { status: 'error', matched: 0, newCount: 0, removedCount: 0, pagesFetched, error }
  }

  // Local keyword filter (no extra credits).
  const matched = filterAds(ads, {
    include: parseKeywords(search.include_keywords),
    includeMode: (search.include_mode as IncludeMode) || 'all',
    exclude: parseKeywords(search.exclude_keywords),
  })

  let newCount = 0
  let removedCount = 0
  const seenAdIds = new Set<string>()
  const prices: number[] = []
  const newAds: { title: string; price: number | null; url: string | null }[] = []
  const priceDrops: { title: string; oldPrice: number | null; newPrice: number | null; url: string | null }[] = []

  await withTransaction(async (client) => {
    for (const ad of matched) {
      seenAdIds.add(ad.ad_id)
      const price = toCents(ad)

      const existing = await client.query<{ id: string; current_price: number | null; excluded: boolean }>(
        'SELECT id, current_price, excluded FROM ads WHERE search_id = $1 AND ad_id = $2',
        [search.id, ad.ad_id],
      )

      // Manually excluded ads stay tracked but never count toward the statistics.
      const isExcluded = existing.rows[0]?.excluded ?? false
      if (price != null && !isExcluded) prices.push(price)

      const imageUrl = ad.images?.[0] ?? null
      const postedAt = ad.created_at ?? null

      if (existing.rows.length === 0) {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO ads
             (search_id, ad_id, title, ad_url, image_url, location_city, location_zip,
              seller_type, posted_at, current_price, status, first_seen_at, last_seen_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active', now(), now())
           RETURNING id`,
          [
            search.id, ad.ad_id, ad.title ?? '', ad.ad_url ?? null, imageUrl,
            ad.location?.city ?? null, ad.location?.zip ?? null, ad.seller?.type ?? null,
            postedAt, price,
          ],
        )
        await client.query(
          'INSERT INTO price_history (ad_row_id, price) VALUES ($1, $2)',
          [inserted.rows[0].id, price],
        )
        newCount++
        if (!isExcluded) newAds.push({ title: ad.title ?? '', price, url: ad.ad_url ?? null })
      } else {
        const row = existing.rows[0]
        if (row.current_price !== price) {
          await client.query('INSERT INTO price_history (ad_row_id, price) VALUES ($1, $2)', [
            row.id,
            price,
          ])
          if (!isExcluded && price != null && row.current_price != null && price < row.current_price) {
            priceDrops.push({ title: ad.title ?? '', oldPrice: row.current_price, newPrice: price, url: ad.ad_url ?? null })
          }
        }
        await client.query(
          `UPDATE ads SET
             title = $2, ad_url = $3, image_url = $4, location_city = $5, location_zip = $6,
             seller_type = $7, posted_at = $8, current_price = $9,
             status = 'active', removed_at = NULL, last_seen_at = now()
           WHERE id = $1`,
          [
            row.id, ad.title ?? '', ad.ad_url ?? null, imageUrl,
            ad.location?.city ?? null, ad.location?.zip ?? null, ad.seller?.type ?? null,
            postedAt, price,
          ],
        )
      }
    }

    // Removed detection — only when the result set was complete (no page cap hit),
    // otherwise an ad missing from page 1 would be wrongly flagged as removed.
    if (!truncated) {
      const active = await client.query<{ id: string; ad_id: string }>(
        `SELECT id, ad_id FROM ads WHERE search_id = $1 AND status = 'active'`,
        [search.id],
      )
      for (const row of active.rows) {
        if (!seenAdIds.has(row.ad_id)) {
          await client.query(
            `UPDATE ads SET status = 'removed', removed_at = now() WHERE id = $1`,
            [row.id],
          )
          removedCount++
        }
      }
    }
  })

  const priceMin = prices.length ? Math.min(...prices) : null
  const priceMax = prices.length ? Math.max(...prices) : null
  const priceAvg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null
  const priceMedian = median(prices)

  await query(
    `INSERT INTO search_runs
       (search_id, ads_total, price_min, price_max, price_avg, price_median,
        new_count, removed_count, pages_fetched, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ok')`,
    [
      search.id, matched.length, priceMin, priceMax,
      priceAvg != null ? priceAvg.toFixed(2) : null, priceMedian,
      newCount, removedCount, pagesFetched,
    ],
  )

  await scheduleNext(search, 'ok', null)

  // Send the summary on scheduled runs only (not on manual "refresh" clicks).
  if (opts.notify && owner && search.notify !== 'off') {
    await notifyForRun(owner, search, {
      matched: matched.length,
      newCount,
      removedCount,
      priceMin,
      priceMax,
      priceMedian,
      newAds,
      priceDrops,
    }).catch((e) => console.error(`[notify] dispatch failed for search #${search.id}`, e))
  }

  return { status: 'ok', matched: matched.length, newCount, removedCount, pagesFetched }
}
