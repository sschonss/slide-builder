# Essentials: Tests + Rate Limiting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive API test coverage and rate limiting to protect endpoints from abuse.

**Architecture:** Tests use Vitest with in-memory SQLite (better-sqlite3) via existing helper pattern. Rate limiting uses a Nitro server middleware with in-memory sliding window per IP, with different limits for read vs write endpoints.

**Tech Stack:** Vitest, better-sqlite3, h3/Nitro server middleware

---

## File Structure

```
tests/
├── helpers/
│   └── db-helpers.ts          # MODIFY — add user/presentation/slide seed helpers, update schema for bio/credits
├── server/
│   ├── db.test.ts             # EXISTS — no changes needed
│   ├── markdown.test.ts       # EXISTS — no changes needed
│   ├── presentations.test.ts  # CREATE — presentations API logic tests
│   ├── slides.test.ts         # CREATE — slides API logic tests
│   └── rate-limit.test.ts     # CREATE — rate limiter unit tests
server/
├── middleware/
│   └── rate-limit.ts          # CREATE — Nitro rate limiting middleware
├── utils/
│   └── rate-limiter.ts        # CREATE — sliding window rate limiter (pure logic, testable)
```

---

### Task 1: Update test helpers for full schema

**Files:**
- Modify: `tests/helpers/db-helpers.ts`

- [ ] **Step 1: Write the updated db-helpers.ts**

Replace the full file with the updated schema that includes `users`, `change_log`, `presenter_sync` tables, `user_id`/`visibility` columns on presentations, and the `bio`/`credits` template types. Also add seed helpers for users, presentations, and slides.

```typescript
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
```

- [ ] **Step 2: Run existing tests to verify helpers don't break anything**

Run: `npm test`
Expected: All existing tests in db.test.ts and markdown.test.ts still pass.

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/db-helpers.ts
git commit -m "test: update db helpers with full schema and seed functions"
```

---

### Task 2: Presentations API tests

**Files:**
- Create: `tests/server/presentations.test.ts`

- [ ] **Step 1: Write the presentations tests**

```typescript
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/server/presentations.test.ts
git commit -m "test: add presentations API tests (CRUD, visibility, cascade)"
```

---

### Task 3: Slides API tests

**Files:**
- Create: `tests/server/slides.test.ts`

- [ ] **Step 1: Write the slides tests**

```typescript
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
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/server/slides.test.ts
git commit -m "test: add slides API tests (CRUD, reorder, template validation)"
```

---

### Task 4: Rate limiter pure logic

**Files:**
- Create: `server/utils/rate-limiter.ts`
- Create: `tests/server/rate-limit.test.ts`

- [ ] **Step 1: Write the rate limiter tests**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RateLimiter } from '../../server/utils/rate-limiter'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 3 })
  })

  it('allows requests under the limit', () => {
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 2 })
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 1 })
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 0 })
  })

  it('blocks requests over the limit', () => {
    limiter.check('ip-1')
    limiter.check('ip-1')
    limiter.check('ip-1')
    const result = limiter.check('ip-1')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('tracks IPs independently', () => {
    limiter.check('ip-1')
    limiter.check('ip-1')
    limiter.check('ip-1')

    expect(limiter.check('ip-1').allowed).toBe(false)
    expect(limiter.check('ip-2').allowed).toBe(true)
  })

  it('resets after window expires', () => {
    vi.useFakeTimers()

    limiter.check('ip-1')
    limiter.check('ip-1')
    limiter.check('ip-1')
    expect(limiter.check('ip-1').allowed).toBe(false)

    vi.advanceTimersByTime(61_000)

    expect(limiter.check('ip-1').allowed).toBe(true)

    vi.useRealTimers()
  })

  it('cleans up stale entries', () => {
    vi.useFakeTimers()

    limiter.check('ip-1')
    limiter.check('ip-2')

    vi.advanceTimersByTime(61_000)

    limiter.cleanup()
    // Internal state is clean — new requests work
    expect(limiter.check('ip-1').allowed).toBe(true)
    expect(limiter.check('ip-2').allowed).toBe(true)

    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/server/rate-limit.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the rate limiter implementation**

```typescript
interface RateLimiterOptions {
  windowMs: number
  maxRequests: number
}

interface CheckResult {
  allowed: boolean
  remaining: number
  retryAfterMs?: number
}

interface Entry {
  timestamps: number[]
}

export class RateLimiter {
  private windowMs: number
  private maxRequests: number
  private store = new Map<string, Entry>()

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs
    this.maxRequests = options.maxRequests
  }

  check(key: string): CheckResult {
    const now = Date.now()
    const windowStart = now - this.windowMs

    let entry = this.store.get(key)
    if (!entry) {
      entry = { timestamps: [] }
      this.store.set(key, entry)
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => t > windowStart)

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestInWindow = entry.timestamps[0]
      const retryAfterMs = oldestInWindow + this.windowMs - now
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 0) }
    }

    entry.timestamps.push(now)
    const remaining = this.maxRequests - entry.timestamps.length
    return { allowed: true, remaining }
  }

  cleanup() {
    const now = Date.now()
    const windowStart = now - this.windowMs
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter(t => t > windowStart)
      if (entry.timestamps.length === 0) {
        this.store.delete(key)
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/server/rate-limit.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/rate-limiter.ts tests/server/rate-limit.test.ts
git commit -m "feat: add sliding window rate limiter with tests"
```

---

### Task 5: Rate limiting middleware

**Files:**
- Create: `server/middleware/rate-limit.ts`

- [ ] **Step 1: Write the rate limiting middleware**

```typescript
import { RateLimiter } from '../utils/rate-limiter'

const writeLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 30 })
const readLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 100 })

// Cleanup stale entries every 5 minutes
setInterval(() => {
  writeLimiter.cleanup()
  readLimiter.cleanup()
}, 5 * 60_000)

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const SKIP_PATHS = ['/api/health', '/api/sync/']

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  // Skip rate limiting for non-API routes and health/sync endpoints
  if (!path.startsWith('/api/') || SKIP_PATHS.some(p => path.startsWith(p))) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const method = getMethod(event)
  const isWrite = WRITE_METHODS.has(method)
  const limiter = isWrite ? writeLimiter : readLimiter

  const result = limiter.check(ip)

  setResponseHeader(event, 'X-RateLimit-Remaining', String(result.remaining))

  if (!result.allowed) {
    setResponseHeader(event, 'Retry-After', String(Math.ceil((result.retryAfterMs || 60_000) / 1000)))
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Try again later.',
    })
  }
})
```

- [ ] **Step 2: Verify the middleware loads by running the dev server**

Run: `npx nuxi dev` and hit `curl http://localhost:3000/api/health`
Expected: 200 OK response with `X-RateLimit-Remaining` header present

- [ ] **Step 3: Commit**

```bash
git add server/middleware/rate-limit.ts
git commit -m "feat: add rate limiting middleware (30/min writes, 100/min reads)"
```

---

### Task 6: Run all tests and push

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass (db, markdown, presentations, slides, rate-limit)

- [ ] **Step 2: Final commit and push**

```bash
git push origin master
```
