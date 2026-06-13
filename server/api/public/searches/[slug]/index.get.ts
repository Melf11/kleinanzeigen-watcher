import { getPublicSearchBySlug } from '../../../../utils/searches'
import { getStats } from '../../../../utils/searchview'

// Public: read-only detail of a shared search (no owner/internal fields).
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const search = await getPublicSearchBySlug(slug)
  if (!search) throw createError({ statusCode: 404, statusMessage: 'Öffentliche Suche nicht gefunden' })

  const stats = await getStats(search.id)
  return {
    search: {
      public_slug: search.public_slug,
      name: search.name,
      query: search.query,
      include_keywords: search.include_keywords,
      include_mode: search.include_mode,
      exclude_keywords: search.exclude_keywords,
      interval_minutes: search.interval_minutes,
      last_run_at: search.last_run_at,
      created_at: search.created_at,
    },
    ...stats,
  }
})
