import { query, queryOne } from './db'
import { hashPassword } from './password'

export interface UserRow {
  id: string
  username: string
  password_hash: string
  klaz_api_key: string | null
  tg_bot_token: string | null
  tg_chat_id: string | null
  wa_phone: string | null
  wa_apikey: string | null
  created_at: string
}

export interface NotifyConfigInput {
  tgBotToken?: string | null
  tgChatId?: string | null
  waPhone?: string | null
  waApikey?: string | null
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

const clean = (v: string | null | undefined) => (v && v.trim().length ? v.trim() : null)

/** Update only the notification fields that are present in the input. */
export async function setUserNotifyConfig(
  id: string | number,
  cfg: NotifyConfigInput,
): Promise<void> {
  const sets: string[] = []
  const params: unknown[] = [id]
  const add = (col: string, val: string | null) => {
    params.push(val)
    sets.push(`${col} = $${params.length}`)
  }
  if ('tgBotToken' in cfg) add('tg_bot_token', clean(cfg.tgBotToken))
  if ('tgChatId' in cfg) add('tg_chat_id', clean(cfg.tgChatId))
  if ('waPhone' in cfg) add('wa_phone', clean(cfg.waPhone))
  if ('waApikey' in cfg) add('wa_apikey', clean(cfg.waApikey))
  if (!sets.length) return
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1`, params)
}

/** Mask an API token for safe display, e.g. "klaz_live_...Fn3k". */
export function maskToken(token: string | null | undefined): string | null {
  if (!token) return null
  if (token.length <= 12) return '••••'
  return `${token.slice(0, 10)}…${token.slice(-4)}`
}
