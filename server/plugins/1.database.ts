import { initDatabase } from '../utils/db'

/**
 * Ensure the schema exists and the default user is seeded before the app
 * starts handling requests.
 */
export default defineNitroPlugin(async () => {
  try {
    await initDatabase()
  } catch (err) {
    console.error('[db] initialisation failed', err)
  }
})
