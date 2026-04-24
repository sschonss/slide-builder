import { getDb } from '../../utils/db'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (body.format !== 'slidebuilder' || !body.version) {
    throw createError({ statusCode: 400, message: 'Formato inválido. Selecione um arquivo .slidebuilder' })
  }

  const db = getDb()
  const now = new Date().toISOString()

  // Create or reuse theme
  let themeId: string
  if (body.theme) {
    const existing = db.prepare('SELECT id FROM themes WHERE name = ?').get(body.theme.name || 'Imported Theme') as any
    if (existing) {
      themeId = existing.id
    } else {
      themeId = uuid()
      db.prepare('INSERT INTO themes (id, name, config) VALUES (?, ?, ?)').run(
        themeId, body.theme.name || 'Imported Theme', JSON.stringify(body.theme.config)
      )
    }
  } else {
    const fallback = db.prepare('SELECT id FROM themes LIMIT 1').get() as any
    if (!fallback) throw createError({ statusCode: 500, message: 'No theme available' })
    themeId = fallback.id
  }

  // Create presentation
  const presentationId = uuid()
  const title = body.presentation?.title || 'Imported Presentation'
  db.prepare(
    'INSERT INTO presentations (id, title, theme_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(presentationId, title, themeId, now, now)

  // Create slides
  const slides = body.slides || []
  const insertSlide = db.prepare(
    'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
  )

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i]
    insertSlide.run(
      uuid(),
      presentationId,
      s.order ?? i,
      s.template || 'content',
      JSON.stringify(s.data || {}),
      s.notes || null
    )
  }

  return {
    success: true,
    id: presentationId,
    title,
    slide_count: slides.length,
  }
})
