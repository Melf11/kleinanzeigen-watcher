import nodemailer, { type Transporter } from 'nodemailer'
import type { H3Event } from 'h3'
import { getRequestURL } from 'h3'

let transporter: Transporter | null | undefined

function getTransport(): Transporter | null {
  if (transporter !== undefined) return transporter
  const smtp = useRuntimeConfig().smtp
  if (!smtp?.host) {
    transporter = null // no SMTP configured → log fallback
    return null
  }
  const port = Number(smtp.port) || 587
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port,
    secure: smtp.secure === true || smtp.secure === 'true' || port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  })
  return transporter
}

/** Base URL for links in emails: configured app URL, else derived from request. */
export function appBaseUrl(event: H3Event): string {
  const configured = useRuntimeConfig().public.appUrl as string
  if (configured) return configured.replace(/\/$/, '')
  const url = getRequestURL(event)
  return `${url.protocol}//${url.host}`
}

async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  const smtp = useRuntimeConfig().smtp
  const from = smtp?.from || smtp?.user || 'noreply@localhost'
  const t = getTransport()
  if (!t) {
    // Dev/no-SMTP fallback: log instead of sending so the flow is testable.
    console.log(`\n[email:LOG] → ${opts.to}\nSubject: ${opts.subject}\n${opts.text}\n`)
    return
  }
  await t.sendMail({ from, ...opts })
}

/** Current SMTP config for the admin view (never includes the password). */
export function getSmtpStatus() {
  const s = useRuntimeConfig().smtp
  const port = Number(s?.port) || 587
  return {
    configured: !!s?.host,
    host: s?.host || null,
    port,
    secure: s?.secure === true || s?.secure === 'true' || port === 465,
    user: s?.user || null,
    from: s?.from || s?.user || null,
  }
}

/** Send a test email. Returns {logged:true} if no SMTP is configured (dev). */
export async function sendTestMail(to: string): Promise<{ sent: boolean; logged: boolean }> {
  const t = getTransport()
  if (!t) {
    console.log(`\n[email:LOG] → ${to}\nSubject: Test\n(SMTP not configured — logged only)\n`)
    return { sent: false, logged: true }
  }
  const smtp = useRuntimeConfig().smtp
  const from = smtp?.from || smtp?.user || 'noreply@localhost'
  await t.sendMail({
    from,
    to,
    ...buildEmail({
      subject: 'Test – Kleinanzeigen Preis-Watcher',
      heading: 'Mailversand funktioniert ✅',
      intro: 'Diese Test-E-Mail bestätigt, dass der Mailversand korrekt eingerichtet ist.',
      note: 'Du erhältst diese Nachricht, weil im Admin-Bereich ein Mailserver-Test ausgelöst wurde.',
    }),
  })
  return { sent: true, logged: false }
}

const appName = 'Kleinanzeigen Preis-Watcher'
const BRAND = '#0f766e'
const BRAND_LIGHT = '#0d9488'

interface EmailParts {
  subject: string
  heading: string
  intro: string
  buttonLabel?: string
  url?: string
  note: string
}

/** Branded, email-client-safe HTML (inline styles, table layout) + text fallback. */
function buildEmail(p: EmailParts): { subject: string; text: string; html: string } {
  const hasButton = !!(p.url && p.buttonLabel)
  const text =
    `${p.heading}\n\n${p.intro}\n\n` +
    (hasButton ? `${p.buttonLabel}:\n${p.url}\n\n` : '') +
    `${p.note}\n\n— ${appName}`

  const buttonHtml = hasButton
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${BRAND}" style="border-radius:8px;">
            <a href="${p.url}" target="_blank" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${p.buttonLabel}</a>
          </td></tr></table>
          <p style="margin:24px 0 6px;font-size:13px;color:#64748b;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
          <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${p.url}" target="_blank" style="color:${BRAND_LIGHT};">${p.url}</a></p>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:${BRAND};padding:18px 28px;">
          <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;background:rgba(255,255,255,.15);border-radius:6px;color:#fff;font-weight:700;font-size:13px;vertical-align:middle;">KA</span>
          <span style="color:#ffffff;font-size:16px;font-weight:600;margin-left:8px;vertical-align:middle;">${appName}</span>
        </td></tr>
        <tr><td style="padding:30px 28px 8px;">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a;">${p.heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">${p.intro}</p>
          ${buttonHtml}
          <p style="margin:24px 0 4px;font-size:13px;line-height:1.5;color:#94a3b8;">${p.note}</p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
          <span style="font-size:12px;color:#94a3b8;">Diese E-Mail wurde automatisch von ${appName} versendet.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  return { subject: p.subject, text, html }
}

export function sendVerificationEmail(to: string, link: string) {
  return sendMail({
    to,
    ...buildEmail({
      subject: `${appName}: E-Mail bestätigen`,
      heading: 'Willkommen! 👋',
      intro: 'Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren und mit der Preisüberwachung zu starten.',
      buttonLabel: 'E-Mail bestätigen',
      url: link,
      note: 'Der Link ist 60 Minuten gültig. Wenn du dich nicht registriert hast, kannst du diese Nachricht ignorieren.',
    }),
  })
}

export function sendPasswordResetEmail(to: string, link: string) {
  return sendMail({
    to,
    ...buildEmail({
      subject: `${appName}: Passwort zurücksetzen`,
      heading: 'Passwort zurücksetzen',
      intro: 'Du hast ein neues Passwort angefordert. Klicke auf den Button, um ein neues Passwort zu vergeben.',
      buttonLabel: 'Neues Passwort setzen',
      url: link,
      note: 'Der Link ist 60 Minuten gültig. Wenn du das nicht warst, ignoriere diese E-Mail – dein Passwort bleibt unverändert.',
    }),
  })
}

export function sendEmailChangeEmail(to: string, link: string) {
  return sendMail({
    to,
    ...buildEmail({
      subject: `${appName}: Neue E-Mail-Adresse bestätigen`,
      heading: 'Neue E-Mail-Adresse bestätigen',
      intro: 'Bitte bestätige diese neue E-Mail-Adresse für dein Konto.',
      buttonLabel: 'Adresse bestätigen',
      url: link,
      note: 'Der Link ist 60 Minuten gültig. Wenn du das nicht angefordert hast, ignoriere diese Nachricht.',
    }),
  })
}
