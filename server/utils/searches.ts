import { query, queryOne } from './db'

export interface SearchRow {
  id: string
  user_id: string
  name: string
  query: string
  include_keywords: string
  include_mode: string
  exclude_keywords: string
  location_id: string | null
  distance: string | null
  min_price: number | null
  max_price: number | null
  category_id: string | null
  poster_type: string | null
  ad_type: string | null
  picture_required: boolean
  shippable: boolean
  max_pages: number
  interval_minutes: number
  enabled: boolean
  created_at: string
  last_run_at: string | null
  next_run_at: string
  last_run_status: string | null
  last_error: string | null
}

export interface SearchInput {
  name: string
  query: string
  include_keywords?: string
  include_mode?: string
  exclude_keywords?: string
  location_id?: string | null
  distance?: string | null
  min_price?: number | null
  max_price?: number | null
  category_id?: string | null
  poster_type?: string | null
  ad_type?: string | null
  picture_required?: boolean
  shippable?: boolean
  max_pages?: number
  interval_minutes?: number
  enabled?: boolean
}

export function listSearchesForUser(userId: string) {
  return query<SearchRow>('SELECT * FROM searches WHERE user_id = $1 ORDER BY created_at DESC', [
    userId,
  ])
}

export function getSearchForUser(id: string, userId: string) {
  return queryOne<SearchRow>('SELECT * FROM searches WHERE id = $1 AND user_id = $2', [id, userId])
}

export function getSearchById(id: string) {
  return queryOne<SearchRow>('SELECT * FROM searches WHERE id = $1', [id])
}

const VALID_MODES = new Set(['all', 'any'])

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, Math.round(n)))
}

function normalize(input: SearchInput) {
  return {
    name: (input.name || '').trim() || 'Unbenannte Suche',
    query: (input.query || '').trim(),
    include_keywords: (input.include_keywords || '').trim(),
    include_mode: VALID_MODES.has(input.include_mode || '') ? input.include_mode : 'all',
    exclude_keywords: (input.exclude_keywords || '').trim(),
    location_id: input.location_id?.toString().trim() || null,
    distance: input.distance?.toString().trim() || null,
    min_price: input.min_price != null && input.min_price !== ('' as unknown) ? Number(input.min_price) : null,
    max_price: input.max_price != null && input.max_price !== ('' as unknown) ? Number(input.max_price) : null,
    category_id: input.category_id?.toString().trim() || null,
    poster_type: input.poster_type || null,
    ad_type: input.ad_type || null,
    picture_required: !!input.picture_required,
    shippable: !!input.shippable,
    max_pages: clampInt(input.max_pages, 1, 1, 10),
    interval_minutes: clampInt(input.interval_minutes, 1440, 5, 60 * 24 * 30),
    enabled: input.enabled === undefined ? true : !!input.enabled,
  }
}

export async function createSearch(userId: string, input: SearchInput): Promise<SearchRow> {
  const n = normalize(input)
  const rows = await query<SearchRow>(
    `INSERT INTO searches
      (user_id, name, query, include_keywords, include_mode, exclude_keywords,
       location_id, distance, min_price, max_price, category_id, poster_type, ad_type,
       picture_required, shippable, max_pages, interval_minutes, enabled, next_run_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now())
     RETURNING *`,
    [
      userId, n.name, n.query, n.include_keywords, n.include_mode, n.exclude_keywords,
      n.location_id, n.distance, n.min_price, n.max_price, n.category_id, n.poster_type, n.ad_type,
      n.picture_required, n.shippable, n.max_pages, n.interval_minutes, n.enabled,
    ],
  )
  return rows[0]
}

export async function updateSearch(
  id: string,
  userId: string,
  input: SearchInput,
): Promise<SearchRow | null> {
  const n = normalize(input)
  const rows = await query<SearchRow>(
    `UPDATE searches SET
       name=$3, query=$4, include_keywords=$5, include_mode=$6, exclude_keywords=$7,
       location_id=$8, distance=$9, min_price=$10, max_price=$11, category_id=$12,
       poster_type=$13, ad_type=$14, picture_required=$15, shippable=$16,
       max_pages=$17, interval_minutes=$18, enabled=$19
     WHERE id=$1 AND user_id=$2
     RETURNING *`,
    [
      id, userId, n.name, n.query, n.include_keywords, n.include_mode, n.exclude_keywords,
      n.location_id, n.distance, n.min_price, n.max_price, n.category_id, n.poster_type, n.ad_type,
      n.picture_required, n.shippable, n.max_pages, n.interval_minutes, n.enabled,
    ],
  )
  return rows[0] ?? null
}

export async function deleteSearch(id: string, userId: string): Promise<boolean> {
  const rows = await query('DELETE FROM searches WHERE id = $1 AND user_id = $2 RETURNING id', [
    id,
    userId,
  ])
  return rows.length > 0
}

/** Searches that are enabled and due for a poll. */
export function dueSearches() {
  return query<SearchRow>(
    'SELECT * FROM searches WHERE enabled = true AND next_run_at <= now() ORDER BY next_run_at ASC LIMIT 25',
  )
}
