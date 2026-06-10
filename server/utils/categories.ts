/**
 * Category tree from the kleinanzeigen-agent API. The tree is identical for
 * every user and changes rarely, so it is cached in-process to save credits.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export interface CategoryNode {
  id: string
  name: string
  children: { id: string; name: string }[]
}

interface RawCategory {
  id: string
  name: string
  parent_id: string | null
  children?: RawCategory[]
}

let cache: { data: CategoryNode[]; fetchedAt: number } | undefined

function simplify(raw: RawCategory[]): CategoryNode[] {
  // The API returns a single root ("Alle Kategorien", id "0") whose children are
  // the top-level categories. Fall back to treating the array itself as the tops.
  let tops = raw
  if (raw.length === 1 && raw[0].id === '0') {
    tops = raw[0].children ?? []
  }
  return tops
    .filter((c) => c.id !== '0')
    .map((c) => ({
      id: c.id,
      name: c.name,
      children: (c.children ?? []).map((sub) => ({ id: sub.id, name: sub.name })),
    }))
}

export async function getCategories(token: string | null | undefined): Promise<CategoryNode[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data
  }
  if (!token) return cache?.data ?? []

  const res = await fetch('https://api.kleinanzeigen-agent.de/api/v2/kleinanzeigen/categories', {
    headers: { klaz_key: token },
  })
  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: { categories?: RawCategory[] } }
    | null

  if (!res.ok || !json?.success || !json.data?.categories) {
    // On failure, serve a stale cache if we have one rather than erroring.
    return cache?.data ?? []
  }

  const data = simplify(json.data.categories)
  cache = { data, fetchedAt: Date.now() }
  return data
}
