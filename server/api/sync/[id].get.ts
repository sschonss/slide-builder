import { dbGet } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const presentationId = getRouterParam(event, 'id')
  if (!presentationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing presentation ID' })
  }

  const row = await dbGet<{ slide_index: number; updated_at: string }>(
    'SELECT slide_index, updated_at FROM presenter_sync WHERE presentation_id = ?',
    [presentationId]
  )

  return {
    slideIndex: row?.slide_index ?? 0,
    updatedAt: row?.updated_at ?? null,
  }
})
