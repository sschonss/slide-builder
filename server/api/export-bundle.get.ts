import { dbGet, dbAll } from '../utils/db'
import { requireOwnership } from '../utils/ownership'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = query.id as string
  if (!id) throw createError({ statusCode: 400, message: 'id required' })
  await requireOwnership(event, id)

  const presentation = await dbGet('SELECT * FROM presentations WHERE id = ?', [id]) as any
  if (!presentation) throw createError({ statusCode: 404, message: 'Presentation not found' })

  const slides = await dbAll(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC',
    [id]
  ) as any[]

  const theme = await dbGet('SELECT * FROM themes WHERE id = ?', [presentation.theme_id]) as any

  const bundle = {
    format: 'slidebuilder',
    version: 1,
    exported_at: new Date().toISOString(),
    presentation: {
      title: presentation.title,
    },
    theme: theme ? {
      name: theme.name,
      config: JSON.parse(theme.config),
    } : null,
    slides: slides.map(s => ({
      order: s.order,
      template: s.template,
      data: JSON.parse(s.data),
      notes: s.notes || null,
    })),
  }

  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, 'Content-Disposition',
    `attachment; filename="${presentation.title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.slidebuilder"`)

  return bundle
})
