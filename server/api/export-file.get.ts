import { createReadStream, existsSync, statSync } from 'fs'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const filePath = query.path as string

  if (!filePath || !filePath.endsWith('.pdf') || !filePath.includes('/output/')) {
    throw createError({ statusCode: 400, message: 'Invalid path' })
  }

  if (!existsSync(filePath)) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  const stat = statSync(filePath)
  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Length', stat.size.toString())

  return sendStream(event, createReadStream(filePath))
})
