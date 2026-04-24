import { createReadStream, existsSync, statSync } from 'fs'
import { resolve, join } from 'path'
import { requireOwnership } from '../utils/ownership'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const presentationId = query.id as string

  if (!presentationId) {
    throw createError({ statusCode: 400, message: 'id required' })
  }

  await requireOwnership(event, presentationId)

  // Construct safe path from presentation ID — never trust user-supplied paths
  const outputBase = resolve(process.cwd(), 'output')
  const filePath = join(outputBase, presentationId, 'export.pdf')
  const resolvedPath = resolve(filePath)

  // Ensure path is within output directory (prevent traversal)
  if (!resolvedPath.startsWith(outputBase)) {
    throw createError({ statusCode: 400, message: 'Invalid path' })
  }

  if (!existsSync(resolvedPath)) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  const stat = statSync(resolvedPath)
  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Length', stat.size.toString())

  return sendStream(event, createReadStream(resolvedPath))
})
