import { listUsersWithStats } from '../../utils/users'
import { requireAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return listUsersWithStats()
})
