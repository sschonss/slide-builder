import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = getDb()

  const fields: string[] = []
  const values: any[] = []

  if (body.template !== undefined) { fields.push('template = ?'); values.push(body.template) }
  if (body.data !== undefined) { fields.push('data = ?'); values.push(JSON.stringify(body.data)) }
  if (body.notes !== undefined) { fields.push('notes = ?'); values.push(body.notes) }

  if (fields.length === 0) return { success: true }

  values.push(id)
  db.prepare(`UPDATE slides SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  const slide = db.prepare('SELECT presentation_id FROM slides WHERE id = ?').get(id) as any
  if (slide) {
    db.prepare("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?").run(slide.presentation_id)
  }

  return { success: true }
})
