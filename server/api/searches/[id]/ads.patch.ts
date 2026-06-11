import { query } from '../../../utils/db'
import { getSearchForUser } from '../../../utils/searches'
import { requireUserId } from '../../../utils/session'

/**
 * Toggle whether a single ad is excluded from the statistics.
 * Body: { adRowId: string|number, excluded: boolean }
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ adRowId?: string | number; excluded?: boolean }>(event)

  const search = await getSearchForUser(id, userId)
  if (!search) throw createError({ statusCode: 404, statusMessage: 'Suche nicht gefunden' })

  if (body?.adRowId == null) {
    throw createError({ statusCode: 400, statusMessage: 'adRowId erforderlich' })
  }

  const rows = await query(
    `UPDATE ads SET excluded = $3 WHERE id = $1 AND search_id = $2 RETURNING id`,
    [body.adRowId, id, !!body.excluded],
  )
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'Anzeige nicht gefunden' })

  return { ok: true, excluded: !!body.excluded }
})
