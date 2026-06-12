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
    subject: 'Test – Kleinanzeigen Preis-Watcher',
    text: 'Dies ist eine Test-E-Mail. Erhältst du sie, ist der Mailversand korrekt eingerichtet. ✅',
  })
  return { sent: true, logged: false }
}

const appName = 'Kleinanzeigen Preis-Watcher'

export function sendVerificationEmail(to: string, link: string) {
  return sendMail({
    to,
    subject: `${appName}: E-Mail bestätigen`,
    text: `Willkommen!\n\nBitte bestätige deine E-Mail-Adresse mit diesem Link (60 Min. gültig):\n${link}\n\nWenn du dich nicht registriert hast, ignoriere diese Nachricht.`,
  })
}

export function sendPasswordResetEmail(to: string, link: string) {
  return sendMail({
    to,
    subject: `${appName}: Passwort zurücksetzen`,
    text: `Du hast ein neues Passwort angefordert.\n\nSetze es mit diesem Link (60 Min. gültig):\n${link}\n\nWenn du das nicht warst, ignoriere diese Nachricht – dein Passwort bleibt unverändert.`,
  })
}

export function sendEmailChangeEmail(to: string, link: string) {
  return sendMail({
    to,
    subject: `${appName}: Neue E-Mail-Adresse bestätigen`,
    text: `Bitte bestätige diese neue E-Mail-Adresse für dein Konto (60 Min. gültig):\n${link}\n\nWenn du das nicht angefordert hast, ignoriere diese Nachricht.`,
  })
}
