import { query } from '../../../utils/db'
import { getSearchForUser } from '../../../utils/searches'
import { requireUserId } from '../../../utils/session'

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
}

interface HistoryRow {
  ad_row_id: string
  price: number | null
  observed_at: string
}

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  const search = await getSearchForUser(id, userId)
  if (!search) throw createError({ statusCode: 404, statusMessage: 'Suche nicht gefunden' })

  const ads = await query<AdRow>(
    `SELECT id, ad_id, title, ad_url, image_url, location_city, location_zip, seller_type,
            posted_at, first_seen_at, last_seen_at, current_price, status, removed_at
       FROM ads
      WHERE search_id = $1
      ORDER BY (status = 'active') DESC, last_seen_at DESC`,
    [id],
  )

  if (!ads.length) return []

  const history = await query<HistoryRow>(
    `SELECT ad_row_id, price, observed_at
       FROM price_history
      WHERE ad_row_id = ANY($1::bigint[])
      ORDER BY observed_at ASC`,
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

    // priceChange: direction of the most recent change; isNew: only one observation.
    let priceChange: 'up' | 'down' | 'same' | 'new' = 'same'
    if (prices.length <= 1) priceChange = 'new'
    else if (last != null && prev != null) {
      priceChange = last > prev ? 'up' : last < prev ? 'down' : 'same'
    }

    return {
      ...ad,
      history: hist,
      firstPrice: first,
      lastChange: prev != null && last != null ? last - prev : null,
      totalChange: first != null && last != null ? last - first : null,
      priceChange,
    }
  })
})
