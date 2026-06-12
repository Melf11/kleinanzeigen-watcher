import { consumeAuthToken } from '../../utils/tokens'
import { getUserById, setEmailVerified } from '../../utils/users'
import { rateLimit } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'verify', 20, 60 * 60 * 1000)
  const body = await readBody<{ token?: string }>(event)
  const consumed = await consumeAuthToken(body?.token ?? '', 'verify_email')
  if (!consumed) {
    throw createError({ statusCode: 400, statusMessage: 'Link ungültig oder abgelaufen' })
  }

  await setEmailVerified(consumed.user_id)

  // Log the user in directly after verifying for a smooth first experience.
  const user = await getUserById(consumed.user_id)
  if (user) {
    await setUserSession(event, { user: { id: user.id, username: user.username, isAdmin: user.is_admin } })
  }
  return { ok: true }
})
