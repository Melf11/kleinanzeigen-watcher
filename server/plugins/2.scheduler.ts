import { initDatabase } from '../utils/db'
import { dueSearches } from '../utils/searches'
import { runSearch } from '../utils/poll'

const TICK_MS = 60_000
let running = false

async function tick() {
  if (running) return
  running = true
  try {
    await initDatabase()
    const due = await dueSearches()
    for (const search of due) {
      try {
        const result = await runSearch(search.id)
        console.log(
          `[scheduler] ran search #${search.id} "${search.name}" → ${result.status}` +
            ` (matched ${result.matched}, new ${result.newCount}, removed ${result.removedCount})`,
        )
      } catch (err) {
        console.error(`[scheduler] search #${search.id} failed`, err)
      }
    }
  } catch (err) {
    console.error('[scheduler] tick failed', err)
  } finally {
    running = false
  }
}

/**
 * Lightweight in-process scheduler. Every minute it polls any enabled search
 * whose next_run_at is due. Reliable in both `nuxt dev` and the container.
 */
export default defineNitroPlugin(() => {
  // Skip during prerender / build.
  if (import.meta.prerender) return

  setInterval(() => {
    void tick()
  }, TICK_MS)

  // First run shortly after boot so newly-due searches don't wait a full minute.
  setTimeout(() => void tick(), 8_000)

  console.log('[scheduler] started (tick every 60s)')
})
