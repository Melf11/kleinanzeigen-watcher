import { getUserByUsername } from '../../utils/users'
import { verifyPassword } from '../../utils/password'
import { rateLimit } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'login', 10, 10 * 60 * 1000) // 10 attempts / 10 min / IP

  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = body?.username?.trim()
  const password = body?.password ?? ''

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Username und Passwort erforderlich' })
  }

  const user = await getUserByUsername(username)
  if (!user || !(await verifyPassword(user.password_hash, password))) {
    throw createError({ statusCode: 401, statusMessage: 'Ungültige Anmeldedaten' })
  }

  // Accounts with an email must verify it before logging in.
  // (Grandfathered/seeded accounts without an email may log in directly.)
  if (user.email && !user.email_verified) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Bitte bestätige zuerst deine E-Mail-Adresse.',
      data: { code: 'EMAIL_UNVERIFIED', email: user.email },
    })
  }

  await setUserSession(event, {
    user: { id: user.id, username: user.username, isAdmin: user.is_admin },
  })

  return { ok: true, user: { id: user.id, username: user.username } }
})
