import { dbRun } from '../../utils/db'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requireOwnership(event, id)

  await dbRun('DELETE FROM presentations WHERE id = ?', [id])

  return { success: true }
})
