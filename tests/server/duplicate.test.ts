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

describe('duplicate slide', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
    seedPresentation(db, { id: 'p1' })
  })

  afterEach(() => {
    db.close()
  })

  it('duplicates a slide with same data and template', () => {
    seedSlide(db, { id: 's1', presentationId: 'p1', order: 0, template: 'content', data: { title: 'Hello', bullets: ['A', 'B'] } })
    const source = db.prepare('SELECT * FROM slides WHERE id = ?').get('s1') as any
    db.prepare(
      'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('s1-copy', source.presentation_id, source.order + 1, source.template, source.data, source.notes)
    const copy = db.prepare('SELECT * FROM slides WHERE id = ?').get('s1-copy') as any
    expect(copy.template).toBe('content')
    expect(JSON.parse(copy.data)).toEqual({ title: 'Hello', bullets: ['A', 'B'] })
    expect(copy.order).toBe(1)
  })

  it('shifts subsequent slides down when duplicating in the middle', () => {
    seedSlide(db, { id: 's1', presentationId: 'p1', order: 0 })
    seedSlide(db, { id: 's2', presentationId: 'p1', order: 1 })
    seedSlide(db, { id: 's3', presentationId: 'p1', order: 2 })
    const source = db.prepare('SELECT * FROM slides WHERE id = ?').get('s1') as any
    const newOrder = source.order + 1
    db.prepare('UPDATE slides SET "order" = "order" + 1 WHERE presentation_id = ? AND "order" >= ?').run('p1', newOrder)
    db.prepare('INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)').run('s1-copy', 'p1', newOrder, source.template, source.data, source.notes)
    const slides = db.prepare('SELECT id, "order" FROM slides WHERE presentation_id = ? ORDER BY "order" ASC').all('p1') as any[]
    expect(slides).toEqual([
      { id: 's1', order: 0 },
      { id: 's1-copy', order: 1 },
      { id: 's2', order: 2 },
      { id: 's3', order: 3 },
    ])
  })

  it('duplicates the last slide correctly', () => {
    seedSlide(db, { id: 's1', presentationId: 'p1', order: 0 })
    seedSlide(db, { id: 's2', presentationId: 'p1', order: 1 })
    const source = db.prepare('SELECT * FROM slides WHERE id = ?').get('s2') as any
    const newOrder = source.order + 1
    db.prepare('UPDATE slides SET "order" = "order" + 1 WHERE presentation_id = ? AND "order" >= ?').run('p1', newOrder)
    db.prepare('INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)').run('s2-copy', 'p1', newOrder, source.template, source.data, source.notes)
    const slides = db.prepare('SELECT id, "order" FROM slides WHERE presentation_id = ? ORDER BY "order" ASC').all('p1') as any[]
    expect(slides).toEqual([
      { id: 's1', order: 0 },
      { id: 's2', order: 1 },
      { id: 's2-copy', order: 2 },
    ])
  })

  it('preserves notes during duplication', () => {
    seedSlide(db, { id: 's1', presentationId: 'p1', order: 0, notes: 'Important speaker notes' })
    const source = db.prepare('SELECT * FROM slides WHERE id = ?').get('s1') as any
    db.prepare('INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)').run('s1-copy', source.presentation_id, source.order + 1, source.template, source.data, source.notes)
    const copy = db.prepare('SELECT notes FROM slides WHERE id = ?').get('s1-copy') as any
    expect(copy.notes).toBe('Important speaker notes')
  })
})
