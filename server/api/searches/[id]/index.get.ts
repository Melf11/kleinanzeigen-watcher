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
       count(*) FILTER (WHERE status = 'removed')::int AS removed,
       count(*) FILTER (WHERE status = 'active' AND excluded)::int AS excluded
     FROM ads WHERE search_id = $1`,
    [id],
  )

  // Live statistics over the currently active, non-excluded ads. Computed on the
  // fly so striking an ad from the stats takes effect immediately.
  const live = await query<{
    price_min: number | null
    price_max: number | null
    price_avg: number | null
    price_median: number | null
  }>(
    `SELECT
       min(current_price) AS price_min,
       max(current_price) AS price_max,
       avg(current_price)::float8 AS price_avg,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY current_price)::float8 AS price_median
     FROM ads
     WHERE search_id = $1 AND status = 'active' AND NOT excluded AND current_price IS NOT NULL`,
    [id],
  )

  return {
    search,
    latestRun: runs[0] ?? null,
    previousRun: runs[1] ?? null,
    counts: counts[0] ?? { active: 0, removed: 0, excluded: 0 },
    liveStats: live[0] ?? { price_min: null, price_max: null, price_avg: null, price_median: null },
  }
})
