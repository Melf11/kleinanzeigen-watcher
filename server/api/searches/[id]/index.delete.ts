import { deleteSearch } from '../../../utils/searches'
import { requireUserId } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  const ok = await deleteSearch(id, userId)
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'Suche nicht gefunden' })
  return { ok: true }
})
