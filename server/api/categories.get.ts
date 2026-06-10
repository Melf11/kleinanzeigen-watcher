import { getUserById } from '../utils/users'
import { requireUserId } from '../utils/session'
import { getCategories } from '../utils/categories'

/**
 * Cached category tree for the search form. Uses the user's token only if the
 * cache is cold (categories rarely change), so it normally costs no credits.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const user = await getUserById(userId)
  return getCategories(user?.klaz_api_key)
})
