import { dbGet, dbRun } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const fields: string[] = []
  const values: any[] = []

  if (body.template !== undefined) { fields.push('template = ?'); values.push(body.template) }
  if (body.data !== undefined) { fields.push('data = ?'); values.push(JSON.stringify(body.data)) }
  if (body.notes !== undefined) { fields.push('notes = ?'); values.push(body.notes) }

  if (fields.length === 0) return { success: true }

  values.push(id)
  await dbRun(`UPDATE slides SET ${fields.join(', ')} WHERE id = ?`, values)

  const slide = await dbGet('SELECT presentation_id, "order", template FROM slides WHERE id = ?', [id]) as any
  if (slide) {
    await dbRun("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?", [slide.presentation_id])
    await saveBackup(slide.presentation_id)

    const changed = Object.keys(body).filter(k => k !== 'template' || body.template !== slide.template)
    const detail = changed.includes('notes') ? 'notas' : 'conteúdo'
    await logChange(slide.presentation_id, 'edit', `Editou ${detail} do slide ${slide.order + 1} (${slide.template})`)
  }

  return { success: true }
})
