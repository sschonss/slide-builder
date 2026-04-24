import { getDb } from '../../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()

  const changes = db.prepare(`
    SELECT action, description, slide_hash, created_at
    FROM change_log
    WHERE presentation_id = ?
    ORDER BY id DESC
    LIMIT 10
  `).all(id)

  return changes
})
