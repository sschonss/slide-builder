import { getDb } from './db'
import { createHash } from 'crypto'

type ChangeAction = 'add' | 'edit' | 'delete' | 'reorder' | 'revert'

function captureSnapshot(presentationId: string): string | null {
  try {
    const db = getDb()
    const presentation = db.prepare('SELECT * FROM presentations WHERE id = ?').get(presentationId) as any
    if (!presentation) return null

    const slides = db.prepare(
      'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
    ).all(presentationId) as any[]

    const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(presentation.theme_id) as any

    return JSON.stringify({
      presentation: { title: presentation.title },
      theme: theme ? { name: theme.name, config: JSON.parse(theme.config) } : null,
      slides: slides.map(s => ({
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

export function logChange(presentationId: string, action: ChangeAction, description: string) {
  try {
    const db = getDb()

    const hash = createHash('sha1')
      .update(`${Date.now()}-${action}-${description}`)
      .digest('hex')
      .substring(0, 7)

    const snapshot = captureSnapshot(presentationId)

    db.prepare(
      'INSERT INTO change_log (presentation_id, action, description, slide_hash, snapshot) VALUES (?, ?, ?, ?, ?)'
    ).run(presentationId, action, description, hash, snapshot)
  } catch {
    // Change log failure should never break the main operation
  }
}
