import { createUser, getUserByUsername, getUserByEmail } from '../../utils/users'
import { createAuthToken } from '../../utils/tokens'
import { sendVerificationEmail, appBaseUrl } from '../../utils/email'
import { isValidEmail, validatePassword, normalizeEmail } from '../../utils/validators'
import { rateLimit } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'register', 5, 60 * 60 * 1000) // 5 / hour / IP

  const body = await readBody<{ username?: string; email?: string; password?: string }>(event)
  const username = body?.username?.trim()
  const email = body?.email ? normalizeEmail(body.email) : ''
  const password = body?.password ?? ''

  if (!username || username.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Benutzername muss mind. 3 Zeichen haben' })
  }
  if (!isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte eine gültige E-Mail-Adresse angeben' })
  }
  const pwErr = validatePassword(password)
  if (pwErr) throw createError({ statusCode: 400, statusMessage: pwErr })

  // Usernames are user-chosen identifiers → it's fine to report a conflict.
  if (await getUserByUsername(username)) {
    throw createError({ statusCode: 409, statusMessage: 'Benutzername bereits vergeben' })
  }

  // Email existence must NOT leak: respond the same whether or not it exists.
  const existing = await getUserByEmail(email)
  if (existing) {
    // Don't create a second account; the generic response below is returned.
    return { ok: true, message: 'Bitte bestätige deine E-Mail. Prüfe dein Postfach.' }
  }

  const user = await createUser(username, email, password)
  const token = await createAuthToken(user.id, 'verify_email', 60, email)
  const link = `${appBaseUrl(event)}/verify-email?token=${token}`
  await sendVerificationEmail(email, link)

  return { ok: true, message: 'Bitte bestätige deine E-Mail. Prüfe dein Postfach.' }
})
