import { requireAdmin } from '../../../utils/session'
import { getSmtpStatus } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return getSmtpStatus()
})
