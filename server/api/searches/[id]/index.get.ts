import { query } from '../../../utils/db'
import { getSearchForUser } from '../../../utils/searches'
import { requireUserId } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  const search = await getSearchForUser(id, userId)
  if (!search) throw createError({ statusCode: 404, statusMessage: 'Suche nicht gefunden' })

  const runs = await query(
    `SELECT * FROM search_runs WHERE search_id = $1 AND status = 'ok' ORDER BY run_at DESC LIMIT 2`,
    [id],
  )

  const counts = await query<{ active: number; removed: number; excluded: number }>(
    `SELECT
       count(*) FILTER (WHERE status = 'active' AND NOT excluded)::int AS active,
       count(*) FILTER (WHERE status = 'removed' AND NOT excluded)::int AS removed,
       count(*) FILTER (WHERE status = 'active' AND excluded)::int AS excluded
     FROM ads WHERE search_id = $1`,
    [id],
  )

  // Two statistic bases, both excluding manually struck ads:
  //  - "available": only currently active ads (the current market)
  //  - "all": active + removed ads at their last known price (full history)
  // Computed live so excluding/restoring an ad takes effect immediately.
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
    [id],
  )

  const empty = { price_min: null, price_max: null, price_avg: null, price_median: null, n: 0 }
  const liveStats = statsRows.find((r) => r.basis === 'available') ?? empty
  const liveStatsAll = statsRows.find((r) => r.basis === 'all') ?? empty

  return {
    search,
    latestRun: runs[0] ?? null,
    previousRun: runs[1] ?? null,
    counts: counts[0] ?? { active: 0, removed: 0, excluded: 0 },
    liveStats,
    liveStatsAll,
  }
})
