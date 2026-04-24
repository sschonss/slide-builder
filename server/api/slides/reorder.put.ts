import { dbGet, dbBatch } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.slides?.length) {
    return { success: true }
  }

  // Verify ownership BEFORE making any changes
  const slide = await dbGet('SELECT presentation_id FROM slides WHERE id = ?', [body.slides[0].id]) as any
  if (!slide) throw createError({ statusCode: 404, message: 'Slide not found' })

  await requireOwnership(event, slide.presentation_id)

  await dbBatch(body.slides.map((s: any) => ({
    sql: 'UPDATE slides SET "order" = ? WHERE id = ?',
    args: [s.order, s.id]
  })))

  await saveBackup(slide.presentation_id)
  await logChange(slide.presentation_id, 'reorder', `Reordenou ${body.slides.length} slides`)

  return { success: true }
})
