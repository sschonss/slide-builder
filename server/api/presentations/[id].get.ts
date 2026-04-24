import { dbGet, dbAll } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const presentation = await dbGet('SELECT * FROM presentations WHERE id = ?', [id]) as any
  if (!presentation) throw createError({ statusCode: 404, message: 'Presentation not found' })

  const slides = await dbAll(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC',
    [id]
  ) as any[]

  const theme = await dbGet('SELECT * FROM themes WHERE id = ?', [presentation.theme_id]) as any

  return {
    ...presentation,
    slides: slides.map(s => ({ ...s, data: JSON.parse(s.data) })),
    theme: theme ? { ...theme, config: JSON.parse(theme.config) } : null,
  }
})
