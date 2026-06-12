import { randomBytes, createHash } from 'node:crypto'
import { query, withTransaction } from './db'

export type TokenKind = 'verify_email' | 'reset_password' | 'change_email'

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * Create a single-use token of the given kind. The raw token is returned (to be
 * emailed); only its SHA-256 hash is stored. Any older unused tokens of the same
 * kind for the user are invalidated first.
 */
export async function createAuthToken(
  userId: string | number,
  kind: TokenKind,
  ttlMinutes: number,
  email?: string | null,
): Promise<string> {
  const raw = randomBytes(32).toString('hex')
  const tokenHash = hashToken(raw)
  await query(
    `UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND kind = $2 AND used_at IS NULL`,
    [userId, kind],
  )
  await query(
    `INSERT INTO auth_tokens (user_id, kind, token_hash, email, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
    [userId, kind, tokenHash, email ?? null, String(ttlMinutes)],
  )
  return raw
}

export interface ConsumedToken {
  user_id: string
  email: string | null
}

/**
 * Atomically validate and consume a token. Returns the row if valid (unused,
 * unexpired) and marks it used; otherwise null.
 */
export async function consumeAuthToken(
  raw: string,
  kind: TokenKind,
): Promise<ConsumedToken | null> {
  if (!raw) return null
  const tokenHash = hashToken(raw)
  return withTransaction(async (client) => {
    const res = await client.query<{ id: string; user_id: string; email: string | null }>(
      `SELECT id, user_id, email FROM auth_tokens
        WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now()
        FOR UPDATE`,
      [tokenHash, kind],
    )
    if (res.rows.length === 0) return null
    await client.query('UPDATE auth_tokens SET used_at = now() WHERE id = $1', [res.rows[0].id])
    return { user_id: res.rows[0].user_id, email: res.rows[0].email }
  })
}
