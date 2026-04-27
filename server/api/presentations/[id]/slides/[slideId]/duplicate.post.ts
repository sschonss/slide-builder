import { dbGet, dbRun } from '~/server/utils/db'
import { saveBackup } from '~/server/utils/backup'
import { logChange } from '~/server/utils/changelog'
import { requireOwnership } from '~/server/utils/ownership'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const presId = getRouterParam(event, 'id')!
  const slideId = getRouterParam(event, 'slideId')!

  await requireOwnership(event, presId)

  const source = await dbGet(
    'SELECT * FROM slides WHERE id = ? AND presentation_id = ?',
    [slideId, presId]
  ) as any

  if (!source) {
    throw createError({ statusCode: 404, message: 'Slide não encontrado' })
  }

  const newOrder = source.order + 1

  await dbRun(
    'UPDATE slides SET "order" = "order" + 1 WHERE presentation_id = ? AND "order" >= ?',
    [presId, newOrder]
  )

  const newId = uuid()
  await dbRun(
    'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [newId, presId, newOrder, source.template, source.data, source.notes]
  )

  await dbRun("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?", [presId])
  await saveBackup(presId)
  await logChange(presId, 'add', `Duplicou slide ${source.order + 1} (${source.template})`)

  const data = typeof source.data === 'string' ? JSON.parse(source.data) : source.data

  setResponseStatus(event, 201)
  return {
    id: newId,
    presentation_id: presId,
    order: newOrder,
    template: source.template,
    data,
    notes: source.notes || null,
  }
})
