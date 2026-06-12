import {
  adminCreateUser,
  getUserByUsername,
  getUserByEmail,
} from '../../utils/users'
import { requireAdmin } from '../../utils/session'
import { isValidEmail, validatePassword, normalizeEmail } from '../../utils/validators'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ username?: string; email?: string; password?: string; isAdmin?: boolean }>(event)

  const username = body?.username?.trim()
  const email = body?.email ? normalizeEmail(body.email) : ''

  if (!username || username.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Benutzername muss mind. 3 Zeichen haben' })
  }
  const pwErr = validatePassword(body?.password)
  if (pwErr) throw createError({ statusCode: 400, statusMessage: pwErr })
  if (email && !isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
  }

  if (await getUserByUsername(username)) {
    throw createError({ statusCode: 409, statusMessage: 'Benutzername bereits vergeben' })
  }
  if (email && (await getUserByEmail(email))) {
    throw createError({ statusCode: 409, statusMessage: 'E-Mail bereits vergeben' })
  }

  const user = await adminCreateUser({
    username,
    email: email || null,
    password: body!.password!,
    isAdmin: !!body?.isAdmin,
  })
  return { ok: true, id: user.id }
})
