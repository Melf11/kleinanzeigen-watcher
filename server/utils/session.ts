import type { H3Event } from 'h3'
import { getUserById, type UserRow } from './users'

/** Returns the authenticated user's id, throwing 401 if not logged in. */
export async function requireUserId(event: H3Event): Promise<string> {
  const session = await requireUserSession(event)
  const id = (session.user as { id?: string | number } | undefined)?.id
  if (id === undefined || id === null) {
    throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })
  }
  return String(id)
}

/** Requires the caller to be an admin (checked against the DB, not the cookie). */
export async function requireAdmin(event: H3Event): Promise<UserRow> {
  const userId = await requireUserId(event)
  const user = await getUserById(userId)
  if (!user?.is_admin) {
    throw createError({ statusCode: 403, statusMessage: 'Nur für Administratoren' })
  }
  return user
}
