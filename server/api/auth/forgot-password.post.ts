import { getUserByEmail } from '../../utils/users'
import { createAuthToken } from '../../utils/tokens'
import { sendPasswordResetEmail, appBaseUrl } from '../../utils/email'
import { normalizeEmail } from '../../utils/validators'
import { rateLimit } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'forgot', 5, 30 * 60 * 1000)
  const body = await readBody<{ email?: string }>(event)
  const email = body?.email ? normalizeEmail(body.email) : ''

  // Generic response regardless of whether the email exists (no enumeration).
  if (email) {
    const user = await getUserByEmail(email)
    if (user && user.email) {
      const token = await createAuthToken(user.id, 'reset_password', 60, user.email)
      const link = `${appBaseUrl(event)}/reset-password?token=${token}`
      await sendPasswordResetEmail(user.email, link)
    }
  }
  return { ok: true, message: 'Falls die Adresse existiert, wurde ein Reset-Link gesendet.' }
})
