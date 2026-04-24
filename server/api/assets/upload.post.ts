import { dbRun } from '../../utils/db'
import { requireAuth } from '../../utils/ownership'
import { v4 as uuid } from 'uuid'
import { writeFileSync, mkdirSync } from 'fs'
import { join, extname } from 'path'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = form.find(f => f.name === 'file')
  const presentationId = form.find(f => f.name === 'presentation_id')?.data?.toString()
  const fileType = form.find(f => f.name === 'type')?.data?.toString() || 'image'

  if (!file || !file.data || !presentationId) {
    throw createError({ statusCode: 400, message: 'file and presentation_id required' })
  }

  const id = uuid()
  const ext = extname(file.filename || '.png')
  const filename = `${id}${ext}`
  const dir = join(process.cwd(), 'data', 'assets', presentationId)
  mkdirSync(dir, { recursive: true })

  const filePath = join(dir, filename)
  writeFileSync(filePath, file.data)

  const relativePath = `data/assets/${presentationId}/${filename}`

  await dbRun(
    'INSERT INTO assets (id, presentation_id, filename, path, type) VALUES (?, ?, ?, ?, ?)',
    [id, presentationId, file.filename || filename, relativePath, fileType]
  )

  return { id, filename: file.filename, path: relativePath, type: fileType }
})
