const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string | undefined | null): email is string {
  return !!email && EMAIL_RE.test(email) && email.length <= 254
}

export function validatePassword(password: string | undefined | null): string | null {
  if (!password || password.length < 8) return 'Passwort muss mindestens 8 Zeichen haben'
  if (password.length > 200) return 'Passwort ist zu lang'
  return null
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
