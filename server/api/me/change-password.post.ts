import { getUserById, setUserPassword } from '../../utils/users'
import { verifyPassword } from '../../utils/password'
import { validatePassword } from '../../utils/validators'
import { requireUserId } from '../../utils/session'
import { rateLimit } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'change-password', 10, 30 * 60 * 1000)
  const userId = await requireUserId(event)
  const body = await readBody<{ currentPassword?: string; newPassword?: string }>(event)

  const pwErr = validatePassword(body?.newPassword)
  if (pwErr) throw createError({ statusCode: 400, statusMessage: pwErr })

  const user = await getUserById(userId)
  if (!user || !(await verifyPassword(user.password_hash, body?.currentPassword ?? ''))) {
    throw createError({ statusCode: 401, statusMessage: 'Aktuelles Passwort ist falsch' })
  }

  await setUserPassword(userId, body!.newPassword!)
  return { ok: true }
})
