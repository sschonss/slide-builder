import { join } from 'path'
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { getDb } from './db'

const MAX_BACKUPS = 3

export function saveBackup(presentationId: string) {
  try {
    const db = getDb()
    const presentation = db.prepare('SELECT * FROM presentations WHERE id = ?').get(presentationId) as any
    if (!presentation) return

    const slides = db.prepare(
      'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
    ).all(presentationId) as any[]

    const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(presentation.theme_id) as any

    const bundle = {
      format: 'slidebuilder',
      version: 1,
      exported_at: new Date().toISOString(),
      presentation: { title: presentation.title },
      theme: theme ? { name: theme.name, config: JSON.parse(theme.config) } : null,
      slides: slides.map(s => ({
        order: s.order,
        template: s.template,
        data: JSON.parse(s.data),
        notes: s.notes || null,
      })),
    }

    const backupDir = join(process.cwd(), 'backups', presentationId)
    mkdirSync(backupDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${timestamp}.slidebuilder`
    writeFileSync(join(backupDir, filename), JSON.stringify(bundle))

    // Keep only last N backups
    const files = readdirSync(backupDir)
      .filter(f => f.endsWith('.slidebuilder'))
      .sort()

    while (files.length > MAX_BACKUPS) {
      unlinkSync(join(backupDir, files.shift()!))
    }
  } catch {
    // Backup failure should never break the main operation
  }
}
