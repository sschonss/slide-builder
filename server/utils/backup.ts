import { dbGet, dbAll } from './db'

export async function saveBackup(presentationId: string) {
  try {
    const presentation = await dbGet('SELECT * FROM presentations WHERE id = ?', [presentationId])
    if (!presentation) return

    const slides = await dbAll(
      'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC',
      [presentationId]
    )

    const theme = await dbGet('SELECT * FROM themes WHERE id = ?', [(presentation as any).theme_id])

    // Backup data is now captured via change_log snapshots in the database.
    // File-based backups are kept for local dev convenience only.
    try {
      const { join } = await import('path')
      const { writeFileSync, mkdirSync, readdirSync, unlinkSync } = await import('fs')

      const bundle = {
        format: 'slidebuilder',
        version: 1,
        exported_at: new Date().toISOString(),
        presentation: { title: (presentation as any).title },
        theme: theme ? { name: (theme as any).name, config: JSON.parse((theme as any).config) } : null,
        slides: slides.map((s: any) => ({
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

      const MAX_BACKUPS = 3
      const files = readdirSync(backupDir)
        .filter(f => f.endsWith('.slidebuilder'))
        .sort()

      while (files.length > MAX_BACKUPS) {
        unlinkSync(join(backupDir, files.shift()!))
      }
    } catch {
      // File-based backup may fail on serverless — that's OK
    }
  } catch {
    // Backup failure should never break the main operation
  }
}
