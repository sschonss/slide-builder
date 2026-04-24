import { getDb } from '../../utils/db'
import { saveBackup } from '../../utils/backup'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()

  const update = db.prepare('UPDATE slides SET "order" = ? WHERE id = ?')
  const runAll = db.transaction((slides: { id: string; order: number }[]) => {
    for (const s of slides) {
      update.run(s.order, s.id)
    }
  })

  runAll(body.slides)

  // Get presentation_id from first slide to trigger backup
  if (body.slides?.length) {
    const slide = db.prepare('SELECT presentation_id FROM slides WHERE id = ?').get(body.slides[0].id) as any
    if (slide) {
      saveBackup(slide.presentation_id)
      const { logChange } = await import('../../utils/changelog')
      logChange(slide.presentation_id, 'reorder', `Reordenou ${body.slides.length} slides`)
    }
  }

  return { success: true }
})
