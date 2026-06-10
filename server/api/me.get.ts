import { getUserById, maskToken } from '../utils/users'
import { requireUserId } from '../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const user = await getUserById(userId)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User nicht gefunden' })

  return {
    id: user.id,
    username: user.username,
    hasToken: !!user.klaz_api_key,
    tokenMasked: maskToken(user.klaz_api_key),
  }
})
