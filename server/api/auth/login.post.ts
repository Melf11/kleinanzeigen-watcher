import { getUserByUsername } from '../../utils/users'
import { verifyPassword } from '../../utils/password'

export default defineEventHandler(async (event) => {
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

  await setUserSession(event, {
    user: { id: user.id, username: user.username },
  })

  return { ok: true, user: { id: user.id, username: user.username } }
})
