import { dbGet, dbRun } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'
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

  const last = await dbGet(
    'SELECT MAX("order") as max_order FROM slides WHERE presentation_id = ?',
    [body.presentation_id]
  ) as any
  const order = (last?.max_order ?? -1) + 1

  const id = uuid()
  const template = body.template || 'content'
  const data = body.data || DEFAULT_DATA[template] || {}

  await dbRun(
    'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [id, body.presentation_id, order, template, JSON.stringify(data), body.notes || null]
  )

  await dbRun("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?", [body.presentation_id])
  await saveBackup(body.presentation_id)

  await logChange(body.presentation_id, 'add', `Adicionou slide ${order + 1} (${template})`)

  return { id, presentation_id: body.presentation_id, order, template, data, notes: body.notes || null }
})
