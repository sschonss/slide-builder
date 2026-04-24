import { getDb } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { v4 as uuid } from 'uuid'

const DEFAULT_DATA: Record<string, object> = {
  cover: { title: '', subtitle: '', author: '' },
  section: { title: '' },
  content: { title: '', bullets: [''], quote: '' },
  diagram: { title: '', diagram_type: 'mermaid', mermaid_code: '' },
  code: { title: '', code: '', language: 'typescript' },
  comparison: { title: '', left_title: '', left_items: [''], right_title: '', right_items: [''], style: 'columns' },
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()

  const last = db.prepare(
    'SELECT MAX("order") as max_order FROM slides WHERE presentation_id = ?'
  ).get(body.presentation_id) as any
  const order = (last?.max_order ?? -1) + 1

  const id = uuid()
  const template = body.template || 'content'
  const data = body.data || DEFAULT_DATA[template] || {}

  db.prepare(
    'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, body.presentation_id, order, template, JSON.stringify(data), body.notes || null)

  db.prepare("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?").run(body.presentation_id)
  saveBackup(body.presentation_id)

  const { logChange } = await import('../../utils/changelog')
  logChange(body.presentation_id, 'add', `Adicionou slide ${order + 1} (${template})`)

  return { id, presentation_id: body.presentation_id, order, template, data, notes: body.notes || null }
})
