import { dbGet, dbAll, dbRun } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const slide = await dbGet('SELECT presentation_id, "order", template FROM slides WHERE id = ?', [id]) as any
  if (slide) {
    await requireOwnership(event, slide.presentation_id)
  }
  await dbRun('DELETE FROM slides WHERE id = ?', [id])

  if (slide) {
    const remaining = await dbAll(
      'SELECT id FROM slides WHERE presentation_id = ? ORDER BY "order" ASC',
      [slide.presentation_id]
    ) as any[]

    for (let i = 0; i < remaining.length; i++) {
      await dbRun('UPDATE slides SET "order" = ? WHERE id = ?', [i, remaining[i].id])
    }

    await dbRun("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?", [slide.presentation_id])
    await saveBackup(slide.presentation_id)
    await logChange(slide.presentation_id, 'delete', `Removeu slide ${slide.order + 1} (${slide.template})`)
  }

  return { success: true }
})
