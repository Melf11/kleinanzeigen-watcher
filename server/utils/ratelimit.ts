import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'

// Simple in-memory sliding-window rate limiter (sufficient for a single instance).
const hits = new Map<string, number[]>()

function clientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

/**
 * Throw 429 if more than `max` calls for `action` happened within `windowMs`
 * from the same client IP. Keyed per action so login/register/reset are separate.
 */
export function rateLimit(event: H3Event, action: string, max: number, windowMs: number): void {
  const key = `${action}:${clientIp(event)}`
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (arr.length >= max) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Versuche. Bitte später erneut versuchen.',
    })
  }
  arr.push(now)
  hits.set(key, arr)
}

// Occasionally drop stale keys so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now()
  for (const [key, arr] of hits) {
    const fresh = arr.filter((t) => now - t < 3_600_000)
    if (fresh.length) hits.set(key, fresh)
    else hits.delete(key)
  }
}, 600_000).unref?.()
