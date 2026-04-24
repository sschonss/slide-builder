import { initDb } from '../utils/db'

export default defineNitroPlugin(async () => {
  await initDb()
  console.log('[slide-builder] Database initialized')
})
