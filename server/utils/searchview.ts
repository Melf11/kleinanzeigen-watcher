import { query } from './db'

// Shared read-model used by both the authenticated dashboard and the public view.

const EMPTY_STATS = { price_min: null, price_max: null, price_avg: null, price_median: null, n: 0 }

export async function getStats(searchId: string) {
  const runs = await query(
    `SELECT * FROM search_runs WHERE search_id = $1 AND status = 'ok' ORDER BY run_at DESC LIMIT 2`,
    [searchId],
  )
  const counts = await query<{ active: number; removed: number; excluded: number }>(
    `SELECT
       count(*) FILTER (WHERE status = 'active' AND NOT excluded)::int AS active,
       count(*) FILTER (WHERE status = 'removed' AND NOT excluded)::int AS removed,
       count(*) FILTER (WHERE status = 'active' AND excluded)::int AS excluded
     FROM ads WHERE search_id = $1`,
    [searchId],
  )
  const statsRows = await query<{
    basis: string
    price_min: number | null
    price_max: number | null
    price_avg: number | null
    price_median: number | null
    n: number
  }>(
    `SELECT 'available' AS basis,
       min(current_price) AS price_min, max(current_price) AS price_max,
       avg(current_price)::float8 AS price_avg,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY current_price)::float8 AS price_median,
       count(*)::int AS n
     FROM ads
     WHERE search_id = $1 AND status = 'active' AND NOT excluded AND current_price IS NOT NULL
     UNION ALL
     SELECT 'all' AS basis,
       min(current_price), max(current_price),
       avg(current_price)::float8,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY current_price)::float8,
       count(*)::int
     FROM ads
     WHERE search_id = $1 AND status IN ('active','removed') AND NOT excluded AND current_price IS NOT NULL`,
    [searchId],
  )
  return {
    latestRun: runs[0] ?? null,
    previousRun: runs[1] ?? null,
    counts: counts[0] ?? { active: 0, removed: 0, excluded: 0 },
    liveStats: statsRows.find((r) => r.basis === 'available') ?? EMPTY_STATS,
    liveStatsAll: statsRows.find((r) => r.basis === 'all') ?? EMPTY_STATS,
  }
}

export function getHistoryPoints(searchId: string) {
  return query(
    `SELECT run_at, ads_total, price_min, price_max,
            price_avg::float8 AS price_avg, price_median, new_count, removed_count
       FROM search_runs
      WHERE search_id = $1 AND status = 'ok'
      ORDER BY run_at ASC
      LIMIT 500`,
    [searchId],
  )
}

interface AdRow {
  id: string
  ad_id: string
  title: string
  ad_url: string | null
  image_url: string | null
  location_city: string | null
  location_zip: string | null
  seller_type: string | null
  posted_at: string | null
  first_seen_at: string
  last_seen_at: string
  current_price: number | null
  status: string
  removed_at: string | null
  excluded: boolean
}

export async function getAdsWithHistory(searchId: string) {
  const ads = await query<AdRow>(
    `SELECT id, ad_id, title, ad_url, image_url, location_city, location_zip, seller_type,
            posted_at, first_seen_at, last_seen_at, current_price, status, removed_at, excluded
       FROM ads
      WHERE search_id = $1
      ORDER BY (status = 'active') DESC, last_seen_at DESC`,
    [searchId],
  )
  if (!ads.length) return []

  const history = await query<{ ad_row_id: string; price: number | null; observed_at: string }>(
    `SELECT ad_row_id, price, observed_at FROM price_history
      WHERE ad_row_id = ANY($1::bigint[]) ORDER BY observed_at ASC`,
    [ads.map((a) => a.id)],
  )

  const byAd = new Map<string, { price: number | null; observed_at: string }[]>()
  for (const h of history) {
    const list = byAd.get(h.ad_row_id) ?? []
    list.push({ price: h.price, observed_at: h.observed_at })
    byAd.set(h.ad_row_id, list)
  }

  return ads.map((ad) => {
    const hist = byAd.get(ad.id) ?? []
    const prices = hist.filter((h) => h.price != null) as { price: number; observed_at: string }[]
    const first = prices[0]?.price ?? null
    const last = prices[prices.length - 1]?.price ?? null
    const prev = prices.length >= 2 ? prices[prices.length - 2].price : null

    let priceChange: 'up' | 'down' | 'same' | 'new' = 'same'
    if (prices.length <= 1) priceChange = 'new'
    else if (last != null && prev != null) priceChange = last > prev ? 'up' : last < prev ? 'down' : 'same'

    return {
      ...ad,
      history: hist,
      firstPrice: first,
      lastChange: prev != null && last != null ? last - prev : null,
      totalChange: first != null && last != null ? last - first : null,
      priceChange,
    }
  })
}
