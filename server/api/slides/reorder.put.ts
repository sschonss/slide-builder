import { dbGet, dbBatch } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  await dbBatch(body.slides.map((s: any) => ({
    sql: 'UPDATE slides SET "order" = ? WHERE id = ?',
    args: [s.order, s.id]
  })))

  // Get presentation_id from first slide to trigger backup
  if (body.slides?.length) {
    const slide = await dbGet('SELECT presentation_id FROM slides WHERE id = ?', [body.slides[0].id]) as any
    if (slide) {
      await saveBackup(slide.presentation_id)
      await logChange(slide.presentation_id, 'reorder', `Reordenou ${body.slides.length} slides`)
    }
  }

  return { success: true }
})
