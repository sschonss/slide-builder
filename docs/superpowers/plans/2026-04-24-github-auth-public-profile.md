# GitHub OAuth + Public Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub OAuth authentication and public user profiles so each user owns their presentations and has a shareable profile page.

**Architecture:** `nuxt-auth-utils` handles GitHub OAuth and session management via encrypted cookies. A `users` table stores GitHub profile data. `presentations` gets `user_id` and `visibility` columns. Server middleware attaches user context; individual handlers check ownership. Public profile at `/u/[username]` lists public presentations.

**Tech Stack:** nuxt-auth-utils, @libsql/client/http (Turso), GitHub OAuth2

**Spec:** `docs/superpowers/specs/2026-04-24-github-auth-public-profile-design.md`

---

### Task 1: Install and configure nuxt-auth-utils

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts`
- Modify: `.env.example`
- Modify: `.env`

- [ ] **Step 1: Install nuxt-auth-utils**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
npx nuxi module add auth-utils
```

- [ ] **Step 2: Update nuxt.config.ts with session config**

Add to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  ssr: false,
  modules: ['nuxt-auth-utils'],
  runtimeConfig: {
    tursoUrl: '',
    tursoToken: '',
    session: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
    oauth: {
      github: {
        clientId: '',
        clientSecret: '',
      },
    },
  },
  nitro: {
    preset: 'vercel',
    experimental: {
      asyncContext: true,
    },
  },
  app: {
    head: {
      title: 'Slide Builder',
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap' },
      ],
    },
  },
})
```

- [ ] **Step 3: Update .env.example and .env**

Add these lines to `.env.example`:

```
NUXT_OAUTH_GITHUB_CLIENT_ID=
NUXT_OAUTH_GITHUB_CLIENT_SECRET=
NUXT_SESSION_PASSWORD=
```

Add the same to `.env` with actual values (user will fill in after creating GitHub OAuth app).

Generate a session password:

```bash
openssl rand -base64 32
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: install and configure nuxt-auth-utils for GitHub OAuth"
```

---

### Task 2: Database schema — users table and presentations migration

**Files:**
- Modify: `server/utils/db.ts`

- [ ] **Step 1: Add users table and alter presentations in _initDbInternal**

Replace the `_initDbInternal` function in `server/utils/db.ts`. The batch must include the new `users` table and the two new columns on `presentations`. Use individual `try/catch` for ALTER TABLE since the columns may already exist:

```typescript
async function _initDbInternal() {
  try {
    const client = getClient()
    console.log('[slide-builder] Running schema migrations...')

    await client.batch([
      { sql: `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, avatar_url TEXT NOT NULL DEFAULT '', created_at DATETIME NOT NULL DEFAULT (datetime('now')), updated_at DATETIME NOT NULL DEFAULT (datetime('now')))`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS themes (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, config TEXT NOT NULL DEFAULT '{}')`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS presentations (id TEXT PRIMARY KEY, title TEXT NOT NULL, theme_id TEXT NOT NULL REFERENCES themes(id), created_at DATETIME NOT NULL DEFAULT (datetime('now')), updated_at DATETIME NOT NULL DEFAULT (datetime('now')))`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS slides (id TEXT PRIMARY KEY, presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE, "order" INTEGER NOT NULL DEFAULT 0, template TEXT NOT NULL CHECK(template IN ('cover','section','content','diagram','code','comparison')), data TEXT NOT NULL DEFAULT '{}', notes TEXT)`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE, filename TEXT NOT NULL, path TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('image','video','logo')))`, args: [] },
      { sql: `CREATE TABLE IF NOT EXISTS change_log (id INTEGER PRIMARY KEY AUTOINCREMENT, presentation_id TEXT NOT NULL REFERENCES presentations(id) ON DELETE CASCADE, action TEXT NOT NULL, description TEXT NOT NULL, slide_hash TEXT, snapshot TEXT, created_at DATETIME NOT NULL DEFAULT (datetime('now')))`, args: [] },
    ], 'write')

    // ALTER TABLE migrations — safe to fail if columns already exist
    const alterStatements = [
      `ALTER TABLE presentations ADD COLUMN user_id TEXT REFERENCES users(id)`,
      `ALTER TABLE presentations ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('public', 'private'))`,
    ]
    for (const sql of alterStatements) {
      try {
        await client.execute({ sql, args: [] })
        console.log(`[slide-builder] Migration applied: ${sql.substring(0, 60)}...`)
      } catch (err: any) {
        if (!err.message?.includes('duplicate column')) {
          console.log(`[slide-builder] Migration skipped (already applied): ${sql.substring(0, 60)}...`)
        }
      }
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
```

- [ ] **Step 2: Build to verify no errors**

```bash
npx nuxt build 2>&1 | tail -5
```

Expected: `✨ Build complete!`

- [ ] **Step 3: Commit**

```bash
git add server/utils/db.ts
git commit -m "feat: add users table and presentation visibility/user_id columns"
```

---

### Task 3: GitHub OAuth callback and user upsert

**Files:**
- Create: `server/routes/auth/github.get.ts`
- Create: `server/utils/auth.ts`

- [ ] **Step 1: Create auth utility for user upsert**

Create `server/utils/auth.ts`:

```typescript
import { dbGet, dbRun } from './db'

interface GitHubUser {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

export async function findOrCreateUser(ghUser: GitHubUser) {
  const userId = String(ghUser.id)
  const existing = await dbGet('SELECT * FROM users WHERE id = ?', [userId])

  if (existing) {
    await dbRun(
      `UPDATE users SET username = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
      [ghUser.login, ghUser.name || ghUser.login, ghUser.avatar_url, userId]
    )
  } else {
    await dbRun(
      'INSERT INTO users (id, username, name, avatar_url) VALUES (?, ?, ?, ?)',
      [userId, ghUser.login, ghUser.name || ghUser.login, ghUser.avatar_url]
    )
  }

  return {
    id: userId,
    username: ghUser.login,
    name: ghUser.name || ghUser.login,
    avatarUrl: ghUser.avatar_url,
  }
}
```

- [ ] **Step 2: Create GitHub OAuth handler**

Create `server/routes/auth/github.get.ts`:

```typescript
import { findOrCreateUser } from '../../utils/auth'

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
    const dbUser = await findOrCreateUser({
      id: user.id,
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
    })

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
      },
    })

    return sendRedirect(event, '/dashboard')
  },
  onError(event, error) {
    console.error('[slide-builder] GitHub OAuth error:', error)
    return sendRedirect(event, '/?error=auth')
  },
})
```

- [ ] **Step 3: Add session type augmentation**

Create `server/types/auth.d.ts`:

```typescript
declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    name: string
    avatarUrl: string
  }
}

export {}
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/auth/ server/utils/auth.ts server/types/
git commit -m "feat: GitHub OAuth callback with user upsert"
```

---

### Task 4: Auth middleware and ownership helper

**Files:**
- Create: `server/utils/ownership.ts`

- [ ] **Step 1: Create ownership check utility**

Create `server/utils/ownership.ts`:

```typescript
import { dbGet } from './db'
import type { H3Event } from 'h3'

export async function requireAuth(event: H3Event) {
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Autenticação necessária' })
  }
  return session.user
}

export async function requireOwnership(event: H3Event, presentationId: string) {
  const user = await requireAuth(event)
  const presentation = await dbGet(
    'SELECT user_id FROM presentations WHERE id = ?',
    [presentationId]
  ) as any

  if (!presentation) {
    throw createError({ statusCode: 404, message: 'Apresentação não encontrada' })
  }

  // Allow access to orphaned presentations (no user_id) for migration period
  if (presentation.user_id && presentation.user_id !== user.id) {
    throw createError({ statusCode: 403, message: 'Sem permissão para esta apresentação' })
  }

  return user
}
```

- [ ] **Step 2: Commit**

```bash
git add server/utils/ownership.ts
git commit -m "feat: auth and ownership check utilities"
```

---

### Task 5: Protect mutation API endpoints

**Files:**
- Modify: `server/api/presentations/index.post.ts`
- Modify: `server/api/presentations/[id].put.ts`
- Modify: `server/api/presentations/[id].delete.ts`
- Modify: `server/api/presentations/import.post.ts`
- Modify: `server/api/slides/index.post.ts`
- Modify: `server/api/slides/[id].put.ts`
- Modify: `server/api/slides/[id].delete.ts`
- Modify: `server/api/slides/reorder.put.ts`
- Modify: `server/api/presentations/[id]/revert.post.ts`
- Modify: `server/api/assets/upload.post.ts`
- Modify: `server/api/assets/save-svg.post.ts`

- [ ] **Step 1: Update presentations/index.post.ts — add user_id**

Add auth check and user_id to the INSERT:

```typescript
import { dbGet, dbRun } from '../../utils/db'
import { requireAuth } from '../../utils/ownership'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const theme = await dbGet('SELECT id FROM themes LIMIT 1') as any
  if (!theme) throw createError({ statusCode: 500, message: 'No theme available' })

  const id = uuid()
  const now = new Date().toISOString()

  await dbRun(
    'INSERT INTO presentations (id, title, theme_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, body.title || 'Nova Apresentação', body.theme_id || theme.id, user.id, now, now]
  )

  const slideId = uuid()
  const coverData = JSON.stringify({
    title: body.title || 'Nova Apresentação',
    subtitle: '',
    author: user.name,
  })
  await dbRun(
    'INSERT INTO slides (id, presentation_id, "order", template, data) VALUES (?, ?, 0, \'cover\', ?)',
    [slideId, id, coverData]
  )

  return { id, title: body.title || 'Nova Apresentação', theme_id: body.theme_id || theme.id, created_at: now, updated_at: now }
})
```

- [ ] **Step 2: Update presentations/[id].put.ts — add ownership**

```typescript
import { dbRun } from '../../utils/db'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requireOwnership(event, id)
  const body = await readBody(event)

  const fields: string[] = []
  const values: any[] = []

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title) }
  if (body.theme_id !== undefined) { fields.push('theme_id = ?'); values.push(body.theme_id) }
  if (body.visibility !== undefined) { fields.push('visibility = ?'); values.push(body.visibility) }

  fields.push("updated_at = datetime('now')")
  values.push(id)

  await dbRun(`UPDATE presentations SET ${fields.join(', ')} WHERE id = ?`, values)

  return { success: true }
})
```

- [ ] **Step 3: Update presentations/[id].delete.ts — add ownership**

```typescript
import { dbRun } from '../../utils/db'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requireOwnership(event, id)

  await dbRun('DELETE FROM presentations WHERE id = ?', [id])

  return { success: true }
})
```

- [ ] **Step 4: Update import.post.ts — add user_id**

Add at the top of the handler, right after `readBody`:

```typescript
import { dbGet, dbRun, dbBatch } from '../../utils/db'
import { requireAuth } from '../../utils/ownership'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  if (body.format !== 'slidebuilder' || !body.version) {
    throw createError({ statusCode: 400, message: 'Formato inválido. Selecione um arquivo .slidebuilder' })
  }

  const now = new Date().toISOString()

  let themeId: string
  if (body.theme) {
    const existing = await dbGet('SELECT id FROM themes WHERE name = ?', [body.theme.name || 'Imported Theme']) as any
    if (existing) {
      themeId = existing.id
    } else {
      themeId = uuid()
      await dbRun('INSERT INTO themes (id, name, config) VALUES (?, ?, ?)', [
        themeId, body.theme.name || 'Imported Theme', JSON.stringify(body.theme.config)
      ])
    }
  } else {
    const fallback = await dbGet('SELECT id FROM themes LIMIT 1') as any
    if (!fallback) throw createError({ statusCode: 500, message: 'No theme available' })
    themeId = fallback.id
  }

  const presentationId = uuid()
  const title = body.presentation?.title || 'Imported Presentation'
  await dbRun(
    'INSERT INTO presentations (id, title, theme_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [presentationId, title, themeId, user.id, now, now]
  )

  const slides = body.slides || []
  if (slides.length > 0) {
    const slideStatements = slides.map((s: any, i: number) => ({
      sql: 'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)',
      args: [uuid(), presentationId, s.order ?? i, s.template || 'content', JSON.stringify(s.data || {}), s.notes || null]
    }))
    await dbBatch(slideStatements)
  }

  return { success: true, id: presentationId, title, slide_count: slides.length }
})
```

- [ ] **Step 5: Update slides/index.post.ts — add ownership via presentation**

Add at the beginning of the handler:

```typescript
import { dbGet, dbRun } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'
import { requireOwnership } from '../../utils/ownership'
import { v4 as uuid } from 'uuid'

const DEFAULT_DATA: Record<string, object> = {
  cover: { title: '', subtitle: '', author: '' },
  section: { title: '' },
  content: { title: '', bullets: [''], quote: '' },
  diagram: { title: '', diagram_type: 'mermaid', mermaid_code: '' },
  code: { title: '', code: '', language: 'typescript' },
  comparison: { title: '', left_title: '', left_items: [''], right_title: '', right_items: [''], style: 'columns' },
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  await requireOwnership(event, body.presentation_id)

  const last = await dbGet(
    'SELECT MAX("order") as max_order FROM slides WHERE presentation_id = ?',
    [body.presentation_id]
  ) as any
  const order = (last?.max_order ?? -1) + 1

  const id = uuid()
  const template = body.template || 'content'
  const data = body.data || DEFAULT_DATA[template] || {}

  await dbRun(
    'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [id, body.presentation_id, order, template, JSON.stringify(data), body.notes || null]
  )

  await dbRun("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?", [body.presentation_id])
  await saveBackup(body.presentation_id)
  await logChange(body.presentation_id, 'add', `Adicionou slide ${order + 1} (${template})`)

  return { id, presentation_id: body.presentation_id, order, template, data, notes: body.notes || null }
})
```

- [ ] **Step 6: Update slides/[id].put.ts — add ownership via slide's presentation**

```typescript
import { dbGet, dbRun } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Look up the slide's presentation to check ownership
  const slide = await dbGet('SELECT presentation_id, "order", template FROM slides WHERE id = ?', [id]) as any
  if (!slide) throw createError({ statusCode: 404, message: 'Slide não encontrado' })

  await requireOwnership(event, slide.presentation_id)

  const fields: string[] = []
  const values: any[] = []

  if (body.template !== undefined) { fields.push('template = ?'); values.push(body.template) }
  if (body.data !== undefined) { fields.push('data = ?'); values.push(JSON.stringify(body.data)) }
  if (body.notes !== undefined) { fields.push('notes = ?'); values.push(body.notes) }

  if (fields.length === 0) return { success: true }

  values.push(id)
  await dbRun(`UPDATE slides SET ${fields.join(', ')} WHERE id = ?`, values)

  await dbRun("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?", [slide.presentation_id])
  await saveBackup(slide.presentation_id)

  const changed = Object.keys(body).filter(k => k !== 'template' || body.template !== slide.template)
  const detail = changed.includes('notes') ? 'notas' : 'conteúdo'
  await logChange(slide.presentation_id, 'edit', `Editou ${detail} do slide ${slide.order + 1} (${slide.template})`)

  return { success: true }
})
```

- [ ] **Step 7: Update slides/[id].delete.ts — add ownership**

```typescript
import { dbGet, dbAll, dbRun } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const slide = await dbGet('SELECT presentation_id, "order", template FROM slides WHERE id = ?', [id]) as any
  if (!slide) throw createError({ statusCode: 404, message: 'Slide não encontrado' })

  await requireOwnership(event, slide.presentation_id)

  await dbRun('DELETE FROM slides WHERE id = ?', [id])

  const remaining = await dbAll(
    'SELECT id FROM slides WHERE presentation_id = ? ORDER BY "order" ASC',
    [slide.presentation_id]
  ) as any[]

  for (let i = 0; i < remaining.length; i++) {
    await dbRun('UPDATE slides SET "order" = ? WHERE id = ?', [i, remaining[i].id])
  }

  await dbRun("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?", [slide.presentation_id])
  await saveBackup(slide.presentation_id)
  await logChange(slide.presentation_id, 'delete', `Removeu slide ${slide.order + 1} (${slide.template})`)

  return { success: true }
})
```

- [ ] **Step 8: Update slides/reorder.put.ts — add ownership**

```typescript
import { dbGet, dbBatch } from '../../utils/db'
import { saveBackup } from '../../utils/backup'
import { logChange } from '../../utils/changelog'
import { requireOwnership } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (body.slides?.length) {
    const slide = await dbGet('SELECT presentation_id FROM slides WHERE id = ?', [body.slides[0].id]) as any
    if (slide) {
      await requireOwnership(event, slide.presentation_id)
    }
  }

  await dbBatch(body.slides.map((s: any) => ({
    sql: 'UPDATE slides SET "order" = ? WHERE id = ?',
    args: [s.order, s.id]
  })))

  if (body.slides?.length) {
    const slide = await dbGet('SELECT presentation_id FROM slides WHERE id = ?', [body.slides[0].id]) as any
    if (slide) {
      await saveBackup(slide.presentation_id)
      await logChange(slide.presentation_id, 'reorder', `Reordenou ${body.slides.length} slides`)
    }
  }

  return { success: true }
})
```

- [ ] **Step 9: Update revert.post.ts — add ownership**

Add `requireOwnership` at the top of the handler:

```typescript
import { dbGet, dbBatch, dbRun } from '../../../utils/db'
import { logChange } from '../../../utils/changelog'
import { requireOwnership } from '../../../utils/ownership'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const presentationId = getRouterParam(event, 'id')!
  await requireOwnership(event, presentationId)
  const body = await readBody(event)
  const { hash } = body

  // ... rest unchanged
```

- [ ] **Step 10: Update asset endpoints — add ownership**

For `server/api/assets/upload.post.ts` and `server/api/assets/save-svg.post.ts`, add `requireAuth` at the top:

```typescript
// Add to the top of each handler:
import { requireAuth } from '../../utils/ownership'

// First line inside handler:
await requireAuth(event)
```

- [ ] **Step 11: Commit**

```bash
git add server/api/
git commit -m "feat: protect all mutation endpoints with auth + ownership checks"
```

---

### Task 6: Update read endpoints for visibility and user filtering

**Files:**
- Modify: `server/api/presentations/index.get.ts`
- Modify: `server/api/presentations/[id].get.ts`
- Create: `server/api/users/[username].get.ts`
- Create: `server/api/users/[username]/presentations.get.ts`

- [ ] **Step 1: Update presentations/index.get.ts — filter by authenticated user**

```typescript
import { dbAll } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  if (!session?.user?.id) {
    return []
  }

  const rows = await dbAll(`
    SELECT p.*, COUNT(s.id) as slide_count
    FROM presentations p
    LEFT JOIN slides s ON s.presentation_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `, [session.user.id])

  return rows
})
```

- [ ] **Step 2: Update presentations/[id].get.ts — visibility check**

```typescript
import { dbGet, dbAll } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const session = await getUserSession(event)

  const presentation = await dbGet('SELECT * FROM presentations WHERE id = ?', [id]) as any
  if (!presentation) throw createError({ statusCode: 404, message: 'Presentation not found' })

  // Private presentations: only owner can view
  const isOwner = session?.user?.id && session.user.id === presentation.user_id
  if (presentation.visibility === 'private' && !isOwner) {
    throw createError({ statusCode: 404, message: 'Presentation not found' })
  }

  const slides = await dbAll(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC',
    [id]
  ) as any[]

  const theme = await dbGet('SELECT * FROM themes WHERE id = ?', [presentation.theme_id]) as any

  return {
    ...presentation,
    isOwner: !!isOwner,
    slides: slides.map(s => ({ ...s, data: JSON.parse(s.data) })),
    theme: theme ? { ...theme, config: JSON.parse(theme.config) } : null,
  }
})
```

- [ ] **Step 3: Create users/[username].get.ts — public profile data**

Create `server/api/users/[username].get.ts`:

```typescript
import { dbGet } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')

  const user = await dbGet(
    'SELECT id, username, name, avatar_url, created_at FROM users WHERE username = ?',
    [username]
  ) as any

  if (!user) {
    throw createError({ statusCode: 404, message: 'Usuário não encontrado' })
  }

  return user
})
```

- [ ] **Step 4: Create users/[username]/presentations.get.ts — public presentations**

Create `server/api/users/[username]/presentations.get.ts`:

```typescript
import { dbGet, dbAll } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')

  const user = await dbGet('SELECT id FROM users WHERE username = ?', [username]) as any
  if (!user) {
    throw createError({ statusCode: 404, message: 'Usuário não encontrado' })
  }

  const presentations = await dbAll(`
    SELECT p.id, p.title, p.updated_at, COUNT(s.id) as slide_count
    FROM presentations p
    LEFT JOIN slides s ON s.presentation_id = p.id
    WHERE p.user_id = ? AND p.visibility = 'public'
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `, [user.id])

  return presentations
})
```

- [ ] **Step 5: Commit**

```bash
git add server/api/
git commit -m "feat: user-filtered listing, visibility checks, public profile endpoints"
```

---

### Task 7: Logout endpoint

**Files:**
- Create: `server/api/auth/logout.post.ts`

- [ ] **Step 1: Create logout handler**

Create `server/api/auth/logout.post.ts`:

```typescript
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { success: true }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/auth/
git commit -m "feat: logout endpoint"
```

---

### Task 8: Client composable for auth state

**Files:**
- Create: `composables/useAuth.ts`

- [ ] **Step 1: Create auth composable**

Create `composables/useAuth.ts`:

```typescript
export function useAuth() {
  const { user, session, clear, fetch: fetchSession } = useUserSession()

  const isLoggedIn = computed(() => !!user.value)

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    navigateTo('/')
  }

  function login() {
    navigateTo('/auth/github', { external: true })
  }

  return {
    user,
    session,
    isLoggedIn,
    login,
    logout,
    fetchSession,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add composables/
git commit -m "feat: useAuth composable for client auth state"
```

---

### Task 9: Auth middleware for protected pages

**Files:**
- Create: `middleware/auth.ts`

- [ ] **Step 1: Create client-side auth middleware**

Create `middleware/auth.ts`:

```typescript
export default defineNuxtRouteMiddleware(async () => {
  const { isLoggedIn } = useAuth()

  if (!isLoggedIn.value) {
    return navigateTo('/')
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add middleware/
git commit -m "feat: client auth middleware for protected pages"
```

---

### Task 10: Header component with auth state

**Files:**
- Create: `components/AppHeader.vue`
- Modify: `app.vue`

- [ ] **Step 1: Create AppHeader component**

Create `components/AppHeader.vue`:

```vue
<script setup lang="ts">
import { LogIn, LogOut, LayoutDashboard } from 'lucide-vue-next'

const { user, isLoggedIn, login, logout } = useAuth()

const showMenu = ref(false)

function toggleMenu() { showMenu.value = !showMenu.value }

onMounted(() => {
  document.addEventListener('click', (e) => {
    const el = document.querySelector('.user-menu')
    if (el && !el.contains(e.target as Node)) showMenu.value = false
  })
})
</script>

<template>
  <header class="app-header">
    <NuxtLink to="/" class="logo">Slide Builder</NuxtLink>
    <nav class="nav">
      <template v-if="isLoggedIn && user">
        <NuxtLink to="/dashboard" class="nav-link"><LayoutDashboard :size="14" /> Dashboard</NuxtLink>
        <div class="user-menu">
          <button class="avatar-btn" @click.stop="toggleMenu">
            <img :src="user.avatarUrl" :alt="user.name" class="avatar" />
          </button>
          <div class="menu-dropdown" v-if="showMenu">
            <div class="menu-user">
              <strong>{{ user.name }}</strong>
              <span class="username">@{{ user.username }}</span>
            </div>
            <hr class="menu-divider" />
            <NuxtLink :to="`/u/${user.username}`" class="menu-item" @click="showMenu = false">Meu perfil público</NuxtLink>
            <button class="menu-item" @click="logout"><LogOut :size="14" /> Sair</button>
          </div>
        </div>
      </template>
      <template v-else>
        <button class="btn-login" @click="login"><LogIn :size="14" /> Entrar com GitHub</button>
      </template>
    </nav>
  </header>
</template>

<style scoped>
.app-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: #010409; border-bottom: 1px solid #21262d; }
.logo { font-size: 16px; font-weight: 700; color: #e6edf3; }
.nav { display: flex; align-items: center; gap: 12px; }
.nav-link { font-size: 13px; color: #8b949e; display: flex; align-items: center; gap: 5px; }
.nav-link:hover { color: #e6edf3; }
.avatar-btn { background: none; border: none; cursor: pointer; padding: 0; }
.avatar { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #30363d; }
.user-menu { position: relative; }
.menu-dropdown { position: absolute; top: 100%; right: 0; margin-top: 8px; background: #1c2128; border: 1px solid #30363d; border-radius: 8px; min-width: 200px; z-index: 200; box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden; }
.menu-user { padding: 12px 14px; }
.menu-user strong { display: block; font-size: 14px; color: #e6edf3; }
.username { font-size: 12px; color: #8b949e; }
.menu-divider { border: none; border-top: 1px solid #30363d; margin: 0; }
.menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: none; border: none; color: #e6edf3; font-size: 13px; cursor: pointer; text-align: left; }
.menu-item:hover { background: rgba(255,255,255,0.08); }
.btn-login { background: #238636; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; }
.btn-login:hover { background: #2ea043; }
</style>
```

- [ ] **Step 2: Update app.vue to include AppHeader**

```vue
<template>
  <div>
    <AppHeader />
    <NuxtPage />
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', sans-serif;
  background: #0d1117;
  color: #e6edf3;
  min-height: 100vh;
}
a { color: inherit; text-decoration: none; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add components/AppHeader.vue app.vue
git commit -m "feat: app header with auth state and user menu"
```

---

### Task 11: Landing page and dashboard page

**Files:**
- Modify: `pages/index.vue` (becomes landing page)
- Create: `pages/dashboard.vue` (dashboard with presentations)

- [ ] **Step 1: Create dashboard.vue from current index.vue**

Create `pages/dashboard.vue` with the current dashboard content, adding auth middleware and visibility toggle:

```vue
<script setup lang="ts">
import { Plus, Upload, Trash2, Globe, Lock } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const { data: presentations, refresh } = useFetch('/api/presentations')

async function createPresentation() {
  const title = prompt('Nome da apresentação:')
  if (!title) return
  const result = await $fetch('/api/presentations', { method: 'POST', body: { title } })
  navigateTo(`/editor/${(result as any).id}`)
}

async function importPresentation() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.slidebuilder'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const bundle = JSON.parse(text)
      const result = await $fetch('/api/presentations/import', { method: 'POST', body: bundle }) as any
      navigateTo(`/editor/${result.id}`)
    } catch {
      alert('Erro ao importar arquivo.')
    }
  }
  input.click()
}

async function deletePresentation(id: string) {
  if (!confirm('Deletar esta apresentação?')) return
  await $fetch(`/api/presentations/${id}`, { method: 'DELETE' })
  refresh()
}

async function toggleVisibility(p: any) {
  const newVis = p.visibility === 'public' ? 'private' : 'public'
  await $fetch(`/api/presentations/${p.id}`, { method: 'PUT', body: { visibility: newVis } })
  refresh()
}
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>Minhas Apresentações</h1>
      <div class="actions">
        <button class="btn-primary" @click="createPresentation"><Plus :size="14" /> Nova</button>
        <button class="btn-import" @click="importPresentation"><Upload :size="14" /> Importar</button>
      </div>
    </header>

    <div class="grid" v-if="presentations?.length">
      <div v-for="p in presentations" :key="p.id" class="card">
        <NuxtLink :to="`/editor/${p.id}`" class="card-body">
          <h3>{{ p.title }}</h3>
          <p class="meta">{{ p.slide_count || 0 }} slides · {{ new Date(p.updated_at).toLocaleDateString('pt-BR') }}</p>
        </NuxtLink>
        <div class="card-actions">
          <button class="btn-vis" @click.stop="toggleVisibility(p)" :title="p.visibility === 'public' ? 'Pública' : 'Privada'">
            <Globe v-if="p.visibility === 'public'" :size="15" class="icon-public" />
            <Lock v-else :size="15" class="icon-private" />
          </button>
          <button class="btn-delete" @click.stop="deletePresentation(p.id)"><Trash2 :size="16" /></button>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <p>Nenhuma apresentação ainda.</p>
      <button class="btn-primary" @click="createPresentation">Criar primeira</button>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; gap: 8px; }
.header h1 { font-size: 24px; }
.actions { display: flex; gap: 8px; }
.btn-primary { background: #e94560; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.btn-primary:hover { background: #d63851; }
.btn-import { background: rgba(255,255,255,0.08); color: #e6edf3; border: 1px solid #30363d; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.btn-import:hover { background: rgba(255,255,255,0.15); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; display: flex; align-items: center; }
.card-body { flex: 1; padding: 20px; }
.card-body h3 { font-size: 16px; margin-bottom: 4px; }
.meta { font-size: 12px; color: #8b949e; }
.card-actions { display: flex; flex-direction: column; gap: 2px; padding: 4px; }
.btn-vis { background: none; border: none; padding: 8px; cursor: pointer; color: #484f58; display: flex; align-items: center; }
.btn-vis:hover { color: #e6edf3; }
.icon-public { color: #3fb950; }
.icon-private { color: #8b949e; }
.btn-delete { background: none; border: none; padding: 8px; cursor: pointer; color: #484f58; display: flex; align-items: center; }
.btn-delete:hover { color: #f85149; }
.empty { text-align: center; padding: 80px 0; color: #8b949e; }
.empty .btn-primary { margin-top: 16px; }
</style>
```

- [ ] **Step 2: Replace index.vue with landing page**

Replace `pages/index.vue`:

```vue
<script setup lang="ts">
import { LogIn } from 'lucide-vue-next'

const { isLoggedIn, login } = useAuth()

onMounted(() => {
  if (isLoggedIn.value) {
    navigateTo('/dashboard')
  }
})
</script>

<template>
  <div class="landing">
    <div class="hero">
      <h1>Slide Builder</h1>
      <p class="subtitle">Crie apresentações profissionais com facilidade.</p>
      <button v-if="!isLoggedIn" class="btn-login" @click="login">
        <LogIn :size="16" /> Entrar com GitHub
      </button>
      <NuxtLink v-else to="/dashboard" class="btn-login">Ir para Dashboard</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.landing { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 52px); }
.hero { text-align: center; }
.hero h1 { font-size: 48px; font-weight: 700; margin-bottom: 12px; }
.subtitle { font-size: 18px; color: #8b949e; margin-bottom: 32px; }
.btn-login { background: #238636; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; display: inline-flex; align-items: center; gap: 8px; }
.btn-login:hover { background: #2ea043; }
</style>
```

- [ ] **Step 3: Update EditorToolbar.vue — link back to /dashboard instead of /**

In `components/editor/EditorToolbar.vue`, change the "Voltar" link:

```
Old: <NuxtLink to="/" class="back">
New: <NuxtLink to="/dashboard" class="back">
```

- [ ] **Step 4: Commit**

```bash
git add pages/ components/editor/EditorToolbar.vue
git commit -m "feat: landing page, dashboard with visibility toggle"
```

---

### Task 12: Public profile page

**Files:**
- Create: `pages/u/[username].vue`

- [ ] **Step 1: Create public profile page**

Create `pages/u/[username].vue`:

```vue
<script setup lang="ts">
const route = useRoute()
const username = route.params.username as string

const { data: user, error: userError } = useFetch(`/api/users/${username}`)
const { data: presentations } = useFetch(`/api/users/${username}/presentations`)
</script>

<template>
  <div class="container" v-if="user">
    <div class="profile">
      <img :src="user.avatar_url" :alt="user.name" class="profile-avatar" />
      <div>
        <h1 class="profile-name">{{ user.name }}</h1>
        <p class="profile-username">@{{ user.username }}</p>
      </div>
    </div>

    <h2 class="section-title">Apresentações</h2>

    <div class="grid" v-if="presentations?.length">
      <NuxtLink v-for="p in presentations" :key="p.id" :to="`/present/${p.id}`" class="card">
        <h3>{{ p.title }}</h3>
        <p class="meta">{{ p.slide_count || 0 }} slides · {{ new Date(p.updated_at).toLocaleDateString('pt-BR') }}</p>
      </NuxtLink>
    </div>

    <p v-else class="empty">Nenhuma apresentação pública.</p>
  </div>

  <div class="container" v-else-if="userError">
    <div class="not-found">
      <h1>Usuário não encontrado</h1>
      <NuxtLink to="/" class="back-link">Voltar</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
.profile { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; }
.profile-avatar { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #30363d; }
.profile-name { font-size: 24px; font-weight: 700; }
.profile-username { font-size: 14px; color: #8b949e; }
.section-title { font-size: 18px; margin-bottom: 20px; color: #8b949e; font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; transition: border-color 0.2s; }
.card:hover { border-color: #e94560; }
.card h3 { font-size: 16px; margin-bottom: 4px; }
.meta { font-size: 12px; color: #8b949e; }
.empty { color: #8b949e; text-align: center; padding: 40px 0; }
.not-found { text-align: center; padding: 80px 0; }
.back-link { color: #e94560; margin-top: 16px; display: inline-block; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add pages/u/
git commit -m "feat: public profile page at /u/[username]"
```

---

### Task 13: Editor and presenter auth guards

**Files:**
- Modify: `pages/editor/[id].vue`
- Modify: `pages/presenter/[id].vue`

- [ ] **Step 1: Add auth middleware to editor**

Add at the top of `<script setup>` in `pages/editor/[id].vue`:

```typescript
definePageMeta({ middleware: 'auth' })
```

- [ ] **Step 2: Add auth middleware to presenter**

Add at the top of `<script setup>` in `pages/presenter/[id].vue`:

```typescript
definePageMeta({ middleware: 'auth' })
```

- [ ] **Step 3: Commit**

```bash
git add pages/editor/ pages/presenter/
git commit -m "feat: auth guard on editor and presenter pages"
```

---

### Task 14: Build, verify, and push

- [ ] **Step 1: Build the project**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
npx nuxt build 2>&1 | tail -10
```

Expected: `✨ Build complete!`

- [ ] **Step 2: Fix any build errors**

If there are type errors or build issues, fix them.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "fix: build fixes for auth integration"
```

- [ ] **Step 4: Push to master**

```bash
git push origin master
```

- [ ] **Step 5: Remind user to set env vars on Vercel**

The user needs to add these env vars to Vercel:
- `NUXT_OAUTH_GITHUB_CLIENT_ID`
- `NUXT_OAUTH_GITHUB_CLIENT_SECRET`
- `NUXT_SESSION_PASSWORD` (generate with `openssl rand -base64 32`)

And create a GitHub OAuth App at https://github.com/settings/developers with:
- Homepage URL: `https://slide-builder-teal.vercel.app`
- Callback URL: `https://slide-builder-teal.vercel.app/auth/github`
