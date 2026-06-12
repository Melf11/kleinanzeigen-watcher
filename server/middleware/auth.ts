import { getRequestURL } from 'h3'

// API paths that do not require an authenticated session.
const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/register',
  '/api/_auth/session',
  '/api/health',
])

/**
 * Guard every /api/** route with a valid session, except the auth endpoints.
 * Page routes are left untouched (handled by the client-side global middleware).
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return
  if (PUBLIC_API_PATHS.has(path)) return

  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })
  }
})
