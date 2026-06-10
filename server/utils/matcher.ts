import type { KlazAd } from './klaz'

export type IncludeMode = 'all' | 'any'

/** Parse a comma/newline/space separated keyword string into a clean list. */
export function parseKeywords(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[,\n;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Local keyword filter applied to the API results (no extra credits).
 * - include (mode 'all'): every keyword must appear in title+description
 * - include (mode 'any'): at least one keyword must appear
 * - exclude: ad is dropped if any exclude keyword appears
 */
export function matchAd(
  ad: KlazAd,
  opts: { include: string[]; includeMode: IncludeMode; exclude: string[] },
): boolean {
  const haystack = `${ad.title ?? ''} ${ad.description ?? ''}`.toLowerCase()

  if (opts.exclude.length && opts.exclude.some((kw) => haystack.includes(kw))) {
    return false
  }

  if (opts.include.length) {
    if (opts.includeMode === 'any') {
      return opts.include.some((kw) => haystack.includes(kw))
    }
    return opts.include.every((kw) => haystack.includes(kw))
  }

  return true
}

export function filterAds(
  ads: KlazAd[],
  opts: { include: string[]; includeMode: IncludeMode; exclude: string[] },
): KlazAd[] {
  return ads.filter((ad) => matchAd(ad, opts))
}
