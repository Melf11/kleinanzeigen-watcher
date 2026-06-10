import { createSearch, type SearchInput } from '../../utils/searches'
import { requireUserId } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readBody<SearchInput>(event)

  if (!body?.query?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Suchbegriff (query) erforderlich' })
  }

  const search = await createSearch(userId, body)
  return search
})
