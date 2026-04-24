import { dbGet, dbRun } from '../../utils/db'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const theme = await dbGet('SELECT id FROM themes LIMIT 1') as any
  if (!theme) throw createError({ statusCode: 500, message: 'No theme available' })

  const id = uuid()
  const now = new Date().toISOString()

  await dbRun(
    'INSERT INTO presentations (id, title, theme_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, body.title || 'Nova Apresentação', body.theme_id || theme.id, now, now]
  )

  // Create a default cover slide
  const slideId = uuid()
  const coverData = JSON.stringify({
    title: body.title || 'Nova Apresentação',
    subtitle: '',
    author: 'Luiz Schons',
  })
  await dbRun(
    'INSERT INTO slides (id, presentation_id, "order", template, data) VALUES (?, ?, 0, \'cover\', ?)',
    [slideId, id, coverData]
  )

  return { id, title: body.title || 'Nova Apresentação', theme_id: body.theme_id || theme.id, created_at: now, updated_at: now }
})
