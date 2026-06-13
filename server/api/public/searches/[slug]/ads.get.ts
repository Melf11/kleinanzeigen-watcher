import { getPublicSearchBySlug } from '../../../../utils/searches'
import { getAdsWithHistory } from '../../../../utils/searchview'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const search = await getPublicSearchBySlug(slug)
  if (!search) throw createError({ statusCode: 404, statusMessage: 'Öffentliche Suche nicht gefunden' })
  return getAdsWithHistory(search.id)
})
