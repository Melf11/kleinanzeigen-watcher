import { query } from '../../../utils/db'
import { getSearchForUser } from '../../../utils/searches'
import { requireUserId } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  const search = await getSearchForUser(id, userId)
  if (!search) throw createError({ statusCode: 404, statusMessage: 'Suche nicht gefunden' })

  // Oldest → newest, only successful runs (those carry price aggregates).
  return query(
    `SELECT run_at, ads_total, price_min, price_max,
            price_avg::float8 AS price_avg, price_median, new_count, removed_count
       FROM search_runs
      WHERE search_id = $1 AND status = 'ok'
      ORDER BY run_at ASC
      LIMIT 500`,
    [id],
  )
})
