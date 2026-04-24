import { getDb } from '../../utils/db'
import { rmSync } from 'fs'
import { join } from 'path'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()

  db.prepare('DELETE FROM presentations WHERE id = ?').run(id)

  try {
    rmSync(join(process.cwd(), 'output', id!), { recursive: true, force: true })
  } catch {}

  return { success: true }
})
