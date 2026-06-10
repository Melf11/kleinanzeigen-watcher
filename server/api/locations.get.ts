import { getUserById } from '../utils/users'
import { requireUserId } from '../utils/session'

/**
 * Optional location lookup for the search form. Proxies to the agent API using
 * the user's own token. Costs 1 credit per call, so the UI calls it on demand
 * (button), not on every keystroke.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const q = (getQuery(event).q as string | undefined)?.trim()
  if (!q) return []

  const user = await getUserById(userId)
  if (!user?.klaz_api_key) {
    throw createError({ statusCode: 400, statusMessage: 'Kein API-Token hinterlegt' })
  }

  const url = new URL('https://api.kleinanzeigen-agent.de/api/v2/kleinanzeigen/locations')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '10')

  const res = await fetch(url, { headers: { klaz_key: user.klaz_api_key } })
  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: { locations?: unknown[] }; message?: string }
    | null

  if (!res.ok || !json?.success) {
    throw createError({ statusCode: res.status, statusMessage: json?.message || 'Standortsuche fehlgeschlagen' })
  }

  return json.data?.locations ?? json.data ?? []
})
