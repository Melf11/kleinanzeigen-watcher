import { getUserById } from '../utils/users'
import { requireUserId } from '../utils/session'
import { getCategories } from '../utils/categories'

/**
 * Category tree for the search form. Served from the DB cache (pulled once).
 * Pass ?refresh=1 to force a one-off re-pull (costs 1 credit) if categories
 * ever change.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const force = getQuery(event).refresh === '1'

  // Token is only *used* on a cache miss or forced refresh — but it must be
  // available so the one-time initial pull can happen.
  const user = await getUserById(userId)
  return getCategories(user?.klaz_api_key, { force })
})
