import { execSync } from 'child_process'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const outDir = join(process.cwd(), 'output', body.presentation_id)
  const slidesPath = join(outDir, 'slides.md')

  if (!existsSync(slidesPath)) {
    throw createError({ statusCode: 400, message: 'Generate markdown first' })
  }

  try {
    const slidevBin = resolve(process.cwd(), 'node_modules/.bin/slidev')
    execSync(`${slidevBin} export "${slidesPath}" --output "${join(outDir, 'export.pdf')}"`, {
      cwd: process.cwd(),
      timeout: 120000,
    })
    return { success: true, path: join(outDir, 'export.pdf') }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: `Export failed: ${err.message}` })
  }
})
