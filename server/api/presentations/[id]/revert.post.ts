import { getDb } from '../../../utils/db'
import { logChange } from '../../../utils/changelog'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const presentationId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { hash } = body

  if (!hash) {
    throw createError({ statusCode: 400, message: 'Hash é obrigatório' })
  }

  const db = getDb()

  const entry = db.prepare(
    'SELECT * FROM change_log WHERE presentation_id = ? AND slide_hash = ?'
  ).get(presentationId, hash) as any

  if (!entry || !entry.snapshot) {
    throw createError({ statusCode: 404, message: 'Snapshot não encontrado para este hash' })
  }

  const snapshot = JSON.parse(entry.snapshot)

  // Delete all current slides
  db.prepare('DELETE FROM slides WHERE presentation_id = ?').run(presentationId)

  // Recreate slides from snapshot
  const insertSlide = db.prepare(
    'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
  )

  const restoreAll = db.transaction(() => {
    for (const s of snapshot.slides) {
      insertSlide.run(
        uuid(),
        presentationId,
        s.order,
        s.template,
        JSON.stringify(s.data),
        s.notes || null
      )
    }

    // Update presentation title if changed
    if (snapshot.presentation?.title) {
      db.prepare("UPDATE presentations SET title = ?, updated_at = datetime('now') WHERE id = ?")
        .run(snapshot.presentation.title, presentationId)
    }
  })

  restoreAll()

  logChange(presentationId!, 'revert', `Reverteu para ${hash}`)

  return {
    success: true,
    hash,
    slides_restored: snapshot.slides.length,
  }
})
