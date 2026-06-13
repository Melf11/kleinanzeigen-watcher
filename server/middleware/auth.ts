import { getRequestURL } from 'h3'

// API paths that do not require an authenticated session.
const PUBLIC_API_PATHS = new Set(['/api/_auth/session', '/api/health'])

/**
 * Guard every /api/** route with a valid session, except auth + public paths.
 * All /api/auth/* endpoints (login, register, verify, reset …) are public;
 * page routes are left to the client-side global middleware.
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return
  if (path.startsWith('/api/auth/')) return
  if (path.startsWith('/api/public/')) return
  if (PUBLIC_API_PATHS.has(path)) return

  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })
  }
})
