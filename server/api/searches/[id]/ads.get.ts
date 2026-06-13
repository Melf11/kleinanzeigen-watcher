import { getSearchForUser } from '../../../utils/searches'
import { requireUserId } from '../../../utils/session'
import { getAdsWithHistory } from '../../../utils/searchview'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  const search = await getSearchForUser(id, userId)
  if (!search) throw createError({ statusCode: 404, statusMessage: 'Suche nicht gefunden' })

  return getAdsWithHistory(id)
})
