import { updateSearch, type SearchInput } from '../../../utils/searches'
import { requireUserId } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody<SearchInput>(event)

  if (!body?.query?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Suchbegriff (query) erforderlich' })
  }

  const search = await updateSearch(id, userId, body)
  if (!search) throw createError({ statusCode: 404, statusMessage: 'Suche nicht gefunden' })
  return search
})
