import { getDb } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()

  const presentation = db.prepare('SELECT * FROM presentations WHERE id = ?').get(id) as any
  if (!presentation) throw createError({ statusCode: 404, message: 'Presentation not found' })

  const slides = db.prepare(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
  ).all(id) as any[]

  const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(presentation.theme_id) as any

  return {
    ...presentation,
    slides: slides.map(s => ({ ...s, data: JSON.parse(s.data) })),
    theme: theme ? { ...theme, config: JSON.parse(theme.config) } : null,
  }
})
