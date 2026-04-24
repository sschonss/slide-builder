import { dbGet, dbRun } from '../../utils/db'
import { v4 as uuid } from 'uuid'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.presentation_id || !body.slide_id || !body.svg) {
    throw createError({ statusCode: 400, message: 'presentation_id, slide_id, and svg required' })
  }

  const filename = `excalidraw-${body.slide_id}.svg`
  const dir = join(process.cwd(), 'data', 'assets', body.presentation_id)
  mkdirSync(dir, { recursive: true })

  const filePath = join(dir, filename)
  writeFileSync(filePath, body.svg, 'utf-8')

  const relativePath = `data/assets/${body.presentation_id}/${filename}`

  const existing = await dbGet(
    'SELECT id FROM assets WHERE presentation_id = ? AND filename = ?',
    [body.presentation_id, filename]
  ) as any

  if (existing) {
    await dbRun('UPDATE assets SET path = ? WHERE id = ?', [relativePath, existing.id])
  } else {
    const id = uuid()
    await dbRun(
      'INSERT INTO assets (id, presentation_id, filename, path, type) VALUES (?, ?, ?, ?, ?)',
      [id, body.presentation_id, filename, relativePath, 'image']
    )
  }

  return { path: relativePath, filename }
})
