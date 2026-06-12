import { query } from '../utils/db'

/** Public health check for the container/reverse-proxy. Verifies DB reachability. */
export default defineEventHandler(async (event) => {
  try {
    await query('SELECT 1')
    return { ok: true, db: true }
  } catch {
    setResponseStatus(event, 503)
    return { ok: false, db: false }
  }
})
