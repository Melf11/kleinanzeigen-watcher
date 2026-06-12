import { consumeAuthToken } from '../../utils/tokens'
import { setUserPassword } from '../../utils/users'
import { validatePassword } from '../../utils/validators'
import { rateLimit } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'reset', 10, 30 * 60 * 1000)
  const body = await readBody<{ token?: string; password?: string }>(event)

  const pwErr = validatePassword(body?.password)
  if (pwErr) throw createError({ statusCode: 400, statusMessage: pwErr })

  const consumed = await consumeAuthToken(body?.token ?? '', 'reset_password')
  if (!consumed) {
    throw createError({ statusCode: 400, statusMessage: 'Link ungültig oder abgelaufen' })
  }

  await setUserPassword(consumed.user_id, body!.password!)
  return { ok: true }
})
