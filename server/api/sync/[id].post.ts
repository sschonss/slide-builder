import { dbRun } from '~/server/utils/db'
import { requireOwnership } from '~/server/utils/ownership'

export default defineEventHandler(async (event) => {
  const presentationId = getRouterParam(event, 'id')
  if (!presentationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing presentation ID' })
  }

  await requireOwnership(event, presentationId)

  const body = await readBody(event)
  const slideIndex = typeof body?.slideIndex === 'number' ? body.slideIndex : null
  const zoomLevel = typeof body?.zoomLevel === 'number' ? body.zoomLevel : null

  if (slideIndex === null && zoomLevel === null) {
    throw createError({ statusCode: 400, statusMessage: 'Must provide slideIndex or zoomLevel' })
  }

  if (slideIndex !== null) {
    await dbRun(
      `INSERT INTO presenter_sync (presentation_id, slide_index, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(presentation_id) DO UPDATE SET slide_index = excluded.slide_index, updated_at = excluded.updated_at`,
      [presentationId, slideIndex]
    )
  }

  if (zoomLevel !== null) {
    await dbRun(
      `INSERT INTO presenter_sync (presentation_id, slide_index, zoom_level, updated_at)
       VALUES (?, 0, ?, datetime('now'))
       ON CONFLICT(presentation_id) DO UPDATE SET zoom_level = excluded.zoom_level, updated_at = excluded.updated_at`,
      [presentationId, zoomLevel]
    )
  }

  return { ok: true }
})
