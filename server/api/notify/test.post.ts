import { getUserById } from '../../utils/users'
import { requireUserId } from '../../utils/session'
import { sendTelegram, sendWhatsApp, hasTelegram, hasWhatsApp } from '../../utils/notify'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readBody<{ channel?: 'telegram' | 'whatsapp' }>(event)
  const channel = body?.channel
  const user = await getUserById(userId)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User nicht gefunden' })

  const text = '✅ Test vom Kleinanzeigen Preis-Watcher – Benachrichtigungen funktionieren.'

  try {
    if (channel === 'telegram') {
      if (!hasTelegram(user)) throw createError({ statusCode: 400, statusMessage: 'Telegram nicht konfiguriert' })
      await sendTelegram(user.tg_bot_token!, user.tg_chat_id!, text)
    } else if (channel === 'whatsapp') {
      if (!hasWhatsApp(user)) throw createError({ statusCode: 400, statusMessage: 'WhatsApp nicht konfiguriert' })
      await sendWhatsApp(user.wa_phone!, user.wa_apikey!, text)
    } else {
      throw createError({ statusCode: 400, statusMessage: 'Unbekannter Kanal' })
    }
  } catch (e: any) {
    if (e?.statusCode) throw e
    throw createError({ statusCode: 502, statusMessage: `Senden fehlgeschlagen: ${e?.message || e}` })
  }

  return { ok: true }
})
