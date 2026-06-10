import { query, queryOne } from './db'
import { hashPassword } from './password'

export interface UserRow {
  id: string
  username: string
  password_hash: string
  klaz_api_key: string | null
  created_at: string
}

export function getUserById(id: string | number) {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id])
}

export function getUserByUsername(username: string) {
  return queryOne<UserRow>('SELECT * FROM users WHERE username = $1', [username])
}

export async function createUser(username: string, password: string): Promise<UserRow> {
  const passwordHash = await hashPassword(password)
  const rows = await query<UserRow>(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
    [username, passwordHash],
  )
  return rows[0]
}

export async function setUserApiKey(id: string | number, apiKey: string | null): Promise<void> {
  await query('UPDATE users SET klaz_api_key = $1 WHERE id = $2', [apiKey, id])
}

/** Mask an API token for safe display, e.g. "klaz_live_...Fn3k". */
export function maskToken(token: string | null | undefined): string | null {
  if (!token) return null
  if (token.length <= 12) return '••••'
  return `${token.slice(0, 10)}…${token.slice(-4)}`
}
