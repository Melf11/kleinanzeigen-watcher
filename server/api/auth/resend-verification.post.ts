import { getUserByEmail } from '../../utils/users'
import { createAuthToken } from '../../utils/tokens'
import { sendVerificationEmail, appBaseUrl } from '../../utils/email'
import { normalizeEmail } from '../../utils/validators'
import { rateLimit } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'resend', 5, 30 * 60 * 1000)
  const body = await readBody<{ email?: string }>(event)
  const email = body?.email ? normalizeEmail(body.email) : ''

  // Always respond the same to avoid revealing whether the email exists.
  if (email) {
    const user = await getUserByEmail(email)
    if (user && user.email && !user.email_verified) {
      const token = await createAuthToken(user.id, 'verify_email', 60, user.email)
      const link = `${appBaseUrl(event)}/verify-email?token=${token}`
      await sendVerificationEmail(user.email, link)
    }
  }
  return { ok: true, message: 'Falls die Adresse existiert, wurde eine E-Mail gesendet.' }
})
