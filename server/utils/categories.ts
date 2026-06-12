/**
 * Category tree from the kleinanzeigen-agent API.
 *
 * Categories essentially never change, so they are pulled exactly once and then
 * persisted in the `app_cache` table. After that they are served from DB (and an
 * in-process memo) — surviving restarts and costing no further credits. A pull
 * only happens when the cache is empty or `force` is requested.
 */
import { query, queryOne } from './db'

const CACHE_KEY = 'categories'

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

let memo: CategoryNode[] | undefined

function simplify(raw: RawCategory[]): CategoryNode[] {
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

async function loadFromDb(): Promise<CategoryNode[] | null> {
  const row = await queryOne<{ value: CategoryNode[] }>(
    'SELECT value FROM app_cache WHERE key = $1',
    [CACHE_KEY],
  )
  return row?.value ?? null
}

async function saveToDb(data: CategoryNode[]): Promise<void> {
  await query(
    `INSERT INTO app_cache (key, value, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = now()`,
    [CACHE_KEY, JSON.stringify(data)],
  )
}

async function fetchFromApi(token: string): Promise<CategoryNode[]> {
  const res = await fetch('https://api.kleinanzeigen-agent.de/api/v2/kleinanzeigen/categories', {
    headers: { klaz_key: token },
  })
  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: { categories?: RawCategory[] } }
    | null
  if (!res.ok || !json?.success || !json.data?.categories) return []
  return simplify(json.data.categories)
}

export async function getCategories(
  token: string | null | undefined,
  opts: { force?: boolean } = {},
): Promise<CategoryNode[]> {
  if (!opts.force) {
    if (memo) return memo
    const db = await loadFromDb()
    if (db && db.length) {
      memo = db
      return db
    }
  }

  // Cache empty (or forced refresh): pull once if we have a token.
  if (!token) return memo ?? (await loadFromDb()) ?? []

  const fetched = await fetchFromApi(token)
  if (fetched.length) {
    memo = fetched
    await saveToDb(fetched)
    return fetched
  }
  // On failure, serve whatever we already have rather than erroring.
  return memo ?? (await loadFromDb()) ?? []
}
