import { getDb } from '../../utils/db'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()

  const theme = db.prepare('SELECT id FROM themes LIMIT 1').get() as any
  if (!theme) throw createError({ statusCode: 500, message: 'No theme available' })

  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO presentations (id, title, theme_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, body.title || 'Nova Apresentação', body.theme_id || theme.id, now, now)

  // Create a default cover slide
  const slideId = uuid()
  const coverData = JSON.stringify({
    title: body.title || 'Nova Apresentação',
    subtitle: '',
    author: 'Luiz Schons',
  })
  db.prepare(
    'INSERT INTO slides (id, presentation_id, "order", template, data) VALUES (?, ?, 0, \'cover\', ?)'
  ).run(slideId, id, coverData)

  return { id, title: body.title || 'Nova Apresentação', theme_id: body.theme_id || theme.id, created_at: now, updated_at: now }
})
