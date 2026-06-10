/**
 * Thin client for the kleinanzeigen-agent.de REST API.
 * Docs base: https://api.kleinanzeigen-agent.de/api/v2/kleinanzeigen
 *
 * The token is passed in per call because every user has their own.
 */

const BASE_URL = 'https://api.kleinanzeigen-agent.de/api/v2/kleinanzeigen'

export interface KlazAd {
  ad_id: string
  title: string
  description?: string | null
  price?: {
    amount: number | null
    currency_code?: string
    price_type?: string
    negotiable?: boolean
  } | null
  shipping_available?: boolean
  images?: string[]
  ad_url?: string
  created_at?: string | null
  status?: string
  deleted?: boolean
  seller?: { seller_id?: string | null; type?: string | null } | null
  location?: { id?: string; name?: string; city?: string; zip?: string } | null
  category?: { id?: string; name?: string } | null
}

interface KlazSearchResponse {
  success: boolean
  message?: string
  error_code?: string
  data?: {
    meta?: { page: number; size: number; total: number; has_next_page: boolean; next_page?: number }
    ads?: KlazAd[]
  }
}

export interface KlazSearchFilters {
  q: string
  location_id?: string | null
  distance?: string | null
  min_price?: number | null
  max_price?: number | null
  category_id?: string | null
  poster_type?: string | null
  ad_type?: string | null
  picture_required?: boolean
  shippable?: boolean
}

export class KlazError extends Error {
  code: string
  status: number
  constructor(message: string, code: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

function buildSearchUrl(filters: KlazSearchFilters, page: number, size: number): string {
  const url = new URL(`${BASE_URL}/search`)
  url.searchParams.set('q', filters.q)
  url.searchParams.set('page', String(page))
  url.searchParams.set('size', String(size))
  if (filters.location_id) url.searchParams.set('location_id', filters.location_id)
  if (filters.distance) url.searchParams.set('distance', filters.distance)
  if (filters.min_price != null) url.searchParams.set('min_price', String(filters.min_price))
  if (filters.max_price != null) url.searchParams.set('max_price', String(filters.max_price))
  if (filters.category_id) url.searchParams.set('category_id', filters.category_id)
  if (filters.poster_type) url.searchParams.set('poster_type', filters.poster_type)
  if (filters.ad_type) url.searchParams.set('ad_type', filters.ad_type)
  if (filters.picture_required) url.searchParams.set('picture_required', 'true')
  if (filters.shippable) url.searchParams.set('shippable', 'true')
  return url.toString()
}

async function fetchPage(
  token: string,
  filters: KlazSearchFilters,
  page: number,
  size: number,
): Promise<KlazSearchResponse> {
  let res: Response
  try {
    res = await fetch(buildSearchUrl(filters, page, size), {
      headers: { klaz_key: token },
    })
  } catch (err) {
    throw new KlazError(`Netzwerkfehler: ${(err as Error).message}`, 'NETWORK_ERROR', 502)
  }

  let json: KlazSearchResponse
  try {
    json = (await res.json()) as KlazSearchResponse
  } catch {
    throw new KlazError('Ungültige API-Antwort', 'BAD_RESPONSE', res.status)
  }

  if (!res.ok || json.success === false) {
    const code = json.error_code || `HTTP_${res.status}`
    throw new KlazError(json.message || `API-Fehler (${res.status})`, code, res.status)
  }
  return json
}

/**
 * Run a paginated live search. Stops at `maxPages` or when there is no next
 * page. Returns the collected ads and how many pages were fetched (= credits).
 */
export async function searchAds(
  token: string,
  filters: KlazSearchFilters,
  maxPages = 1,
): Promise<{ ads: KlazAd[]; pagesFetched: number; total: number; truncated: boolean }> {
  if (!token) {
    throw new KlazError('Kein API-Token hinterlegt', 'NO_TOKEN', 401)
  }

  const size = 100
  const pages = Math.max(1, Math.min(maxPages, 10))
  const ads: KlazAd[] = []
  let pagesFetched = 0
  let total = 0
  let hasNext = false

  for (let page = 0; page < pages; page++) {
    const json = await fetchPage(token, filters, page, size)
    pagesFetched++
    const data = json.data
    if (data?.ads?.length) ads.push(...data.ads)
    total = data?.meta?.total ?? total
    hasNext = !!data?.meta?.has_next_page
    if (!hasNext) break
  }

  // truncated = there were more pages available than we fetched (page cap hit).
  return { ads, pagesFetched, total, truncated: hasNext }
}
