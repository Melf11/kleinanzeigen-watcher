/**
 * Next-run computation. Two modes:
 *  - no run_time: simply now + interval
 *  - run_time "HH:MM": anchor the schedule to that wall-clock time in `tz`,
 *    stepping by the interval. e.g. interval 1440 + "08:00" → daily at 08:00;
 *    interval 720 + "08:00" → 08:00 and 20:00.
 *
 * DST is handled best-effort via the timezone offset at the target instant.
 */

/** Offset (ms) of `tz` from UTC at the given instant (positive east of UTC). */
function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(date)
  const m: Record<string, string> = {}
  for (const p of parts) m[p.type] = p.value
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second)
  return asUTC - date.getTime()
}

/** The UTC instant whose wall-clock time in `tz` is the given Y-M-D H:M. */
function zonedWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const guessUTC = Date.UTC(year, month - 1, day, hour, minute)
  const offset = tzOffsetMs(tz, new Date(guessUTC))
  return new Date(guessUTC - offset)
}

export function parseRunTime(runTime: string | null | undefined): { h: number; m: number } | null {
  if (!runTime) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(runTime.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

export function computeNextRunAt(
  intervalMinutes: number,
  runTime: string | null | undefined,
  tz: string,
  from: Date = new Date(),
): Date {
  const step = Math.max(1, intervalMinutes) * 60_000
  const parsed = parseRunTime(runTime)
  if (!parsed) {
    return new Date(from.getTime() + step)
  }

  // Wall-clock "today" in tz.
  const wall = new Date(from.getTime() + tzOffsetMs(tz, from))
  let anchor = zonedWallToUtc(
    wall.getUTCFullYear(),
    wall.getUTCMonth() + 1,
    wall.getUTCDate(),
    parsed.h,
    parsed.m,
    tz,
  )

  // Align to the next slot strictly after `from`.
  while (anchor.getTime() > from.getTime()) anchor = new Date(anchor.getTime() - step)
  while (anchor.getTime() <= from.getTime()) anchor = new Date(anchor.getTime() + step)
  return anchor
}
