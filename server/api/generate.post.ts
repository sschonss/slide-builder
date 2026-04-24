import { getDb } from '../utils/db'
import { generateMarkdown } from '../utils/markdown'
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { ThemeConfig } from '../../types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()

  const presentation = db.prepare('SELECT * FROM presentations WHERE id = ?').get(body.presentation_id) as any
  if (!presentation) throw createError({ statusCode: 404, message: 'Presentation not found' })

  const slides = db.prepare(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
  ).all(body.presentation_id) as any[]

  const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(presentation.theme_id) as any
  const themeConfig: ThemeConfig = theme ? JSON.parse(theme.config) : {
    colors: { background: '#1a1a2e', primary: '#e94560', secondary: '#533483', text: '#ffffff' },
    fonts: { heading: 'Inter', body: 'Inter', code: 'JetBrains Mono' },
    codeTheme: 'github-dark',
  }

  const parsedSlides = slides.map((s: any) => ({ ...s, data: JSON.parse(s.data) }))
  const markdown = generateMarkdown(presentation.title, parsedSlides, themeConfig)

  // Write to output directory
  const outDir = join(process.cwd(), 'output', body.presentation_id)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'slides.md'), markdown, 'utf-8')

  // Copy assets
  const assets = db.prepare('SELECT * FROM assets WHERE presentation_id = ?').all(body.presentation_id) as any[]
  if (assets.length > 0) {
    const assetsDir = join(outDir, 'assets')
    mkdirSync(assetsDir, { recursive: true })
    for (const asset of assets) {
      const src = join(process.cwd(), asset.path)
      if (existsSync(src)) {
        copyFileSync(src, join(assetsDir, asset.filename))
      }
    }
  }

  return { success: true, path: join(outDir, 'slides.md'), markdown }
})
