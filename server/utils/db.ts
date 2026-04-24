import { createClient, type Client } from '@libsql/client'
import { v4 as uuid } from 'uuid'

let _client: Client | null = null

export function getClient(): Client {
  if (_client) return _client
  const config = useRuntimeConfig()
  _client = createClient({
    url: config.tursoUrl || 'file:data/database.sqlite',
    authToken: config.tursoToken || undefined,
  })
  return _client
}

export async function initDb() {
  const client = getClient()

  await client.executeMultiple(`
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

    CREATE TABLE IF NOT EXISTS change_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      slide_hash TEXT,
      snapshot TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Seed default theme
  const existing = await dbGet('SELECT id FROM themes WHERE name = ?', ['dark'])
  if (!existing) {
    const config = JSON.stringify({
      colors: { background: '#1a1a2e', primary: '#e94560', secondary: '#533483', text: '#ffffff' },
      fonts: { heading: 'Inter', body: 'Inter', code: 'JetBrains Mono' },
      logo: '',
      codeTheme: 'github-dark',
    })
    await dbRun('INSERT INTO themes (id, name, config) VALUES (?, ?, ?)', [uuid(), 'dark', config])
  }
}

export async function dbRun(sql: string, args: any[] = []) {
  const client = getClient()
  return client.execute({ sql, args })
}

export async function dbGet<T = any>(sql: string, args: any[] = []): Promise<T | null> {
  const client = getClient()
  const result = await client.execute({ sql, args })
  return (result.rows[0] as T) ?? null
}

export async function dbAll<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const client = getClient()
  const result = await client.execute({ sql, args })
  return result.rows as T[]
}

export async function dbBatch(statements: { sql: string; args?: any[] }[]) {
  const client = getClient()
  return client.batch(
    statements.map(s => ({ sql: s.sql, args: s.args || [] })),
    'write'
  )
}
