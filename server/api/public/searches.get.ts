import { listPublicSearches } from '../../utils/searches'

// Public: filterable list of shared searches (no auth).
export default defineEventHandler(async (event) => {
  const q = getQuery(event).q as string | undefined
  return listPublicSearches(q)
})
