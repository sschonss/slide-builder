import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = getDb()

  const fields: string[] = []
  const values: any[] = []

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title) }
  if (body.theme_id !== undefined) { fields.push('theme_id = ?'); values.push(body.theme_id) }

  fields.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE presentations SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  return { success: true }
})
