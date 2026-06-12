import { getUserById, getUserByEmail, setPendingEmail } from '../../utils/users'
import { verifyPassword } from '../../utils/password'
import { createAuthToken } from '../../utils/tokens'
import { sendEmailChangeEmail, appBaseUrl } from '../../utils/email'
import { isValidEmail, normalizeEmail } from '../../utils/validators'
import { requireUserId } from '../../utils/session'
import { rateLimit } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'change-email', 5, 30 * 60 * 1000)
  const userId = await requireUserId(event)
  const body = await readBody<{ email?: string; password?: string }>(event)
  const email = body?.email ? normalizeEmail(body.email) : ''

  if (!isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte eine gültige E-Mail-Adresse angeben' })
  }

  const user = await getUserById(userId)
  if (!user || !(await verifyPassword(user.password_hash, body?.password ?? ''))) {
    throw createError({ statusCode: 401, statusMessage: 'Passwort ist falsch' })
  }

  const other = await getUserByEmail(email)
  if (other && other.id !== userId) {
    throw createError({ statusCode: 409, statusMessage: 'E-Mail wird bereits verwendet' })
  }

  await setPendingEmail(userId, email)
  const token = await createAuthToken(userId, 'change_email', 60, email)
  const link = `${appBaseUrl(event)}/verify-email?token=${token}&change=1`
  await sendEmailChangeEmail(email, link)

  return { ok: true, message: 'Bestätigungs-Mail an die neue Adresse gesendet.' }
})
