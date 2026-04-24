import { dbAll } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const changes = await dbAll(`
    SELECT action, description, slide_hash, created_at,
           CASE WHEN snapshot IS NOT NULL THEN 1 ELSE 0 END as has_snapshot
    FROM change_log
    WHERE presentation_id = ?
    ORDER BY id DESC
  `, [id])

  return changes
})
