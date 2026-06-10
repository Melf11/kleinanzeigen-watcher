import { query } from '../../utils/db'
import { requireUserId } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)

  // Each search plus its latest successful run snapshot and active ad count.
  return query(
    `SELECT s.id, s.name, s.query, s.enabled, s.interval_minutes, s.max_pages,
            s.last_run_at, s.last_run_status, s.last_error, s.next_run_at,
            r.ads_total, r.price_median, r.price_min, r.price_max, r.run_at AS last_ok_run,
            (SELECT count(*)::int FROM ads a WHERE a.search_id = s.id AND a.status = 'active') AS active_count
       FROM searches s
       LEFT JOIN LATERAL (
         SELECT * FROM search_runs sr
          WHERE sr.search_id = s.id AND sr.status = 'ok'
          ORDER BY sr.run_at DESC LIMIT 1
       ) r ON true
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC`,
    [userId],
  )
})
