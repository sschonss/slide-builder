import { dbGet, dbAll, dbBatch } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const session = await getUserSession(event)

  // Single batch: presentation + slides + theme in one round-trip
  const results = await dbBatch([
    { sql: 'SELECT * FROM presentations WHERE id = ?', args: [id] },
    { sql: 'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC', args: [id] },
  ])

  const presentation = results[0].rows[0] as any
  if (!presentation) throw createError({ statusCode: 404, message: 'Presentation not found' })

  const isOwner = session?.user?.id && session.user.id === presentation.user_id
  if (presentation.visibility === 'private' && !isOwner) {
    throw createError({ statusCode: 404, message: 'Presentation not found' })
  }

  const slides = results[1].rows as any[]

  // Theme needs presentation.theme_id, so separate query
  const theme = await dbGet('SELECT * FROM themes WHERE id = ?', [presentation.theme_id]) as any

  return {
    ...presentation,
    isOwner: !!isOwner,
    slides: slides.map(s => ({ ...s, data: JSON.parse(s.data) })),
    theme: theme ? { ...theme, config: JSON.parse(theme.config) } : null,
  }
})
