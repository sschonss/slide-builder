import { dbGet, dbRun, dbBatch } from '../../utils/db'
import { requireAuth } from '../../utils/ownership'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  if (body.format !== 'slidebuilder' || !body.version) {
    throw createError({ statusCode: 400, message: 'Formato inválido. Selecione um arquivo .slidebuilder' })
  }

  const now = new Date().toISOString()

  // Create or reuse theme
  let themeId: string
  if (body.theme) {
    const existing = await dbGet('SELECT id FROM themes WHERE name = ?', [body.theme.name || 'Imported Theme']) as any
    if (existing) {
      themeId = existing.id
    } else {
      themeId = uuid()
      await dbRun('INSERT INTO themes (id, name, config) VALUES (?, ?, ?)', [
        themeId, body.theme.name || 'Imported Theme', JSON.stringify(body.theme.config)
      ])
    }
  } else {
    const fallback = await dbGet('SELECT id FROM themes LIMIT 1') as any
    if (!fallback) throw createError({ statusCode: 500, message: 'No theme available' })
    themeId = fallback.id
  }

  // Create presentation
  const presentationId = uuid()
  const title = body.presentation?.title || 'Imported Presentation'
  await dbRun(
    'INSERT INTO presentations (id, title, theme_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [presentationId, title, themeId, user.id, now, now]
  )

  // Create slides using batch for efficiency
  const slides = body.slides || []
  if (slides.length > 0) {
    const slideStatements = slides.map((s: any, i: number) => ({
      sql: 'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)',
      args: [
        uuid(),
        presentationId,
        s.order ?? i,
        s.template || 'content',
        JSON.stringify(s.data || {}),
        s.notes || null
      ]
    }))
    await dbBatch(slideStatements)
  }

  return {
    success: true,
    id: presentationId,
    title,
    slide_count: slides.length,
  }
})
