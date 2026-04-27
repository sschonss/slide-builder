import { createClient as createHttpClient, type Client } from '@libsql/client/http'
import { createClient as createLocalClient } from '@libsql/client'
import { v4 as uuid } from 'uuid'

let _client: Client | null = null
let _dbReady = false
let _initPromise: Promise<void> | null = null

export function getClient(): Client {
  if (_client) return _client

  if (import.meta.dev) {
    _client = createLocalClient({ url: 'file:dev.db' }) as unknown as Client
    return _client
  }

  const config = useRuntimeConfig()
  const url = config.tursoUrl || ''
  if (!url) {
    throw new Error('[slide-builder] NUXT_TURSO_URL is not set')
  }
  const httpUrl = url.replace(/^libsql:\/\//, 'https://')
  _client = createHttpClient({
    url: httpUrl,
    authToken: config.tursoToken || undefined,
  })
  return _client
}

async function ensureDb() {
  if (_dbReady) return
  if (_initPromise) {
    await _initPromise
    return
  }
  _initPromise = _initDbInternal()
  await _initPromise
}

async function _initDbInternal() {
  try {
    const client = getClient()
    console.log('[slide-builder] Running schema migrations...')

    // Match Turso behavior: don't enforce FK constraints
    if (import.meta.dev) {
      await client.execute({ sql: 'PRAGMA foreign_keys = OFF', args: [] })
    }

    await client.batch([
      { sql: `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, avatar_url TEXT NOT NULL DEFAULT '', created_at DATETIME NOT NULL DEFAULT (datetime('now')), updated_at DATETIME NOT NULL DEFAULT (datetime('now')))`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS themes (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, config TEXT NOT NULL DEFAULT '{}')`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS presentations (id TEXT PRIMARY KEY, title TEXT NOT NULL, theme_id TEXT NOT NULL REFERENCES themes(id), created_at DATETIME NOT NULL DEFAULT (datetime('now')), updated_at DATETIME NOT NULL DEFAULT (datetime('now')))`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS slides (id TEXT PRIMARY KEY, presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE, "order" INTEGER NOT NULL DEFAULT 0, template TEXT NOT NULL CHECK(template IN ('cover','section','content','diagram','code','comparison','bio','credits')), data TEXT NOT NULL DEFAULT '{}', notes TEXT)`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE, filename TEXT NOT NULL, path TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('image','video','logo')))`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS change_log (id INTEGER PRIMARY KEY AUTOINCREMENT, presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE, action TEXT NOT NULL, description TEXT NOT NULL, slide_hash TEXT, snapshot TEXT, created_at DATETIME NOT NULL DEFAULT (datetime('now')))`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS presenter_sync (presentation_id TEXT PRIMARY KEY REFERENCES presentations(id) ON DELETE CASCADE, slide_index INTEGER NOT NULL DEFAULT 0, updated_at DATETIME NOT NULL DEFAULT (datetime('now')))`, args: [] },
    ], 'write')

    // ALTER TABLE migrations — safe to fail if columns already exist
    for (const sql of [
      `ALTER TABLE presentations ADD COLUMN user_id TEXT REFERENCES users(id)`,
      `ALTER TABLE presentations ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('public', 'private'))`,
      `ALTER TABLE presenter_sync ADD COLUMN zoom_level REAL NOT NULL DEFAULT 1`,
    ]) {
      try {
        await client.execute({ sql, args: [] })
      } catch {
        // Column already exists — skip
      }
    }

    // Migrate slides table to support bio/credits templates
    try {
      const tableInfo = await client.execute({ sql: `SELECT sql FROM sqlite_master WHERE type='table' AND name='slides'`, args: [] })
      const createSql = tableInfo.rows[0]?.sql as string || ''
      if (createSql.includes("'comparison')") && !createSql.includes("'bio'")) {
        await client.batch([
          { sql: `CREATE TABLE slides_new (id TEXT PRIMARY KEY, presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE, "order" INTEGER NOT NULL DEFAULT 0, template TEXT NOT NULL CHECK(template IN ('cover','section','content','diagram','code','comparison','bio','credits')), data TEXT NOT NULL DEFAULT '{}', notes TEXT)`, args: [] },
          { sql: `INSERT INTO slides_new SELECT * FROM slides`, args: [] },
          { sql: `DROP TABLE slides`, args: [] },
          { sql: `ALTER TABLE slides_new RENAME TO slides`, args: [] },
        ], 'write')
        console.log('[slide-builder] Migrated slides table to support bio/credits templates')
      }
    } catch (e) {
      console.log('[slide-builder] Slides migration check:', e)
    }

    console.log('[slide-builder] Schema ready, seeding default theme...')

    const existing = await client.execute({ sql: 'SELECT id FROM themes WHERE name = ?', args: ['dark'] })
    if (existing.rows.length === 0) {
      const themeConfig = JSON.stringify({
        colors: { background: '#1a1a2e', primary: '#e94560', secondary: '#533483', text: '#ffffff' },
        fonts: { heading: 'Inter', body: 'Inter', code: 'JetBrains Mono' },
        logo: '',
        codeTheme: 'github-dark',
      })
      await client.execute({ sql: 'INSERT INTO themes (id, name, config) VALUES (?, ?, ?)', args: [uuid(), 'dark', themeConfig] })
    }

    _dbReady = true
    console.log('[slide-builder] Database initialized successfully')
  } catch (err) {
    _initPromise = null
    console.error('[slide-builder] Database init failed:', err)
    throw err
  }
}

export async function initDb() {
  await ensureDb()
}

export async function dbRun(sql: string, args: any[] = []) {
  await ensureDb()
  const client = getClient()
  return client.execute({ sql, args })
}

export async function dbGet<T = any>(sql: string, args: any[] = []): Promise<T | null> {
  await ensureDb()
  const client = getClient()
  const result = await client.execute({ sql, args })
  return (result.rows[0] as T) ?? null
}

export async function dbAll<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  await ensureDb()
  const client = getClient()
  const result = await client.execute({ sql, args })
  return result.rows as T[]
}

export async function dbBatch(statements: { sql: string; args?: any[] }[], mode: 'write' | 'read' = 'read') {
  await ensureDb()
  const client = getClient()
  return client.batch(
    statements.map(s => ({ sql: s.sql, args: s.args || [] })),
    mode
  )
}
