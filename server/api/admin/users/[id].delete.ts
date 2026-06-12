import { getUserById, deleteUserById, countAdmins } from '../../../utils/users'
import { requireAdmin } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!

  if (String(id) === String(admin.id)) {
    throw createError({ statusCode: 400, statusMessage: 'Du kannst dich nicht selbst löschen' })
  }

  const target = await getUserById(id)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden' })

  if (target.is_admin && (await countAdmins()) <= 1) {
    throw createError({ statusCode: 400, statusMessage: 'Der letzte Admin kann nicht gelöscht werden' })
  }

  await deleteUserById(id)
  return { ok: true }
})
