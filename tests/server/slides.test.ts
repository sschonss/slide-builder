import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createTables, seedPresentation, seedSlide } from '../helpers/db-helpers'

function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables(db)
  return db
}

describe('slides', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
    seedPresentation(db, { id: 'p1' })
  })

  afterEach(() => {
    db.close()
  })

  describe('create', () => {
    it('creates a slide with correct order', () => {
      seedSlide(db, { id: 's1', presentationId: 'p1', order: 0 })

      const last = db.prepare('SELECT MAX("order") as max_order FROM slides WHERE presentation_id = ?').get('p1') as any
      const nextOrder = (last?.max_order ?? -1) + 1

      db.prepare(
        'INSERT INTO slides (id, presentation_id, "order", template, data) VALUES (?, ?, ?, ?, ?)'
      ).run('s2', 'p1', nextOrder, 'content', '{"title":"New"}')

      const slide = db.prepare('SELECT * FROM slides WHERE id = ?').get('s2') as any
      expect(slide.order).toBe(1)
      expect(slide.template).toBe('content')
    })

    it('validates template type', () => {
      expect(() => {
        db.prepare(
          'INSERT INTO slides (id, presentation_id, "order", template, data) VALUES (?, ?, ?, ?, ?)'
        ).run('s1', 'p1', 0, 'invalid_template', '{}')
      }).toThrow()
    })

    it('supports all 8 template types', () => {
      const templates = ['cover', 'section', 'content', 'diagram', 'code', 'comparison', 'bio', 'credits']
      templates.forEach((template, i) => {
        db.prepare(
          'INSERT INTO slides (id, presentation_id, "order", template, data) VALUES (?, ?, ?, ?, ?)'
        ).run(`s-${template}`, 'p1', i, template, '{}')
      })

      const slides = db.prepare('SELECT template FROM slides WHERE presentation_id = ? ORDER BY "order"').all('p1') as any[]
      expect(slides.map(s => s.template)).toEqual(templates)
    })

    it('rejects slides for nonexistent presentation', () => {
      expect(() => {
        db.prepare(
          'INSERT INTO slides (id, presentation_id, "order", template, data) VALUES (?, ?, ?, ?, ?)'
        ).run('s1', 'nonexistent', 0, 'cover', '{}')
      }).toThrow()
    })
  })

  describe('update', () => {
    it('updates slide data', () => {
      seedSlide(db, { id: 's1', presentationId: 'p1' })
      const newData = JSON.stringify({ title: 'Updated', bullets: ['X'] })
      db.prepare('UPDATE slides SET data = ? WHERE id = ?').run(newData, 's1')

      const slide = db.prepare('SELECT data FROM slides WHERE id = ?').get('s1') as any
      expect(JSON.parse(slide.data).title).toBe('Updated')
    })

    it('updates slide notes', () => {
      seedSlide(db, { id: 's1', presentationId: 'p1' })
      db.prepare('UPDATE slides SET notes = ? WHERE id = ?').run('Speaker notes here', 's1')

      const slide = db.prepare('SELECT notes FROM slides WHERE id = ?').get('s1') as any
      expect(slide.notes).toBe('Speaker notes here')
    })

    it('changes template type', () => {
      seedSlide(db, { id: 's1', presentationId: 'p1', template: 'content' })
      db.prepare('UPDATE slides SET template = ? WHERE id = ?').run('code', 's1')

      const slide = db.prepare('SELECT template FROM slides WHERE id = ?').get('s1') as any
      expect(slide.template).toBe('code')
    })
  })

  describe('delete', () => {
    it('deletes a slide', () => {
      seedSlide(db, { id: 's1', presentationId: 'p1' })
      db.prepare('DELETE FROM slides WHERE id = ?').run('s1')
      const slide = db.prepare('SELECT * FROM slides WHERE id = ?').get('s1')
      expect(slide).toBeUndefined()
    })
  })

  describe('reorder', () => {
    it('reorders slides correctly', () => {
      seedSlide(db, { id: 's1', presentationId: 'p1', order: 0 })
      seedSlide(db, { id: 's2', presentationId: 'p1', order: 1 })
      seedSlide(db, { id: 's3', presentationId: 'p1', order: 2 })

      const newOrder = [
        { id: 's3', order: 0 },
        { id: 's1', order: 1 },
        { id: 's2', order: 2 },
      ]

      for (const s of newOrder) {
        db.prepare('UPDATE slides SET "order" = ? WHERE id = ?').run(s.order, s.id)
      }

      const slides = db.prepare(
        'SELECT id FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
      ).all('p1') as any[]

      expect(slides.map(s => s.id)).toEqual(['s3', 's1', 's2'])
    })

    it('re-indexes after delete', () => {
      seedSlide(db, { id: 's1', presentationId: 'p1', order: 0 })
      seedSlide(db, { id: 's2', presentationId: 'p1', order: 1 })
      seedSlide(db, { id: 's3', presentationId: 'p1', order: 2 })

      db.prepare('DELETE FROM slides WHERE id = ?').run('s2')

      const remaining = db.prepare(
        'SELECT id FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
      ).all('p1') as any[]

      for (let i = 0; i < remaining.length; i++) {
        db.prepare('UPDATE slides SET "order" = ? WHERE id = ?').run(i, remaining[i].id)
      }

      const slides = db.prepare(
        'SELECT id, "order" FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
      ).all('p1') as any[]

      expect(slides).toEqual([
        { id: 's1', order: 0 },
        { id: 's3', order: 1 },
      ])
    })
  })
})
