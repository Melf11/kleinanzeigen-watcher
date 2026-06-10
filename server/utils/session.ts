import type { H3Event } from 'h3'

/** Returns the authenticated user's id, throwing 401 if not logged in. */
export async function requireUserId(event: H3Event): Promise<string> {
  const session = await requireUserSession(event)
  const id = (session.user as { id?: string | number } | undefined)?.id
  if (id === undefined || id === null) {
    throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })
  }
  return String(id)
}
