import {
  getUserById,
  setUserAdmin,
  setUserEmailVerifiedFlag,
  setUserPassword,
  countAdmins,
} from '../../../utils/users'
import { requireAdmin } from '../../../utils/session'
import { validatePassword } from '../../../utils/validators'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ isAdmin?: boolean; emailVerified?: boolean; password?: string }>(event)

  const target = await getUserById(id)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden' })

  if (typeof body?.isAdmin === 'boolean') {
    // Don't allow removing the last admin.
    if (body.isAdmin === false && target.is_admin && (await countAdmins()) <= 1) {
      throw createError({ statusCode: 400, statusMessage: 'Der letzte Admin kann nicht entzogen werden' })
    }
    await setUserAdmin(id, body.isAdmin)
  }

  if (typeof body?.emailVerified === 'boolean') {
    await setUserEmailVerifiedFlag(id, body.emailVerified)
  }

  if (body?.password) {
    const pwErr = validatePassword(body.password)
    if (pwErr) throw createError({ statusCode: 400, statusMessage: pwErr })
    await setUserPassword(id, body.password)
  }

  return { ok: true }
})
