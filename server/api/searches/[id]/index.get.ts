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

  const counts = await query<{ active: number; removed: number }>(
    `SELECT
       count(*) FILTER (WHERE status = 'active')::int AS active,
       count(*) FILTER (WHERE status = 'removed')::int AS removed
     FROM ads WHERE search_id = $1`,
    [id],
  )

  return {
    search,
    latestRun: runs[0] ?? null,
    previousRun: runs[1] ?? null,
    counts: counts[0] ?? { active: 0, removed: 0 },
  }
})
