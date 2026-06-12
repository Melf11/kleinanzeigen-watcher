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
