import { setSearchVisibility } from '../../../utils/searches'
import { requireUserId } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ public?: boolean }>(event)

  const res = await setSearchVisibility(id, userId, !!body?.public)
  if (!res) throw createError({ statusCode: 404, statusMessage: 'Suche nicht gefunden' })
  return res
})
