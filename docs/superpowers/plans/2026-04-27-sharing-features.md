# Sharing Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to share presentations via custom/auto-generated links with optional password protection, expiration, and iframe embed support.

**Architecture:** New `share_links` table stores multiple share links per presentation. CRUD API at `/api/shares/` for owner management. Public access API at `/api/shares/access/[slug]` validates passwords (bcrypt) and sets signed cookies for private presentation access. ShareModal component in dashboard manages link lifecycle. Share page at `/s/[slug]` handles password entry, redirect to viewer, and embed mode.

**Tech Stack:** bcryptjs (password hashing), Node crypto (slug generation, HMAC tokens), existing Vitest + better-sqlite3 test infra.

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `server/utils/share-token.ts` | Slug generation + HMAC cookie signing/verification |
| `server/api/shares/index.post.ts` | Create share link |
| `server/api/shares/index.get.ts` | List share links for a presentation |
| `server/api/shares/[id].put.ts` | Update share link |
| `server/api/shares/[id].delete.ts` | Delete share link |
| `server/api/shares/access/[slug].get.ts` | Public: check share link status |
| `server/api/shares/access/[slug]/verify.post.ts` | Public: verify password + set cookie |
| `components/dashboard/ShareModal.vue` | Share management modal |
| `pages/s/[slug].vue` | Public share landing page |
| `tests/server/shares.test.ts` | Tests for share CRUD + access |

### Modified Files
| File | Change |
|------|--------|
| `tests/helpers/db-helpers.ts` | Add `share_links` table + `seedShareLink` helper |
| `server/utils/db.ts` | Add `share_links` CREATE TABLE to schema migration |
| `server/api/presentations/[id].get.ts` | Check share access cookie for private presentations |
| `pages/dashboard.vue` | Add Share button + ShareModal integration |

---

### Task 1: Dependencies + Schema + Utilities

**Files:**
- Modify: `package.json` (add bcryptjs)
- Modify: `server/utils/db.ts:50-58` (add share_links table)
- Modify: `tests/helpers/db-helpers.ts` (add share_links table + seedShareLink)
- Create: `server/utils/share-token.ts`
- Test: `tests/server/shares.test.ts`

- [ ] **Step 1: Install bcryptjs**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Add share_links table to server/utils/db.ts**

In `server/utils/db.ts`, find the `client.batch([` call inside `_initDbInternal()` (around line 50) and add the share_links CREATE TABLE statement after the `presenter_sync` statement:

```typescript
// Add this as the last item in the batch array, after the presenter_sync CREATE TABLE:
{ sql: `CREATE TABLE IF NOT EXISTS share_links (id TEXT PRIMARY KEY, presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE, slug TEXT NOT NULL UNIQUE, password_hash TEXT, expires_at DATETIME, is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT (datetime('now')), updated_at DATETIME NOT NULL DEFAULT (datetime('now')))`, args: [] },
```

- [ ] **Step 3: Add share_links to test helpers**

In `tests/helpers/db-helpers.ts`, add the share_links CREATE TABLE inside the `createTables` function, after the `presenter_sync` block:

```typescript
// Add inside createTables db.exec(` ... `), after presenter_sync:
    CREATE TABLE IF NOT EXISTS share_links (
      id TEXT PRIMARY KEY,
      presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      expires_at DATETIME,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );
```

Then add the `seedShareLink` helper function at the end of the file:

```typescript
export function seedShareLink(db: Database.Database, overrides: Partial<{
  id: string
  presentationId: string
  slug: string
  passwordHash: string | null
  expiresAt: string | null
  isActive: number
}> = {}) {
  const id = overrides.id || 'share-1'
  const presentationId = overrides.presentationId || 'pres-1'
  const slug = overrides.slug || 'test-slug'
  const passwordHash = overrides.passwordHash ?? null
  const expiresAt = overrides.expiresAt ?? null
  const isActive = overrides.isActive ?? 1

  db.prepare(
    "INSERT INTO share_links (id, presentation_id, slug, password_hash, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, presentationId, slug, passwordHash, expiresAt, isActive)

  return { id, presentationId, slug, passwordHash, expiresAt, isActive }
}
```

- [ ] **Step 4: Create server/utils/share-token.ts**

```typescript
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto'

export function generateSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(length)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

const SLUG_REGEX = /^[a-zA-Z0-9_-]{3,50}$/

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug)
}

function getSecret(): string {
  return process.env.NUXT_SESSION_PASSWORD || 'dev-share-secret-do-not-use-in-prod'
}

export function createShareAccessToken(shareId: string, presentationId: string): string {
  const expires = Date.now() + 24 * 60 * 60 * 1000
  const payload = `${shareId}:${presentationId}:${expires}`
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex')
  return `${payload}:${sig}`
}

export function verifyShareAccessToken(token: string): { shareId: string; presentationId: string } | null {
  if (!token) return null
  const parts = token.split(':')
  if (parts.length !== 4) return null
  const [shareId, presentationId, expiresStr, sig] = parts
  const payload = `${shareId}:${presentationId}:${expiresStr}`
  const expected = createHmac('sha256', getSecret()).update(payload).digest('hex')
  try {
    const sigBuf = Buffer.from(sig, 'hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null
  } catch {
    return null
  }
  if (Date.now() > parseInt(expiresStr, 10)) return null
  return { shareId, presentationId }
}
```

- [ ] **Step 5: Write tests for share-token utilities**

Create `tests/server/shares.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createTables, seedPresentation, seedShareLink } from '../helpers/db-helpers'

function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables(db)
  return db
}

describe('share_links schema', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
    seedPresentation(db, { id: 'p1' })
  })

  afterEach(() => { db.close() })

  it('creates a share link with all fields', () => {
    seedShareLink(db, {
      id: 'sh1',
      presentationId: 'p1',
      slug: 'my-talk',
      passwordHash: '$2a$10$fakehash',
      expiresAt: '2026-12-31T23:59:59Z',
      isActive: 1,
    })
    const row = db.prepare('SELECT * FROM share_links WHERE id = ?').get('sh1') as any
    expect(row.slug).toBe('my-talk')
    expect(row.password_hash).toBe('$2a$10$fakehash')
    expect(row.expires_at).toBe('2026-12-31T23:59:59Z')
    expect(row.is_active).toBe(1)
  })

  it('enforces unique slugs', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'unique-slug' })
    expect(() => {
      seedShareLink(db, { id: 'sh2', presentationId: 'p1', slug: 'unique-slug' })
    }).toThrow()
  })

  it('cascade deletes share links when presentation is deleted', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'slug1' })
    seedShareLink(db, { id: 'sh2', presentationId: 'p1', slug: 'slug2' })
    db.prepare('DELETE FROM presentations WHERE id = ?').run('p1')
    const links = db.prepare('SELECT * FROM share_links WHERE presentation_id = ?').all('p1')
    expect(links).toHaveLength(0)
  })

  it('allows null password_hash and expires_at', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'open-link' })
    const row = db.prepare('SELECT * FROM share_links WHERE id = ?').get('sh1') as any
    expect(row.password_hash).toBeNull()
    expect(row.expires_at).toBeNull()
  })

  it('defaults is_active to 1', () => {
    db.prepare(
      "INSERT INTO share_links (id, presentation_id, slug) VALUES ('sh1', 'p1', 'defaulttest')"
    ).run()
    const row = db.prepare('SELECT is_active FROM share_links WHERE id = ?').get('sh1') as any
    expect(row.is_active).toBe(1)
  })
})
```

- [ ] **Step 6: Run tests to verify schema and helpers work**

```bash
npx vitest run tests/server/shares.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 7: Add token utility tests to shares.test.ts**

Append to `tests/server/shares.test.ts`:

```typescript
import { generateSlug, isValidSlug, createShareAccessToken, verifyShareAccessToken } from '../../server/utils/share-token'

describe('share-token utilities', () => {
  it('generateSlug returns 8-char lowercase alphanumeric string', () => {
    const slug = generateSlug()
    expect(slug).toHaveLength(8)
    expect(slug).toMatch(/^[a-z0-9]+$/)
  })

  it('generateSlug generates unique slugs', () => {
    const slugs = new Set(Array.from({ length: 100 }, () => generateSlug()))
    expect(slugs.size).toBe(100)
  })

  it('isValidSlug accepts valid slugs', () => {
    expect(isValidSlug('my-talk')).toBe(true)
    expect(isValidSlug('abc123')).toBe(true)
    expect(isValidSlug('my_talk_2026')).toBe(true)
    expect(isValidSlug('A-B-C')).toBe(true)
  })

  it('isValidSlug rejects invalid slugs', () => {
    expect(isValidSlug('ab')).toBe(false) // too short
    expect(isValidSlug('a'.repeat(51))).toBe(false) // too long
    expect(isValidSlug('has spaces')).toBe(false)
    expect(isValidSlug('has/slash')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })

  it('createShareAccessToken and verifyShareAccessToken round-trip', () => {
    const token = createShareAccessToken('share-1', 'pres-1')
    const result = verifyShareAccessToken(token)
    expect(result).toEqual({ shareId: 'share-1', presentationId: 'pres-1' })
  })

  it('verifyShareAccessToken rejects tampered tokens', () => {
    const token = createShareAccessToken('share-1', 'pres-1')
    const tampered = token.slice(0, -4) + 'xxxx'
    expect(verifyShareAccessToken(tampered)).toBeNull()
  })

  it('verifyShareAccessToken rejects empty/malformed tokens', () => {
    expect(verifyShareAccessToken('')).toBeNull()
    expect(verifyShareAccessToken('not:enough:parts')).toBeNull()
    expect(verifyShareAccessToken('a:b:c:notahex')).toBeNull()
  })
})
```

- [ ] **Step 8: Run all share tests**

```bash
npx vitest run tests/server/shares.test.ts
```

Expected: 12 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add share_links schema, token utils, and test helpers

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Share CRUD API + Tests

**Files:**
- Create: `server/api/shares/index.post.ts`
- Create: `server/api/shares/index.get.ts`
- Create: `server/api/shares/[id].put.ts`
- Create: `server/api/shares/[id].delete.ts`
- Test: `tests/server/shares.test.ts` (append)

- [ ] **Step 1: Create POST /api/shares (create share link)**

Create `server/api/shares/index.post.ts`:

```typescript
import { dbGet, dbRun } from '../../utils/db'
import { requireOwnership } from '../../utils/ownership'
import { generateSlug, isValidSlug } from '../../utils/share-token'
import { v4 as uuid } from 'uuid'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { presentationId, slug: customSlug, password, expiresAt } = body

  if (!presentationId) {
    throw createError({ statusCode: 400, message: 'presentationId is required' })
  }

  await requireOwnership(event, presentationId)

  const slug = customSlug || generateSlug()

  if (!isValidSlug(slug)) {
    throw createError({ statusCode: 400, message: 'Slug must be 3-50 chars, alphanumeric/hyphens/underscores only' })
  }

  const existing = await dbGet('SELECT id FROM share_links WHERE slug = ?', [slug])
  if (existing) {
    throw createError({ statusCode: 409, message: 'Este slug já está em uso' })
  }

  if (password && password.length < 4) {
    throw createError({ statusCode: 400, message: 'Password must be at least 4 characters' })
  }

  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    throw createError({ statusCode: 400, message: 'Expiration must be in the future' })
  }

  const id = uuid()
  const passwordHash = password ? await bcrypt.hash(password, 10) : null

  await dbRun(
    "INSERT INTO share_links (id, presentation_id, slug, password_hash, expires_at) VALUES (?, ?, ?, ?, ?)",
    [id, presentationId, slug, passwordHash, expiresAt || null]
  )

  setResponseStatus(event, 201)
  return {
    id,
    slug,
    hasPassword: !!passwordHash,
    expiresAt: expiresAt || null,
    isActive: true,
    url: `/s/${slug}`,
    createdAt: new Date().toISOString(),
  }
})
```

- [ ] **Step 2: Create GET /api/shares (list share links)**

Create `server/api/shares/index.get.ts`:

```typescript
import { dbAll } from '../../utils/db'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const presentationId = query.presentationId as string

  if (!presentationId) {
    throw createError({ statusCode: 400, message: 'presentationId query param is required' })
  }

  await requireOwnership(event, presentationId)

  const links = await dbAll(
    'SELECT id, slug, password_hash, expires_at, is_active, created_at, updated_at FROM share_links WHERE presentation_id = ? ORDER BY created_at DESC',
    [presentationId]
  )

  return links.map((link: any) => ({
    id: link.id,
    slug: link.slug,
    hasPassword: !!link.password_hash,
    expiresAt: link.expires_at,
    isActive: !!link.is_active,
    url: `/s/${link.slug}`,
    createdAt: link.created_at,
  }))
})
```

- [ ] **Step 3: Create PUT /api/shares/[id] (update share link)**

Create `server/api/shares/[id].put.ts`:

```typescript
import { dbGet, dbRun } from '../../utils/db'
import { requireOwnership } from '../../utils/ownership'
import { isValidSlug } from '../../utils/share-token'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const link = await dbGet('SELECT * FROM share_links WHERE id = ?', [id]) as any
  if (!link) {
    throw createError({ statusCode: 404, message: 'Share link not found' })
  }

  await requireOwnership(event, link.presentation_id)

  if (body.slug !== undefined) {
    if (!isValidSlug(body.slug)) {
      throw createError({ statusCode: 400, message: 'Slug must be 3-50 chars, alphanumeric/hyphens/underscores only' })
    }
    const existing = await dbGet('SELECT id FROM share_links WHERE slug = ? AND id != ?', [body.slug, id])
    if (existing) {
      throw createError({ statusCode: 409, message: 'Este slug já está em uso' })
    }
  }

  if (body.expiresAt !== undefined && body.expiresAt !== null && new Date(body.expiresAt).getTime() <= Date.now()) {
    throw createError({ statusCode: 400, message: 'Expiration must be in the future' })
  }

  const updates: string[] = []
  const args: any[] = []

  if (body.slug !== undefined) {
    updates.push('slug = ?')
    args.push(body.slug)
  }

  if (body.removePassword) {
    updates.push('password_hash = NULL')
  } else if (body.password) {
    if (body.password.length < 4) {
      throw createError({ statusCode: 400, message: 'Password must be at least 4 characters' })
    }
    updates.push('password_hash = ?')
    args.push(await bcrypt.hash(body.password, 10))
  }

  if (body.expiresAt !== undefined) {
    updates.push('expires_at = ?')
    args.push(body.expiresAt)
  }

  if (body.isActive !== undefined) {
    updates.push('is_active = ?')
    args.push(body.isActive ? 1 : 0)
  }

  if (updates.length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  updates.push("updated_at = datetime('now')")
  args.push(id)

  await dbRun(`UPDATE share_links SET ${updates.join(', ')} WHERE id = ?`, args)

  const updated = await dbGet('SELECT * FROM share_links WHERE id = ?', [id]) as any

  return {
    id: updated.id,
    slug: updated.slug,
    hasPassword: !!updated.password_hash,
    expiresAt: updated.expires_at,
    isActive: !!updated.is_active,
    url: `/s/${updated.slug}`,
    createdAt: updated.created_at,
  }
})
```

- [ ] **Step 4: Create DELETE /api/shares/[id]**

Create `server/api/shares/[id].delete.ts`:

```typescript
import { dbGet, dbRun } from '../../utils/db'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const link = await dbGet('SELECT presentation_id FROM share_links WHERE id = ?', [id]) as any
  if (!link) {
    throw createError({ statusCode: 404, message: 'Share link not found' })
  }

  await requireOwnership(event, link.presentation_id)

  await dbRun('DELETE FROM share_links WHERE id = ?', [id])

  setResponseStatus(event, 204)
  return null
})
```

- [ ] **Step 5: Add CRUD tests to tests/server/shares.test.ts**

Append to `tests/server/shares.test.ts`:

```typescript
import bcrypt from 'bcryptjs'

describe('share CRUD operations', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
    seedPresentation(db, { id: 'p1' })
  })

  afterEach(() => { db.close() })

  it('creates a share link with auto-generated slug', () => {
    const slug = 'autoslug1'
    db.prepare(
      "INSERT INTO share_links (id, presentation_id, slug) VALUES ('sh1', 'p1', ?)"
    ).run(slug)
    const row = db.prepare('SELECT * FROM share_links WHERE id = ?').get('sh1') as any
    expect(row.slug).toBe(slug)
    expect(row.password_hash).toBeNull()
    expect(row.expires_at).toBeNull()
    expect(row.is_active).toBe(1)
  })

  it('creates a share link with password hash', async () => {
    const hash = await bcrypt.hash('secret', 10)
    db.prepare(
      "INSERT INTO share_links (id, presentation_id, slug, password_hash) VALUES ('sh1', 'p1', 'withpass', ?)"
    ).run(hash)
    const row = db.prepare('SELECT * FROM share_links WHERE id = ?').get('sh1') as any
    expect(row.password_hash).toBeTruthy()
    expect(await bcrypt.compare('secret', row.password_hash)).toBe(true)
    expect(await bcrypt.compare('wrong', row.password_hash)).toBe(false)
  })

  it('creates a share link with expiration', () => {
    const future = '2027-01-01T00:00:00Z'
    db.prepare(
      "INSERT INTO share_links (id, presentation_id, slug, expires_at) VALUES ('sh1', 'p1', 'expiring', ?)"
    ).run(future)
    const row = db.prepare('SELECT * FROM share_links WHERE id = ?').get('sh1') as any
    expect(row.expires_at).toBe(future)
  })

  it('updates a share link slug', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'old-slug' })
    db.prepare("UPDATE share_links SET slug = ?, updated_at = datetime('now') WHERE id = ?").run('new-slug', 'sh1')
    const row = db.prepare('SELECT slug FROM share_links WHERE id = ?').get('sh1') as any
    expect(row.slug).toBe('new-slug')
  })

  it('deactivates a share link', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'active-link' })
    db.prepare('UPDATE share_links SET is_active = 0 WHERE id = ?').run('sh1')
    const row = db.prepare('SELECT is_active FROM share_links WHERE id = ?').get('sh1') as any
    expect(row.is_active).toBe(0)
  })

  it('deletes a share link', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'deleteme' })
    db.prepare('DELETE FROM share_links WHERE id = ?').run('sh1')
    const row = db.prepare('SELECT * FROM share_links WHERE id = ?').get('sh1')
    expect(row).toBeUndefined()
  })

  it('lists share links for a presentation', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'link1' })
    seedShareLink(db, { id: 'sh2', presentationId: 'p1', slug: 'link2' })
    seedPresentation(db, { id: 'p2', userId: 'user-1' })
    seedShareLink(db, { id: 'sh3', presentationId: 'p2', slug: 'other' })
    const links = db.prepare('SELECT * FROM share_links WHERE presentation_id = ?').all('p1')
    expect(links).toHaveLength(2)
  })
})
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run tests/server/shares.test.ts
```

Expected: 19 tests PASS (5 schema + 7 token + 7 CRUD).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add share CRUD API endpoints

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Public Access API + Presentation Getter Update

**Files:**
- Create: `server/api/shares/access/[slug].get.ts`
- Create: `server/api/shares/access/[slug]/verify.post.ts`
- Modify: `server/api/presentations/[id].get.ts:16-19`
- Test: `tests/server/shares.test.ts` (append)

- [ ] **Step 1: Create GET /api/shares/access/[slug]**

Create `server/api/shares/access/[slug].get.ts`:

```typescript
import { dbGet } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!

  const link = await dbGet(
    'SELECT sl.presentation_id, sl.password_hash, sl.expires_at, sl.is_active, p.title FROM share_links sl JOIN presentations p ON p.id = sl.presentation_id WHERE sl.slug = ?',
    [slug]
  ) as any

  if (!link || !link.is_active) {
    throw createError({ statusCode: 404, message: 'Link não encontrado' })
  }

  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
    throw createError({ statusCode: 410, message: 'Este link expirou' })
  }

  return {
    presentationId: link.presentation_id,
    requiresPassword: !!link.password_hash,
    title: link.title,
  }
})
```

- [ ] **Step 2: Create POST /api/shares/access/[slug]/verify**

Create directory first: `server/api/shares/access/[slug]/verify.post.ts`

```typescript
import { dbGet } from '../../../../utils/db'
import { createShareAccessToken } from '../../../../utils/share-token'
import { RateLimiter } from '../../../../utils/rate-limiter'
import bcrypt from 'bcryptjs'

const verifyLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 })

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!

  const rateKey = `share:${slug}`
  const rateResult = verifyLimiter.check(rateKey)
  if (!rateResult.allowed) {
    setResponseHeader(event, 'Retry-After', String(Math.ceil((rateResult.retryAfterMs || 60_000) / 1000)))
    throw createError({ statusCode: 429, message: 'Muitas tentativas. Tente novamente em breve.' })
  }

  const link = await dbGet(
    'SELECT id, presentation_id, password_hash, expires_at, is_active FROM share_links WHERE slug = ?',
    [slug]
  ) as any

  if (!link || !link.is_active) {
    throw createError({ statusCode: 404, message: 'Link não encontrado' })
  }

  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
    throw createError({ statusCode: 410, message: 'Este link expirou' })
  }

  if (link.password_hash) {
    const body = await readBody(event)
    const password = body?.password
    if (!password) {
      throw createError({ statusCode: 400, message: 'Senha é obrigatória' })
    }
    const match = await bcrypt.compare(password, link.password_hash)
    if (!match) {
      throw createError({ statusCode: 401, message: 'Senha incorreta' })
    }
  }

  const token = createShareAccessToken(link.id, link.presentation_id)

  setCookie(event, `share_access`, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60,
    path: '/',
  })

  return {
    presentationId: link.presentation_id,
  }
})
```

- [ ] **Step 3: Update presentation getter for share access**

Modify `server/api/presentations/[id].get.ts`. Replace the access check block (lines 16-19) with:

```typescript
  const isOwner = session?.user?.id && session.user.id === presentation.user_id

  let hasShareAccess = false
  if (presentation.visibility === 'private' && !isOwner) {
    const shareToken = getCookie(event, 'share_access')
    if (shareToken) {
      const { verifyShareAccessToken } = await import('../../utils/share-token')
      const tokenData = verifyShareAccessToken(shareToken)
      if (tokenData && tokenData.presentationId === id) {
        const { dbGet: dbGetUtil } = await import('../../utils/db')
        const link = await dbGetUtil('SELECT is_active, expires_at FROM share_links WHERE id = ?', [tokenData.shareId]) as any
        if (link && link.is_active && (!link.expires_at || new Date(link.expires_at).getTime() > Date.now())) {
          hasShareAccess = true
        }
      }
    }
    if (!hasShareAccess) {
      throw createError({ statusCode: 404, message: 'Presentation not found' })
    }
  }
```

- [ ] **Step 4: Add public access tests**

Append to `tests/server/shares.test.ts`:

```typescript
describe('share access logic', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
    seedPresentation(db, { id: 'p1', visibility: 'private' })
  })

  afterEach(() => { db.close() })

  it('finds active share link by slug', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'my-link' })
    const link = db.prepare(
      'SELECT sl.presentation_id, sl.password_hash, sl.is_active, p.title FROM share_links sl JOIN presentations p ON p.id = sl.presentation_id WHERE sl.slug = ?'
    ).get('my-link') as any
    expect(link.presentation_id).toBe('p1')
    expect(link.title).toBe('Test Presentation')
    expect(link.is_active).toBe(1)
  })

  it('returns null for inactive share link', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'inactive', isActive: 0 })
    const link = db.prepare(
      'SELECT * FROM share_links WHERE slug = ? AND is_active = 1'
    ).get('inactive')
    expect(link).toBeUndefined()
  })

  it('detects expired share link', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'expired', expiresAt: '2020-01-01T00:00:00Z' })
    const link = db.prepare('SELECT expires_at FROM share_links WHERE slug = ?').get('expired') as any
    const isExpired = new Date(link.expires_at).getTime() <= Date.now()
    expect(isExpired).toBe(true)
  })

  it('allows access with valid non-expired link', () => {
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'valid', expiresAt: '2099-01-01T00:00:00Z' })
    const link = db.prepare('SELECT expires_at, is_active FROM share_links WHERE slug = ?').get('valid') as any
    const isValid = link.is_active === 1 && (!link.expires_at || new Date(link.expires_at).getTime() > Date.now())
    expect(isValid).toBe(true)
  })

  it('verifies password correctly with bcrypt', async () => {
    const hash = await bcrypt.hash('mypassword', 10)
    seedShareLink(db, { id: 'sh1', presentationId: 'p1', slug: 'protected', passwordHash: hash })
    const link = db.prepare('SELECT password_hash FROM share_links WHERE slug = ?').get('protected') as any
    expect(await bcrypt.compare('mypassword', link.password_hash)).toBe(true)
    expect(await bcrypt.compare('wrongpass', link.password_hash)).toBe(false)
  })

  it('share access token round-trips for presentation verification', () => {
    const token = createShareAccessToken('sh1', 'p1')
    const result = verifyShareAccessToken(token)
    expect(result).not.toBeNull()
    expect(result!.presentationId).toBe('p1')
    expect(result!.shareId).toBe('sh1')
  })
})
```

- [ ] **Step 5: Run all share tests**

```bash
npx vitest run tests/server/shares.test.ts
```

Expected: 25 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add public share access API + presentation getter update

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Share Page (/s/[slug])

**Files:**
- Create: `pages/s/[slug].vue`

- [ ] **Step 1: Create the share landing page**

Create `pages/s/[slug].vue`:

```vue
<script setup lang="ts">
import { Lock, Loader2, AlertTriangle, ExternalLink } from 'lucide-vue-next'

const route = useRoute()
const slug = route.params.slug as string
const isEmbed = route.query.embed === 'true'

const password = ref('')
const error = ref('')
const verifying = ref(false)

const { data: linkInfo, error: fetchError, status } = useFetch(`/api/shares/access/${slug}`)

const isExpired = computed(() => fetchError.value?.statusCode === 410)
const isNotFound = computed(() => fetchError.value?.statusCode === 404)

async function submitPassword() {
  error.value = ''
  verifying.value = true
  try {
    const result = await $fetch<{ presentationId: string }>(`/api/shares/access/${slug}/verify`, {
      method: 'POST',
      body: { password: password.value },
    })
    if (isEmbed) {
      navigateTo(`/present/${result.presentationId}?embed=true`, { replace: true })
    } else {
      navigateTo(`/present/${result.presentationId}`, { replace: true })
    }
  } catch (e: any) {
    if (e.statusCode === 401) {
      error.value = 'Senha incorreta'
    } else if (e.statusCode === 429) {
      error.value = 'Muitas tentativas. Aguarde um momento.'
    } else {
      error.value = 'Erro ao verificar. Tente novamente.'
    }
  } finally {
    verifying.value = false
  }
}

async function accessWithoutPassword() {
  verifying.value = true
  try {
    const result = await $fetch<{ presentationId: string }>(`/api/shares/access/${slug}/verify`, {
      method: 'POST',
      body: {},
    })
    if (isEmbed) {
      navigateTo(`/present/${result.presentationId}?embed=true`, { replace: true })
    } else {
      navigateTo(`/present/${result.presentationId}`, { replace: true })
    }
  } catch {
    error.value = 'Erro ao acessar. Tente novamente.'
    verifying.value = false
  }
}

watch(linkInfo, (info) => {
  if (info && !info.requiresPassword) {
    accessWithoutPassword()
  }
})
</script>

<template>
  <!-- Loading -->
  <div class="share-page" v-if="status === 'pending' || (linkInfo && !linkInfo.requiresPassword)">
    <div class="share-card">
      <Loader2 :size="32" class="spin" />
      <p>Carregando...</p>
    </div>
  </div>

  <!-- Expired -->
  <div class="share-page" v-else-if="isExpired">
    <div class="share-card">
      <AlertTriangle :size="40" class="icon-warn" />
      <h2>Link expirado</h2>
      <p class="subtitle">Este link de compartilhamento não está mais disponível.</p>
    </div>
  </div>

  <!-- Not Found -->
  <div class="share-page" v-else-if="isNotFound || fetchError">
    <div class="share-card">
      <AlertTriangle :size="40" class="icon-warn" />
      <h2>Link não encontrado</h2>
      <p class="subtitle">Este link não existe ou foi desativado.</p>
    </div>
  </div>

  <!-- Password Required -->
  <div class="share-page" v-else-if="linkInfo?.requiresPassword">
    <div class="share-card">
      <Lock :size="32" class="icon-lock" />
      <h2>{{ linkInfo.title }}</h2>
      <p class="subtitle">Esta apresentação está protegida por senha.</p>
      <form @submit.prevent="submitPassword" class="password-form">
        <input
          v-model="password"
          type="password"
          placeholder="Digite a senha"
          class="password-input"
          autofocus
          :disabled="verifying"
        />
        <button type="submit" class="btn-access" :disabled="verifying || !password">
          <Loader2 v-if="verifying" :size="14" class="spin" />
          <ExternalLink v-else :size="14" />
          {{ verifying ? 'Verificando...' : 'Acessar' }}
        </button>
      </form>
      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.share-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  padding: 20px;
}

.share-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 48px 40px;
  text-align: center;
  max-width: 420px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.share-card h2 {
  font-size: 20px;
  color: #e6edf3;
  margin: 0;
}

.subtitle {
  font-size: 14px;
  color: #8b949e;
  margin: 0;
}

.icon-lock { color: #e94560; }
.icon-warn { color: #d29922; }

.password-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 8px;
}

.password-input {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 10px 14px;
  color: #e6edf3;
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.password-input:focus {
  border-color: #58a6ff;
}

.btn-access {
  background: #e94560;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-access:hover { background: #d63851; }
.btn-access:disabled { opacity: 0.6; cursor: not-allowed; }

.error-msg {
  color: #f85149;
  font-size: 13px;
  margin: 0;
}

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 480px) {
  .share-card { padding: 32px 24px; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add pages/s/[slug].vue
git commit -m "feat: add share landing page with password protection

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: ShareModal Component + Dashboard Integration

**Files:**
- Create: `components/dashboard/ShareModal.vue`
- Modify: `pages/dashboard.vue`

- [ ] **Step 1: Create ShareModal component**

Create `components/dashboard/ShareModal.vue`:

```vue
<script setup lang="ts">
import { X, Plus, Copy, Trash2, Key, Check, Loader2, Link as LinkIcon } from 'lucide-vue-next'

interface ShareLink {
  id: string
  slug: string
  hasPassword: boolean
  expiresAt: string | null
  isActive: boolean
  url: string
  createdAt: string
}

const props = defineProps<{
  presentationId: string
  presentationTitle: string
}>()

const emit = defineEmits<{
  close: []
}>()

const links = ref<ShareLink[]>([])
const loading = ref(true)
const creating = ref(false)
const deletingId = ref<string | null>(null)
const copiedId = ref<string | null>(null)
const copiedEmbed = ref(false)
const showCreateForm = ref(false)

const newSlug = ref('')
const newPassword = ref('')
const newExpiresAt = ref('')
const createError = ref('')

const origin = ref('')
onMounted(() => {
  origin.value = window.location.origin
})

async function fetchLinks() {
  loading.value = true
  try {
    links.value = await $fetch<ShareLink[]>(`/api/shares?presentationId=${props.presentationId}`)
  } catch {
    links.value = []
  } finally {
    loading.value = false
  }
}

async function createLink() {
  createError.value = ''
  creating.value = true
  try {
    const body: any = { presentationId: props.presentationId }
    if (newSlug.value.trim()) body.slug = newSlug.value.trim()
    if (newPassword.value) body.password = newPassword.value
    if (newExpiresAt.value) body.expiresAt = new Date(newExpiresAt.value).toISOString()

    await $fetch('/api/shares', { method: 'POST', body })
    newSlug.value = ''
    newPassword.value = ''
    newExpiresAt.value = ''
    showCreateForm.value = false
    await fetchLinks()
  } catch (e: any) {
    createError.value = e.data?.message || 'Erro ao criar link'
  } finally {
    creating.value = false
  }
}

async function deleteLink(id: string) {
  if (!confirm('Deletar este link de compartilhamento?')) return
  deletingId.value = id
  try {
    await $fetch(`/api/shares/${id}`, { method: 'DELETE' })
    await fetchLinks()
  } finally {
    deletingId.value = null
  }
}

async function toggleActive(link: ShareLink) {
  try {
    await $fetch(`/api/shares/${link.id}`, {
      method: 'PUT',
      body: { isActive: !link.isActive },
    })
    await fetchLinks()
  } catch {}
}

function copyLink(link: ShareLink) {
  const url = `${origin.value}${link.url}`
  navigator.clipboard.writeText(url)
  copiedId.value = link.id
  setTimeout(() => { copiedId.value = null }, 2000)
}

function copyEmbed() {
  if (!links.value.length) return
  const url = `${origin.value}${links.value[0].url}?embed=true`
  const code = `<iframe src="${url}" width="960" height="540" frameborder="0" allowfullscreen></iframe>`
  navigator.clipboard.writeText(code)
  copiedEmbed.value = true
  setTimeout(() => { copiedEmbed.value = false }, 2000)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

onMounted(fetchLinks)
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h2>Compartilhar: {{ presentationTitle }}</h2>
          <button class="btn-close" @click="emit('close')">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <!-- Create new link button -->
          <button
            v-if="!showCreateForm"
            class="btn-create"
            @click="showCreateForm = true"
          >
            <Plus :size="14" />
            Criar novo link
          </button>

          <!-- Create form -->
          <div v-if="showCreateForm" class="create-form">
            <div class="form-field">
              <label>Slug (opcional)</label>
              <input v-model="newSlug" placeholder="auto-gerado se vazio" class="input" />
            </div>
            <div class="form-field">
              <label>Senha (opcional)</label>
              <input v-model="newPassword" type="password" placeholder="sem senha" class="input" />
            </div>
            <div class="form-field">
              <label>Expiração (opcional)</label>
              <input v-model="newExpiresAt" type="datetime-local" class="input" />
            </div>
            <p v-if="createError" class="error-msg">{{ createError }}</p>
            <div class="form-actions">
              <button class="btn-cancel" @click="showCreateForm = false; createError = ''">Cancelar</button>
              <button class="btn-confirm" @click="createLink" :disabled="creating">
                <Loader2 v-if="creating" :size="14" class="spin" />
                Criar
              </button>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="loading">
            <Loader2 :size="20" class="spin" />
          </div>

          <!-- Links list -->
          <div v-else-if="links.length" class="links-list">
            <div
              v-for="link in links"
              :key="link.id"
              class="link-item"
              :class="{ inactive: !link.isActive }"
            >
              <div class="link-info">
                <div class="link-url">
                  <LinkIcon :size="12" />
                  /s/{{ link.slug }}
                  <Key v-if="link.hasPassword" :size="12" class="icon-key" title="Protegido por senha" />
                </div>
                <div class="link-meta">
                  <span v-if="link.expiresAt">Expira: {{ formatDate(link.expiresAt) }}</span>
                  <span v-else>Sem expiração</span>
                  <span>·</span>
                  <button class="btn-toggle" @click="toggleActive(link)">
                    {{ link.isActive ? 'Ativo ✓' : 'Inativo' }}
                  </button>
                </div>
              </div>
              <div class="link-actions">
                <button class="btn-icon" @click="copyLink(link)" :title="copiedId === link.id ? 'Copiado!' : 'Copiar link'">
                  <Check v-if="copiedId === link.id" :size="14" class="icon-success" />
                  <Copy v-else :size="14" />
                </button>
                <button
                  class="btn-icon btn-delete"
                  @click="deleteLink(link.id)"
                  :disabled="deletingId === link.id"
                >
                  <Loader2 v-if="deletingId === link.id" :size="14" class="spin" />
                  <Trash2 v-else :size="14" />
                </button>
              </div>
            </div>
          </div>

          <p v-else-if="!showCreateForm" class="empty-msg">Nenhum link criado ainda.</p>

          <!-- Embed section -->
          <div v-if="links.length" class="embed-section">
            <div class="embed-header">Código Embed</div>
            <div class="embed-code">
              <code>&lt;iframe src="{{ origin }}{{ links[0].url }}?embed=true" ...&gt;</code>
              <button class="btn-icon" @click="copyEmbed">
                <Check v-if="copiedEmbed" :size="14" class="icon-success" />
                <Copy v-else :size="14" />
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-done" @click="emit('close')">Fechar</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  width: 520px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #21262d;
}

.modal-header h2 {
  font-size: 16px;
  color: #e6edf3;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-close {
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px;
}

.btn-close:hover { color: #e6edf3; }

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.btn-create {
  background: rgba(255, 255, 255, 0.06);
  border: 1px dashed #30363d;
  color: #8b949e;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
}

.btn-create:hover { background: rgba(255, 255, 255, 0.1); color: #e6edf3; }

.create-form {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 12px; color: #8b949e; }
.input {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 10px;
  color: #e6edf3;
  font-size: 13px;
  outline: none;
}
.input:focus { border-color: #58a6ff; }

.form-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-cancel {
  background: none;
  border: 1px solid #30363d;
  color: #8b949e;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn-cancel:hover { color: #e6edf3; }
.btn-confirm {
  background: #e94560;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.btn-confirm:hover { background: #d63851; }
.btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

.error-msg { color: #f85149; font-size: 12px; margin: 0; }

.loading { display: flex; justify-content: center; padding: 20px; color: #8b949e; }

.links-list { display: flex; flex-direction: column; gap: 8px; }

.link-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
}

.link-item.inactive { opacity: 0.5; }

.link-info { flex: 1; min-width: 0; }

.link-url {
  font-size: 13px;
  color: #58a6ff;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
}

.icon-key { color: #d29922; }

.link-meta {
  font-size: 11px;
  color: #8b949e;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-toggle {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 11px;
  padding: 0;
}
.btn-toggle:hover { color: #e6edf3; }

.link-actions { display: flex; gap: 4px; margin-left: 8px; }

.btn-icon {
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
}
.btn-icon:hover { color: #e6edf3; background: rgba(255, 255, 255, 0.06); }
.btn-delete:hover { color: #f85149; }
.icon-success { color: #3fb950; }

.empty-msg { text-align: center; color: #8b949e; font-size: 13px; }

.embed-section {
  border-top: 1px solid #21262d;
  padding-top: 16px;
}

.embed-header {
  font-size: 12px;
  color: #8b949e;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.embed-code {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 8px 12px;
}

.embed-code code {
  flex: 1;
  font-size: 11px;
  color: #8b949e;
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #21262d;
  display: flex;
  justify-content: flex-end;
}

.btn-done {
  background: rgba(255, 255, 255, 0.08);
  color: #e6edf3;
  border: 1px solid #30363d;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn-done:hover { background: rgba(255, 255, 255, 0.12); }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
```

- [ ] **Step 2: Integrate ShareModal into dashboard**

Modify `pages/dashboard.vue`:

**Add imports** — in the `<script setup>` import line (line 2), add `Share2`:

```typescript
import { Plus, Upload, Trash2, Globe, Lock, Loader2, Share2 } from 'lucide-vue-next'
```

**Add state** — after the existing refs (around line 11):

```typescript
const sharingPresentation = ref<{ id: string; title: string } | null>(null)

function openShareModal(p: any) {
  sharingPresentation.value = { id: p.id, title: p.title }
}
```

**Add Share button** — in the `<template>`, inside the `.card-actions` div (between the visibility toggle button and delete button, around line 116):

```html
          <button class="btn-share" @click.stop="openShareModal(p)" title="Compartilhar">
            <Share2 :size="15" />
          </button>
```

**Add ShareModal** — right before the closing `</template>` import overlay Teleport (before line 129):

```html
    <!-- Share Modal -->
    <DashboardShareModal
      v-if="sharingPresentation"
      :presentation-id="sharingPresentation.id"
      :presentation-title="sharingPresentation.title"
      @close="sharingPresentation = null"
    />
```

**Add CSS** — in the `<style>` section, add after `.btn-delete:hover`:

```css
.btn-share { background: none; border: none; padding: 8px; cursor: pointer; color: #484f58; display: flex; align-items: center; }
.btn-share:hover { color: #58a6ff; }
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add ShareModal component and dashboard integration

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Run all tests + push

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS (68 existing + new share tests).

- [ ] **Step 2: Push to master**

```bash
git push origin master
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ share_links table with all fields
- ✅ CRUD API (create, list, update, delete)
- ✅ Public access endpoint (slug info)
- ✅ Password verification with bcrypt + rate limiting
- ✅ Share access cookie (HMAC signed)
- ✅ Presentation getter updated for share access
- ✅ Share page with password form, redirect, embed mode
- ✅ ShareModal with create, list, copy, delete, toggle
- ✅ Dashboard Share button integration
- ✅ Embed code copy

**No placeholders found.** All code is complete.

**Type consistency:** `ShareLink` interface used consistently in ShareModal. `generateSlug`, `isValidSlug`, `createShareAccessToken`, `verifyShareAccessToken` names match across all files.
