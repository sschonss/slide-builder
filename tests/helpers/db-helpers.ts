import type Database from 'better-sqlite3'

export function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      config TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS presentations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      theme_id TEXT NOT NULL REFERENCES themes(id),
      user_id TEXT REFERENCES users(id),
      visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('public', 'private')),
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS slides (
      id TEXT PRIMARY KEY,
      presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL DEFAULT 0,
      template TEXT NOT NULL CHECK(template IN ('cover','section','content','diagram','code','comparison','bio','credits')),
      data TEXT NOT NULL DEFAULT '{}',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('image','video','logo'))
    );

    CREATE TABLE IF NOT EXISTS change_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      slide_hash TEXT,
      snapshot TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS presenter_sync (
      presentation_id TEXT PRIMARY KEY REFERENCES presentations(id) ON DELETE CASCADE,
      slide_index INTEGER NOT NULL DEFAULT 0,
      zoom_level REAL NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

export function seedDefaultTheme(db: Database.Database) {
  const existing = db.prepare('SELECT id FROM themes WHERE name = ?').get('dark')
  if (existing) return

  const { v4: uuid } = require('uuid')
  const config = JSON.stringify({
    colors: {
      background: '#1a1a2e',
      primary: '#e94560',
      secondary: '#533483',
      text: '#ffffff',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
      code: 'JetBrains Mono',
    },
    logo: '',
    codeTheme: 'github-dark',
  })

  db.prepare('INSERT INTO themes (id, name, config) VALUES (?, ?, ?)').run(uuid(), 'dark', config)
}

export function seedUser(db: Database.Database, overrides: Partial<{ id: string; username: string; name: string }> = {}) {
  const id = overrides.id || 'user-1'
  const username = overrides.username || 'testuser'
  const name = overrides.name || 'Test User'
  db.prepare('INSERT OR IGNORE INTO users (id, username, name, avatar_url) VALUES (?, ?, ?, ?)').run(id, username, name, 'https://example.com/avatar.png')
  return { id, username, name }
}

export function seedPresentation(db: Database.Database, overrides: Partial<{ id: string; title: string; userId: string; visibility: string }> = {}) {
  seedDefaultTheme(db)
  const themeId = (db.prepare('SELECT id FROM themes LIMIT 1').get() as any).id
  const userId = overrides.userId || 'user-1'
  seedUser(db, { id: userId })

  const id = overrides.id || 'pres-1'
  const title = overrides.title || 'Test Presentation'
  const visibility = overrides.visibility || 'private'

  db.prepare(
    "INSERT INTO presentations (id, title, theme_id, user_id, visibility, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
  ).run(id, title, themeId, userId, visibility)

  return { id, title, themeId, userId, visibility }
}

export function seedSlide(db: Database.Database, overrides: Partial<{ id: string; presentationId: string; order: number; template: string; data: object; notes: string }> = {}) {
  const id = overrides.id || 'slide-1'
  const presentationId = overrides.presentationId || 'pres-1'
  const order = overrides.order ?? 0
  const template = overrides.template || 'content'
  const data = JSON.stringify(overrides.data || { title: 'Test', bullets: ['A', 'B'] })
  const notes = overrides.notes || null

  db.prepare(
    'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, presentationId, order, template, data, notes)

  return { id, presentationId, order, template, data: overrides.data || { title: 'Test', bullets: ['A', 'B'] }, notes }
}
