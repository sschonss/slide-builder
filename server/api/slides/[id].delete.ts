import { getDb } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()

  const slide = db.prepare('SELECT presentation_id FROM slides WHERE id = ?').get(id) as any
  db.prepare('DELETE FROM slides WHERE id = ?').run(id)

  if (slide) {
    const remaining = db.prepare(
      'SELECT id FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
    ).all(slide.presentation_id) as any[]

    const update = db.prepare('UPDATE slides SET "order" = ? WHERE id = ?')
    remaining.forEach((s: any, i: number) => update.run(i, s.id))

    db.prepare("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?").run(slide.presentation_id)
  }

  return { success: true }
})
