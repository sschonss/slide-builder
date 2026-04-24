import { dbGet, dbAll, dbRun } from './db'
import { createHash } from 'crypto'

type ChangeAction = 'add' | 'edit' | 'delete' | 'reorder' | 'revert'

async function captureSnapshot(presentationId: string): Promise<string | null> {
  try {
    const presentation = await dbGet('SELECT * FROM presentations WHERE id = ?', [presentationId])
    if (!presentation) return null

    const slides = await dbAll(
      'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC',
      [presentationId]
    )

    const theme = await dbGet('SELECT * FROM themes WHERE id = ?', [(presentation as any).theme_id])

    return JSON.stringify({
      presentation: { title: (presentation as any).title },
      theme: theme ? { name: (theme as any).name, config: JSON.parse((theme as any).config) } : null,
      slides: slides.map((s: any) => ({
        order: s.order,
        template: s.template,
        data: JSON.parse(s.data),
        notes: s.notes || null,
      })),
    })
  } catch {
    return null
  }
}

export async function logChange(presentationId: string, action: ChangeAction, description: string) {
  try {
    const hash = createHash('sha1')
      .update(`${Date.now()}-${action}-${description}`)
      .digest('hex')
      .substring(0, 7)

    const snapshot = await captureSnapshot(presentationId)

    await dbRun(
      'INSERT INTO change_log (presentation_id, action, description, slide_hash, snapshot) VALUES (?, ?, ?, ?, ?)',
      [presentationId, action, description, hash, snapshot]
    )
  } catch {
    // Change log failure should never break the main operation
  }
}
