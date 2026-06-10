import { getUserById, maskToken, setUserApiKey } from '../utils/users'
import { requireUserId } from '../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readBody<{ apiKey?: string | null }>(event)

  // Empty string clears the token; otherwise trim and store.
  const raw = body?.apiKey
  const apiKey = raw && raw.trim().length > 0 ? raw.trim() : null

  await setUserApiKey(userId, apiKey)

  const user = await getUserById(userId)
  return {
    ok: true,
    hasToken: !!user?.klaz_api_key,
    tokenMasked: maskToken(user?.klaz_api_key),
  }
})
