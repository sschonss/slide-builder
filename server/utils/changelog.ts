import { getDb } from './db'
import { createHash } from 'crypto'

type ChangeAction = 'add' | 'edit' | 'delete' | 'reorder'

const MAX_LOG_ENTRIES = 50

export function logChange(presentationId: string, action: ChangeAction, description: string) {
  try {
    const db = getDb()

    // Generate a short hash from timestamp + action (git-style)
    const hash = createHash('sha1')
      .update(`${Date.now()}-${action}-${description}`)
      .digest('hex')
      .substring(0, 7)

    db.prepare(
      'INSERT INTO change_log (presentation_id, action, description, slide_hash) VALUES (?, ?, ?, ?)'
    ).run(presentationId, action, description, hash)

    // Keep only last N entries per presentation
    db.prepare(`
      DELETE FROM change_log WHERE presentation_id = ? AND id NOT IN (
        SELECT id FROM change_log WHERE presentation_id = ? ORDER BY id DESC LIMIT ?
      )
    `).run(presentationId, presentationId, MAX_LOG_ENTRIES)
  } catch {
    // Change log failure should never break the main operation
  }
}
