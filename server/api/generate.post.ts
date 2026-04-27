import { dbGet, dbAll } from '../utils/db'
import { generateMarkdown } from '../utils/markdown'
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { ThemeConfig } from '../../types'
import { requireOwnership } from '../utils/ownership'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  await requireOwnership(event, body.presentation_id)

  const presentation = await dbGet('SELECT * FROM presentations WHERE id = ?', [body.presentation_id]) as any
  if (!presentation) throw createError({ statusCode: 404, message: 'Presentation not found' })

  const slides = await dbAll(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC',
    [body.presentation_id]
  ) as any[]

  const theme = await dbGet('SELECT * FROM themes WHERE id = ?', [presentation.theme_id]) as any
  const themeConfig: ThemeConfig = theme ? JSON.parse(theme.config) : {
    colors: { background: '#1a1a2e', primary: '#e94560', secondary: '#533483', text: '#ffffff' },
    fonts: { heading: 'Inter', body: 'Inter', code: 'JetBrains Mono' },
    codeTheme: 'github-dark',
  }

  const parsedSlides = slides.map((s: any) => ({ ...s, data: JSON.parse(s.data) }))
  const markdown = generateMarkdown(presentation.title, parsedSlides, themeConfig)

  // Write to output directory (skip on read-only filesystems like Vercel)
  try {
    const outDir = join(process.cwd(), 'output', body.presentation_id)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, 'slides.md'), markdown, 'utf-8')

    // Copy assets
    const assets = await dbAll('SELECT * FROM assets WHERE presentation_id = ?', [body.presentation_id]) as any[]
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
  } catch {}

  return { success: true, markdown }
})
