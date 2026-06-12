import { requireAdmin } from '../../../utils/session'
import { sendTestMail } from '../../../utils/email'
import { isValidEmail, normalizeEmail } from '../../../utils/validators'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ to?: string }>(event)
  const to = body?.to ? normalizeEmail(body.to) : ''
  if (!isValidEmail(to)) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte eine gültige Empfänger-Adresse angeben' })
  }

  try {
    const res = await sendTestMail(to)
    if (res.logged) {
      return { ok: true, logged: true, message: 'Kein SMTP konfiguriert – E-Mail wurde nur in die Server-Konsole geloggt.' }
    }
    return { ok: true, sent: true, message: `Test-E-Mail an ${to} gesendet.` }
  } catch (e: any) {
    // Surface the real SMTP error (ECONNREFUSED, 535 auth, TLS …) to the admin.
    throw createError({ statusCode: 502, statusMessage: `Senden fehlgeschlagen: ${e?.message || e}` })
  }
})
