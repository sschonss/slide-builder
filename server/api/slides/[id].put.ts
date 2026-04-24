import { getDb } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'

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

  const slide = db.prepare('SELECT presentation_id, "order", template FROM slides WHERE id = ?').get(id) as any
  if (slide) {
    db.prepare("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?").run(slide.presentation_id)
    saveBackup(slide.presentation_id)

    const changed = Object.keys(body).filter(k => k !== 'template' || body.template !== slide.template)
    const detail = changed.includes('notes') ? 'notas' : 'conteúdo'
    logChange(slide.presentation_id, 'edit', `Editou ${detail} do slide ${slide.order + 1} (${slide.template})`)
  }

  return { success: true }
})
