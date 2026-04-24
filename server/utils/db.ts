import Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'
import { join } from 'path'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  const dbPath = join(process.cwd(), 'data', 'database.sqlite')
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  return _db
}

export function initDb() {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      config TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS presentations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      theme_id TEXT NOT NULL REFERENCES themes(id),
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS slides (
      id TEXT PRIMARY KEY,
      presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL DEFAULT 0,
      template TEXT NOT NULL CHECK(template IN ('cover','section','content','diagram','code','comparison')),
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
  `)

  // Seed default theme
  const existing = db.prepare('SELECT id FROM themes WHERE name = ?').get('dark')
  if (!existing) {
    const config = JSON.stringify({
      colors: { background: '#1a1a2e', primary: '#e94560', secondary: '#533483', text: '#ffffff' },
      fonts: { heading: 'Inter', body: 'Inter', code: 'JetBrains Mono' },
      logo: '',
      codeTheme: 'github-dark',
    })
    db.prepare('INSERT INTO themes (id, name, config) VALUES (?, ?, ?)').run(uuid(), 'dark', config)
  }
}
