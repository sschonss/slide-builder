import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createTables, seedDefaultTheme } from '../helpers/db-helpers'

function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables(db)
  return db
}

describe('database', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(() => {
    db.close()
  })

  it('creates all tables', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[]
    const names = tables.map(t => t.name)
    expect(names).toContain('presentations')
    expect(names).toContain('slides')
    expect(names).toContain('themes')
    expect(names).toContain('assets')
  })

  it('enforces foreign keys on slides', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO slides (id, presentation_id, \"order\", template, data) VALUES ('s1', 'nonexistent', 0, 'cover', '{}')"
      ).run()
    }).toThrow()
  })

  it('seeds default theme', () => {
    seedDefaultTheme(db)
    const theme = db.prepare('SELECT * FROM themes WHERE name = ?').get('dark') as any
    expect(theme).toBeDefined()
    const config = JSON.parse(theme.config)
    expect(config.colors.primary).toBe('#e94560')
  })

  it('cascades delete from presentation to slides', () => {
    seedDefaultTheme(db)
    const theme = db.prepare('SELECT id FROM themes LIMIT 1').get() as any
    db.prepare(
      "INSERT INTO presentations (id, title, theme_id, created_at, updated_at) VALUES ('p1', 'Test', ?, datetime('now'), datetime('now'))"
    ).run(theme.id)
    db.prepare(
      "INSERT INTO slides (id, presentation_id, \"order\", template, data) VALUES ('s1', 'p1', 0, 'cover', '{}')"
    ).run()
    db.prepare("DELETE FROM presentations WHERE id = 'p1'").run()
    const slide = db.prepare("SELECT * FROM slides WHERE id = 's1'").get()
    expect(slide).toBeUndefined()
  })
})
