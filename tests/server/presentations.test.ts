import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createTables, seedDefaultTheme, seedUser, seedPresentation, seedSlide } from '../helpers/db-helpers'

function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables(db)
  return db
}

describe('presentations', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(() => {
    db.close()
  })

  describe('create', () => {
    it('creates a presentation with default theme', () => {
      seedDefaultTheme(db)
      const user = seedUser(db)
      const themeId = (db.prepare('SELECT id FROM themes LIMIT 1').get() as any).id

      db.prepare(
        "INSERT INTO presentations (id, title, theme_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
      ).run('p1', 'My Talk', themeId, user.id)

      const pres = db.prepare('SELECT * FROM presentations WHERE id = ?').get('p1') as any
      expect(pres.title).toBe('My Talk')
      expect(pres.user_id).toBe(user.id)
      expect(pres.visibility).toBe('private')
    })

    it('rejects presentation without valid theme', () => {
      seedUser(db)
      expect(() => {
        db.prepare(
          "INSERT INTO presentations (id, title, theme_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
        ).run('p1', 'Bad', 'nonexistent-theme', 'user-1')
      }).toThrow()
    })
  })

  describe('read', () => {
    it('returns presentation with slide count', () => {
      const pres = seedPresentation(db)
      seedSlide(db, { id: 's1', presentationId: pres.id, order: 0 })
      seedSlide(db, { id: 's2', presentationId: pres.id, order: 1 })

      const row = db.prepare(`
        SELECT p.*, COUNT(s.id) as slide_count
        FROM presentations p
        LEFT JOIN slides s ON s.presentation_id = p.id
        WHERE p.id = ?
        GROUP BY p.id
      `).get(pres.id) as any

      expect(row.slide_count).toBe(2)
      expect(row.title).toBe('Test Presentation')
    })

    it('lists only presentations owned by user', () => {
      seedUser(db, { id: 'user-1', username: 'user1' })
      seedUser(db, { id: 'user-2', username: 'user2' })
      seedPresentation(db, { id: 'p1', userId: 'user-1' })
      seedPresentation(db, { id: 'p2', userId: 'user-2', title: 'Other' })

      const rows = db.prepare(`
        SELECT p.*, COUNT(s.id) as slide_count
        FROM presentations p
        LEFT JOIN slides s ON s.presentation_id = p.id
        WHERE p.user_id = ?
        GROUP BY p.id
      `).all('user-1') as any[]

      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe('p1')
    })
  })

  describe('update', () => {
    it('updates title', () => {
      seedPresentation(db, { id: 'p1' })
      db.prepare("UPDATE presentations SET title = ?, updated_at = datetime('now') WHERE id = ?").run('New Title', 'p1')
      const pres = db.prepare('SELECT title FROM presentations WHERE id = ?').get('p1') as any
      expect(pres.title).toBe('New Title')
    })

    it('updates visibility', () => {
      seedPresentation(db, { id: 'p1' })
      db.prepare('UPDATE presentations SET visibility = ? WHERE id = ?').run('public', 'p1')
      const pres = db.prepare('SELECT visibility FROM presentations WHERE id = ?').get('p1') as any
      expect(pres.visibility).toBe('public')
    })

    it('rejects invalid visibility value', () => {
      seedPresentation(db, { id: 'p1' })
      expect(() => {
        db.prepare('UPDATE presentations SET visibility = ? WHERE id = ?').run('invalid', 'p1')
      }).toThrow()
    })
  })

  describe('delete', () => {
    it('deletes presentation', () => {
      seedPresentation(db, { id: 'p1' })
      db.prepare('DELETE FROM presentations WHERE id = ?').run('p1')
      const pres = db.prepare('SELECT * FROM presentations WHERE id = ?').get('p1')
      expect(pres).toBeUndefined()
    })

    it('cascades delete to slides', () => {
      seedPresentation(db, { id: 'p1' })
      seedSlide(db, { id: 's1', presentationId: 'p1' })
      seedSlide(db, { id: 's2', presentationId: 'p1' })

      db.prepare('DELETE FROM presentations WHERE id = ?').run('p1')
      const slides = db.prepare('SELECT * FROM slides WHERE presentation_id = ?').all('p1')
      expect(slides).toHaveLength(0)
    })

    it('cascades delete to change_log', () => {
      seedPresentation(db, { id: 'p1' })
      db.prepare(
        "INSERT INTO change_log (presentation_id, action, description) VALUES (?, ?, ?)"
      ).run('p1', 'add', 'Added slide')

      db.prepare('DELETE FROM presentations WHERE id = ?').run('p1')
      const logs = db.prepare('SELECT * FROM change_log WHERE presentation_id = ?').all('p1')
      expect(logs).toHaveLength(0)
    })
  })

  describe('visibility', () => {
    it('private presentations are only visible to owner', () => {
      seedPresentation(db, { id: 'p1', userId: 'user-1', visibility: 'private' })

      const asOwner = db.prepare(
        'SELECT * FROM presentations WHERE id = ? AND (visibility = ? OR user_id = ?)'
      ).get('p1', 'public', 'user-1') as any
      expect(asOwner).toBeDefined()

      const asStranger = db.prepare(
        'SELECT * FROM presentations WHERE id = ? AND (visibility = ? OR user_id = ?)'
      ).get('p1', 'public', 'user-2') as any
      expect(asStranger).toBeUndefined()
    })

    it('public presentations are visible to anyone', () => {
      seedPresentation(db, { id: 'p1', userId: 'user-1', visibility: 'public' })

      const asStranger = db.prepare(
        'SELECT * FROM presentations WHERE id = ? AND (visibility = ? OR user_id = ?)'
      ).get('p1', 'public', 'user-2') as any
      expect(asStranger).toBeDefined()
    })
  })
})
