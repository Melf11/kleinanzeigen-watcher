import { getUserById, maskToken, setUserApiKey, setUserNotifyConfig, type NotifyConfigInput } from '../utils/users'
import { requireUserId } from '../utils/session'

interface Body extends NotifyConfigInput {
  apiKey?: string | null
}

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readBody<Body>(event)

  if ('apiKey' in (body ?? {})) {
    const raw = body.apiKey
    const apiKey = raw && raw.trim().length > 0 ? raw.trim() : null
    await setUserApiKey(userId, apiKey)
  }

  // Only the notification fields actually present in the body are touched.
  const notifyCfg: NotifyConfigInput = {}
  for (const k of ['tgBotToken', 'tgChatId', 'waPhone', 'waApikey'] as const) {
    if (k in (body ?? {})) notifyCfg[k] = body[k]
  }
  if (Object.keys(notifyCfg).length) await setUserNotifyConfig(userId, notifyCfg)

  const user = await getUserById(userId)
  return {
    ok: true,
    hasToken: !!user?.klaz_api_key,
    tokenMasked: maskToken(user?.klaz_api_key),
    telegram: { configured: !!(user?.tg_bot_token && user?.tg_chat_id) },
    whatsapp: { configured: !!(user?.wa_phone && user?.wa_apikey) },
  }
})
