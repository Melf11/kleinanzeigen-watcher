import { consumeAuthToken } from '../../utils/tokens'
import { applyEmailChange } from '../../utils/users'
import { rateLimit } from '../../utils/ratelimit'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'verify', 20, 60 * 60 * 1000)
  const body = await readBody<{ token?: string }>(event)
  const consumed = await consumeAuthToken(body?.token ?? '', 'change_email')
  if (!consumed || !consumed.email) {
    throw createError({ statusCode: 400, statusMessage: 'Link ungültig oder abgelaufen' })
  }
  await applyEmailChange(consumed.user_id, consumed.email)
  return { ok: true }
})
