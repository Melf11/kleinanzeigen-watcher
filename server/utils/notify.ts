import type { UserRow } from './users'
import type { SearchRow } from './searches'

export interface RunSummary {
  matched: number
  newCount: number
  removedCount: number
  priceMin: number | null
  priceMax: number | null
  priceMedian: number | null
  newAds: { title: string; price: number | null; url: string | null }[]
  priceDrops: { title: string; oldPrice: number | null; newPrice: number | null; url: string | null }[]
}

const euro = (v: number | null | undefined) => (v == null ? 'VB' : `${v} €`)

/** Plain-text summary that renders fine in both Telegram and WhatsApp. */
export function buildSummaryText(search: SearchRow, s: RunSummary): string {
  const lines: string[] = []
  lines.push(`🔎 ${search.name}`)
  lines.push(`Treffer: ${s.matched} · neu: ${s.newCount} · entfernt: ${s.removedCount}`)
  if (s.priceMedian != null) {
    lines.push(`Preise: Median ${euro(s.priceMedian)} (min ${euro(s.priceMin)} / max ${euro(s.priceMax)})`)
  }

  if (s.newAds.length) {
    lines.push('')
    lines.push('🆕 Neue Anzeigen:')
    for (const ad of s.newAds.slice(0, 5)) {
      lines.push(`• ${ad.title} – ${euro(ad.price)}`)
      if (ad.url) lines.push(`  ${ad.url}`)
    }
    if (s.newAds.length > 5) lines.push(`… und ${s.newAds.length - 5} weitere`)
  }

  if (s.priceDrops.length) {
    lines.push('')
    lines.push('💸 Preissenkungen:')
    for (const ad of s.priceDrops.slice(0, 5)) {
      lines.push(`• ${ad.title}: ${euro(ad.oldPrice)} → ${euro(ad.newPrice)}`)
      if (ad.url) lines.push(`  ${ad.url}`)
    }
    if (s.priceDrops.length > 5) lines.push(`… und ${s.priceDrops.length - 5} weitere`)
  }

  if (!s.newAds.length && !s.priceDrops.length) {
    lines.push('')
    lines.push('Keine neuen Anzeigen oder Preisänderungen.')
  }

  return lines.join('\n')
}

export async function sendTelegram(botToken: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Telegram ${res.status}: ${body.slice(0, 200)}`)
  }
}

export async function sendWhatsApp(phone: string, apikey: string, text: string): Promise<void> {
  // CallMeBot WhatsApp API (free, personal use).
  const url = new URL('https://api.callmebot.com/whatsapp.php')
  url.searchParams.set('phone', phone)
  url.searchParams.set('text', text)
  url.searchParams.set('apikey', apikey)
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`WhatsApp ${res.status}: ${body.slice(0, 200)}`)
  }
}

export function hasTelegram(user: Pick<UserRow, 'tg_bot_token' | 'tg_chat_id'>): boolean {
  return !!(user.tg_bot_token && user.tg_chat_id)
}
export function hasWhatsApp(user: Pick<UserRow, 'wa_phone' | 'wa_apikey'>): boolean {
  return !!(user.wa_phone && user.wa_apikey)
}

/** Dispatch the summary to the channels selected on the search. Never throws. */
export async function notifyForRun(user: UserRow, search: SearchRow, summary: RunSummary): Promise<void> {
  const mode = search.notify || 'off'
  if (mode === 'off') return

  const text = buildSummaryText(search, summary)
  const wantTg = mode === 'telegram' || mode === 'both'
  const wantWa = mode === 'whatsapp' || mode === 'both'
  const jobs: Promise<void>[] = []

  if (wantTg && hasTelegram(user)) {
    jobs.push(
      sendTelegram(user.tg_bot_token!, user.tg_chat_id!, text).catch((e) =>
        console.error(`[notify] telegram failed for search #${search.id}`, e),
      ),
    )
  }
  if (wantWa && hasWhatsApp(user)) {
    jobs.push(
      sendWhatsApp(user.wa_phone!, user.wa_apikey!, text).catch((e) =>
        console.error(`[notify] whatsapp failed for search #${search.id}`, e),
      ),
    )
  }
  await Promise.all(jobs)
}
