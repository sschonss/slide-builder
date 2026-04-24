import { dbRun } from '../../utils/db'
import { rmSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  await dbRun('DELETE FROM presentations WHERE id = ?', [id])

  try {
    rmSync(join(process.cwd(), 'output', id!), { recursive: true, force: true })
  } catch {}

  return { success: true }
})
