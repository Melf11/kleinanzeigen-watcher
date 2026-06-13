import { query, queryOne } from './db'
import { computeNextRunAt, parseRunTime } from './schedule'

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
  notify: string
  run_time: string | null
  is_public: boolean
  public_slug: string | null
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
  notify?: string
  run_time?: string | null
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
const VALID_NOTIFY = new Set(['off', 'telegram', 'whatsapp', 'both'])

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
    notify: VALID_NOTIFY.has(input.notify || '') ? (input.notify as string) : 'off',
    run_time: parseRunTime(input.run_time) ? input.run_time!.trim() : null,
  }
}

export async function createSearch(userId: string, input: SearchInput): Promise<SearchRow> {
  const n = normalize(input)
  const tz = useRuntimeConfig().tz || 'Europe/Berlin'
  const nextRun = computeNextRunAt(n.interval_minutes, n.run_time, tz)
  const rows = await query<SearchRow>(
    `INSERT INTO searches
      (user_id, name, query, include_keywords, include_mode, exclude_keywords,
       location_id, distance, min_price, max_price, category_id, poster_type, ad_type,
       picture_required, shippable, max_pages, interval_minutes, enabled, notify, run_time, next_run_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     RETURNING *`,
    [
      userId, n.name, n.query, n.include_keywords, n.include_mode, n.exclude_keywords,
      n.location_id, n.distance, n.min_price, n.max_price, n.category_id, n.poster_type, n.ad_type,
      n.picture_required, n.shippable, n.max_pages, n.interval_minutes, n.enabled, n.notify, n.run_time,
      nextRun,
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
  const tz = useRuntimeConfig().tz || 'Europe/Berlin'
  // Reschedule the next run so interval/run_time edits take effect immediately.
  const nextRun = computeNextRunAt(n.interval_minutes, n.run_time, tz)
  const rows = await query<SearchRow>(
    `UPDATE searches SET
       name=$3, query=$4, include_keywords=$5, include_mode=$6, exclude_keywords=$7,
       location_id=$8, distance=$9, min_price=$10, max_price=$11, category_id=$12,
       poster_type=$13, ad_type=$14, picture_required=$15, shippable=$16,
       max_pages=$17, interval_minutes=$18, enabled=$19, notify=$20, run_time=$21,
       next_run_at=$22
     WHERE id=$1 AND user_id=$2
     RETURNING *`,
    [
      id, userId, n.name, n.query, n.include_keywords, n.include_mode, n.exclude_keywords,
      n.location_id, n.distance, n.min_price, n.max_price, n.category_id, n.poster_type, n.ad_type,
      n.picture_required, n.shippable, n.max_pages, n.interval_minutes, n.enabled, n.notify, n.run_time,
      nextRun,
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

import { randomBytes } from 'node:crypto'

/** Toggle a search's public visibility; generates a slug on first publish. */
export async function setSearchVisibility(
  id: string,
  userId: string,
  isPublic: boolean,
): Promise<{ is_public: boolean; public_slug: string | null } | null> {
  const search = await getSearchForUser(id, userId)
  if (!search) return null
  let slug = search.public_slug
  if (isPublic && !slug) slug = randomBytes(6).toString('hex')
  const rows = await query<{ is_public: boolean; public_slug: string | null }>(
    'UPDATE searches SET is_public = $3, public_slug = $4 WHERE id = $1 AND user_id = $2 RETURNING is_public, public_slug',
    [id, userId, isPublic, slug],
  )
  return rows[0] ?? null
}

export function getPublicSearchBySlug(slug: string) {
  return queryOne<SearchRow>('SELECT * FROM searches WHERE public_slug = $1 AND is_public = true', [slug])
}

export interface PublicSearchListRow {
  public_slug: string
  name: string
  query: string
  include_keywords: string
  active_count: number
  price_median: number | null
  price_min: number | null
  last_ok_run: string | null
}

/** Public, filterable list of shared searches. */
export function listPublicSearches(q?: string) {
  const term = q?.trim() ? `%${q.trim()}%` : null
  return query<PublicSearchListRow>(
    `SELECT s.public_slug, s.name, s.query, s.include_keywords,
            (SELECT count(*)::int FROM ads a WHERE a.search_id = s.id AND a.status = 'active' AND NOT a.excluded) AS active_count,
            r.price_median, r.price_min, r.run_at AS last_ok_run
       FROM searches s
       LEFT JOIN LATERAL (
         SELECT * FROM search_runs sr WHERE sr.search_id = s.id AND sr.status = 'ok'
          ORDER BY sr.run_at DESC LIMIT 1
       ) r ON true
      WHERE s.is_public = true
        AND ($1::text IS NULL OR s.name ILIKE $1 OR s.query ILIKE $1 OR s.include_keywords ILIKE $1)
      ORDER BY r.run_at DESC NULLS LAST
      LIMIT 100`,
    [term],
  )
}

/** Searches that are enabled and due for a poll. */
export function dueSearches() {
  return query<SearchRow>(
    'SELECT * FROM searches WHERE enabled = true AND next_run_at <= now() ORDER BY next_run_at ASC LIMIT 25',
  )
}
