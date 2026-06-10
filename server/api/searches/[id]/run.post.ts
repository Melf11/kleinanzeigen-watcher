import { getSearchForUser } from '../../../utils/searches'
import { requireUserId } from '../../../utils/session'
import { runSearch } from '../../../utils/poll'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  // Ensure the search belongs to the requesting user before running it.
  const search = await getSearchForUser(id, userId)
  if (!search) throw createError({ statusCode: 404, statusMessage: 'Suche nicht gefunden' })

  const result = await runSearch(id)
  return result
})
