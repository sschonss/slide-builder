import { dbGet, dbBatch, dbRun } from '../../../utils/db'
import { logChange } from '../../../utils/changelog'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const presentationId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { hash } = body

  if (!hash) {
    throw createError({ statusCode: 400, message: 'Hash é obrigatório' })
  }

  const entry = await dbGet(
    'SELECT * FROM change_log WHERE presentation_id = ? AND slide_hash = ?',
    [presentationId, hash]
  ) as any

  if (!entry || !entry.snapshot) {
    throw createError({ statusCode: 404, message: 'Snapshot não encontrado para este hash' })
  }

  const snapshot = JSON.parse(entry.snapshot)

  // Prepare batch statements for transaction
  const statements = [
    // Delete all current slides
    { sql: 'DELETE FROM slides WHERE presentation_id = ?', args: [presentationId] },
    
    // Recreate slides from snapshot
    ...snapshot.slides.map((s: any) => ({
      sql: 'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)',
      args: [uuid(), presentationId, s.order, s.template, JSON.stringify(s.data), s.notes || null]
    })),
    
    // Update presentation title if changed
    ...(snapshot.presentation?.title ? [{
      sql: "UPDATE presentations SET title = ?, updated_at = datetime('now') WHERE id = ?",
      args: [snapshot.presentation.title, presentationId]
    }] : [])
  ]

  await dbBatch(statements)

  await logChange(presentationId!, 'revert', `Reverteu para ${hash}`)

  return {
    success: true,
    hash,
    slides_restored: snapshot.slides.length,
  }
})
