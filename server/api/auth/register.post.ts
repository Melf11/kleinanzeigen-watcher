import { createUser, getUserByUsername } from '../../utils/users'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = body?.username?.trim()
  const password = body?.password ?? ''

  if (!username || username.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Username muss mind. 3 Zeichen haben' })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Passwort muss mind. 6 Zeichen haben' })
  }

  const existing = await getUserByUsername(username)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Username bereits vergeben' })
  }

  const user = await createUser(username, password)
  await setUserSession(event, {
    user: { id: user.id, username: user.username },
  })

  return { ok: true, user: { id: user.id, username: user.username } }
})
