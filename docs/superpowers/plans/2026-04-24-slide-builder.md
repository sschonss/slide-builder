# Slide Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal Nuxt 3 web app that provides a visual editor for creating Slidev-based presentations with consistent branding.

**Architecture:** Nuxt 3 SPA with SQLite storage (better-sqlite3). Editor UI with 3-panel layout (slide list, preview, properties). Each edit regenerates a Slidev-compatible markdown file. Slidev dev server runs in background for live preview via iframe. PDF export via Slidev CLI.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, SQLite (better-sqlite3), Slidev CLI, Vitest, vuedraggable-plus (drag-and-drop), @vueuse/core

---

## File Structure

```
slide-builder/
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── app.vue
├── types/
│   └── index.ts                    # All TypeScript interfaces
├── pages/
│   ├── index.vue                   # Home — list presentations
│   └── editor/[id].vue             # Editor page
├── components/
│   ├── editor/
│   │   ├── SlideList.vue           # Left sidebar
│   │   ├── SlidePreview.vue        # Center preview panel
│   │   ├── SlideProperties.vue     # Right properties panel
│   │   ├── TemplateSelector.vue    # Template picker modal
│   │   └── EditorToolbar.vue       # Top toolbar
│   ├── templates/
│   │   ├── CoverFields.vue
│   │   ├── SectionFields.vue
│   │   ├── ContentFields.vue
│   │   ├── DiagramFields.vue
│   │   ├── CodeFields.vue
│   │   └── ComparisonFields.vue
│   └── theme/
│       └── ThemeEditor.vue
├── composables/
│   ├── usePresentation.ts
│   ├── useSlides.ts
│   ├── useTheme.ts
│   └── useMarkdownGenerator.ts
├── server/
│   ├── api/
│   │   ├── presentations/
│   │   │   ├── index.get.ts        # List all
│   │   │   ├── index.post.ts       # Create
│   │   │   ├── [id].get.ts         # Get one
│   │   │   ├── [id].put.ts         # Update
│   │   │   └── [id].delete.ts      # Delete
│   │   ├── slides/
│   │   │   ├── index.get.ts        # List by presentation_id
│   │   │   ├── index.post.ts       # Create
│   │   │   ├── [id].put.ts         # Update
│   │   │   ├── [id].delete.ts      # Delete
│   │   │   └── reorder.put.ts      # Reorder slides
│   │   ├── themes/
│   │   │   ├── index.get.ts        # List all
│   │   │   ├── index.post.ts       # Create
│   │   │   ├── [id].get.ts         # Get one
│   │   │   └── [id].put.ts         # Update
│   │   ├── assets/
│   │   │   └── upload.post.ts      # Upload file
│   │   ├── generate.post.ts        # Generate markdown
│   │   └── export.post.ts          # Export PDF
│   ├── utils/
│   │   ├── db.ts                   # SQLite connection + init
│   │   └── markdown.ts             # Markdown generator logic
│   └── plugins/
│       └── database.ts             # Auto-run migrations on startup
├── data/                           # Created at runtime
│   ├── database.sqlite
│   └── assets/
├── output/                         # Generated presentations
└── tests/
    ├── server/
    │   ├── db.test.ts
    │   └── markdown.test.ts
    └── components/
        └── (component tests as needed)
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `app.vue`, `.gitignore`

- [ ] **Step 1: Initialize Nuxt 3 project**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
npx nuxi@latest init . --force --packageManager npm
```

Accept defaults. This creates `package.json`, `nuxt.config.ts`, `tsconfig.json`, `app.vue`.

- [ ] **Step 2: Install dependencies**

```bash
npm install better-sqlite3 uuid
npm install -D @types/better-sqlite3 @types/uuid vitest @nuxt/test-utils @vue/test-utils happy-dom @slidev/cli vuedraggable-plus @vueuse/core
```

- [ ] **Step 3: Configure nuxt.config.ts**

Replace `nuxt.config.ts` with:

```ts
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  ssr: false,
  modules: [],
  nitro: {
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

- [ ] **Step 4: Configure vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
.nuxt/
.output/
data/
output/
dist/
*.sqlite
.DS_Store
.superpowers/
```

- [ ] **Step 6: Create runtime directories**

```bash
mkdir -p data/assets output tests/server tests/components
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Nuxt 3 project with deps

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Define all interfaces**

Create `types/index.ts`:

```ts
export type SlideTemplate = 'cover' | 'section' | 'content' | 'diagram' | 'code' | 'comparison'

export interface CoverData {
  title: string
  subtitle: string
  author: string
  logo?: string
  background_image?: string
}

export interface SectionData {
  section_number?: string
  title: string
  accent_color?: string
}

export interface ContentData {
  title: string
  bullets: string[]
  quote?: string
  image?: string
}

export interface DiagramData {
  title: string
  diagram_type: 'mermaid' | 'image' | 'embed'
  mermaid_code?: string
  image?: string
  embed_url?: string
  caption?: string
}

export interface CodeData {
  title: string
  code: string
  language: string
  note?: string
  highlight_lines?: string
}

export interface ComparisonData {
  title: string
  left_title: string
  left_items: string[]
  right_title: string
  right_items: string[]
  style: 'columns' | 'table'
}

export type SlideData = CoverData | SectionData | ContentData | DiagramData | CodeData | ComparisonData

export interface Slide {
  id: string
  presentation_id: string
  order: number
  template: SlideTemplate
  data: SlideData
  notes?: string
}

export interface ThemeConfig {
  colors: {
    background: string
    primary: string
    secondary: string
    text: string
  }
  fonts: {
    heading: string
    body: string
    code: string
  }
  logo?: string
  codeTheme: string
}

export interface Theme {
  id: string
  name: string
  config: ThemeConfig
}

export interface Presentation {
  id: string
  title: string
  theme_id: string
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  presentation_id: string
  filename: string
  path: string
  type: 'image' | 'video' | 'logo'
}
```

- [ ] **Step 2: Commit**

```bash
git add types/
git commit -m "feat: add TypeScript type definitions

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Database Setup

**Files:**
- Create: `server/utils/db.ts`, `server/plugins/database.ts`, `tests/server/db.test.ts`

- [ ] **Step 1: Write database test**

Create `tests/server/db.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createTables, seedDefaultTheme } from '../helpers/db-helpers'

// Test helper that mirrors server/utils/db.ts logic
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
```

- [ ] **Step 2: Create test helpers**

Create `tests/helpers/db-helpers.ts`:

```ts
import type Database from 'better-sqlite3'

export function createTables(db: Database.Database) {
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/server/db.test.ts
```

Expected: FAIL — module `../helpers/db-helpers` works but the test validates the SQL logic.

- [ ] **Step 4: Create server/utils/db.ts**

```ts
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
```

- [ ] **Step 5: Create server/plugins/database.ts**

```ts
import { initDb } from '../utils/db'
import { mkdirSync } from 'fs'
import { join } from 'path'

export default defineNitroPlugin(() => {
  mkdirSync(join(process.cwd(), 'data', 'assets'), { recursive: true })
  mkdirSync(join(process.cwd(), 'output'), { recursive: true })
  initDb()
  console.log('[slide-builder] Database initialized')
})
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run tests/server/db.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server/utils/db.ts server/plugins/database.ts tests/ types/
git commit -m "feat: SQLite database setup with migrations and default theme

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Theme API

**Files:**
- Create: `server/api/themes/index.get.ts`, `server/api/themes/index.post.ts`, `server/api/themes/[id].get.ts`, `server/api/themes/[id].put.ts`

- [ ] **Step 1: Create GET /api/themes**

Create `server/api/themes/index.get.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler(() => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM themes ORDER BY name').all() as any[]
  return rows.map(row => ({
    ...row,
    config: JSON.parse(row.config),
  }))
})
```

- [ ] **Step 2: Create POST /api/themes**

Create `server/api/themes/index.post.ts`:

```ts
import { getDb } from '../../utils/db'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()
  const id = uuid()

  db.prepare('INSERT INTO themes (id, name, config) VALUES (?, ?, ?)').run(
    id,
    body.name,
    JSON.stringify(body.config)
  )

  return { id, name: body.name, config: body.config }
})
```

- [ ] **Step 3: Create GET /api/themes/:id**

Create `server/api/themes/[id].get.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()
  const row = db.prepare('SELECT * FROM themes WHERE id = ?').get(id) as any

  if (!row) throw createError({ statusCode: 404, message: 'Theme not found' })

  return { ...row, config: JSON.parse(row.config) }
})
```

- [ ] **Step 4: Create PUT /api/themes/:id**

Create `server/api/themes/[id].put.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = getDb()

  db.prepare('UPDATE themes SET name = ?, config = ? WHERE id = ?').run(
    body.name,
    JSON.stringify(body.config),
    id
  )

  return { id, name: body.name, config: body.config }
})
```

- [ ] **Step 5: Verify with dev server**

```bash
npx nuxt dev &
sleep 5
curl -s http://localhost:3000/api/themes | head -c 200
```

Expected: JSON array with the default "dark" theme.

- [ ] **Step 6: Commit**

```bash
git add server/api/themes/
git commit -m "feat: theme CRUD API endpoints

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Presentation API

**Files:**
- Create: `server/api/presentations/index.get.ts`, `index.post.ts`, `[id].get.ts`, `[id].put.ts`, `[id].delete.ts`

- [ ] **Step 1: Create GET /api/presentations**

Create `server/api/presentations/index.get.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler(() => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT p.*, COUNT(s.id) as slide_count
    FROM presentations p
    LEFT JOIN slides s ON s.presentation_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `).all()
  return rows
})
```

- [ ] **Step 2: Create POST /api/presentations**

Create `server/api/presentations/index.post.ts`:

```ts
import { getDb } from '../../utils/db'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()

  const theme = db.prepare('SELECT id FROM themes LIMIT 1').get() as any
  if (!theme) throw createError({ statusCode: 500, message: 'No theme available' })

  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO presentations (id, title, theme_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, body.title || 'Nova Apresentação', body.theme_id || theme.id, now, now)

  // Create a default cover slide
  const slideId = uuid()
  const coverData = JSON.stringify({
    title: body.title || 'Nova Apresentação',
    subtitle: '',
    author: 'Luiz Schons',
  })
  db.prepare(
    'INSERT INTO slides (id, presentation_id, "order", template, data) VALUES (?, ?, 0, \'cover\', ?)'
  ).run(slideId, id, coverData)

  return { id, title: body.title || 'Nova Apresentação', theme_id: body.theme_id || theme.id, created_at: now, updated_at: now }
})
```

- [ ] **Step 3: Create GET /api/presentations/:id**

Create `server/api/presentations/[id].get.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()

  const presentation = db.prepare('SELECT * FROM presentations WHERE id = ?').get(id) as any
  if (!presentation) throw createError({ statusCode: 404, message: 'Presentation not found' })

  const slides = db.prepare(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
  ).all(id) as any[]

  const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(presentation.theme_id) as any

  return {
    ...presentation,
    slides: slides.map(s => ({ ...s, data: JSON.parse(s.data) })),
    theme: theme ? { ...theme, config: JSON.parse(theme.config) } : null,
  }
})
```

- [ ] **Step 4: Create PUT /api/presentations/:id**

Create `server/api/presentations/[id].put.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = getDb()

  const fields: string[] = []
  const values: any[] = []

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title) }
  if (body.theme_id !== undefined) { fields.push('theme_id = ?'); values.push(body.theme_id) }

  fields.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE presentations SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  return { success: true }
})
```

- [ ] **Step 5: Create DELETE /api/presentations/:id**

Create `server/api/presentations/[id].delete.ts`:

```ts
import { getDb } from '../../utils/db'
import { rmSync } from 'fs'
import { join } from 'path'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()

  db.prepare('DELETE FROM presentations WHERE id = ?').run(id)

  // Clean up output files
  try {
    rmSync(join(process.cwd(), 'output', id!), { recursive: true, force: true })
  } catch {}

  return { success: true }
})
```

- [ ] **Step 6: Commit**

```bash
git add server/api/presentations/
git commit -m "feat: presentation CRUD API endpoints

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Slide API

**Files:**
- Create: `server/api/slides/index.get.ts`, `index.post.ts`, `[id].put.ts`, `[id].delete.ts`, `reorder.put.ts`

- [ ] **Step 1: Create GET /api/slides?presentation_id=X**

Create `server/api/slides/index.get.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const presentationId = query.presentation_id as string
  if (!presentationId) throw createError({ statusCode: 400, message: 'presentation_id required' })

  const db = getDb()
  const rows = db.prepare(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
  ).all(presentationId) as any[]

  return rows.map(r => ({ ...r, data: JSON.parse(r.data) }))
})
```

- [ ] **Step 2: Create POST /api/slides**

Create `server/api/slides/index.post.ts`:

```ts
import { getDb } from '../../utils/db'
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
  const db = getDb()

  // Get next order number
  const last = db.prepare(
    'SELECT MAX("order") as max_order FROM slides WHERE presentation_id = ?'
  ).get(body.presentation_id) as any
  const order = (last?.max_order ?? -1) + 1

  const id = uuid()
  const template = body.template || 'content'
  const data = body.data || DEFAULT_DATA[template] || {}

  db.prepare(
    'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, body.presentation_id, order, template, JSON.stringify(data), body.notes || null)

  // Touch presentation updated_at
  db.prepare("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?").run(body.presentation_id)

  return { id, presentation_id: body.presentation_id, order, template, data, notes: body.notes || null }
})
```

- [ ] **Step 3: Create PUT /api/slides/:id**

Create `server/api/slides/[id].put.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = getDb()

  const fields: string[] = []
  const values: any[] = []

  if (body.template !== undefined) { fields.push('template = ?'); values.push(body.template) }
  if (body.data !== undefined) { fields.push('data = ?'); values.push(JSON.stringify(body.data)) }
  if (body.notes !== undefined) { fields.push('notes = ?'); values.push(body.notes) }

  if (fields.length === 0) return { success: true }

  values.push(id)
  db.prepare(`UPDATE slides SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  // Touch presentation updated_at
  const slide = db.prepare('SELECT presentation_id FROM slides WHERE id = ?').get(id) as any
  if (slide) {
    db.prepare("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?").run(slide.presentation_id)
  }

  return { success: true }
})
```

- [ ] **Step 4: Create DELETE /api/slides/:id**

Create `server/api/slides/[id].delete.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()

  const slide = db.prepare('SELECT presentation_id FROM slides WHERE id = ?').get(id) as any
  db.prepare('DELETE FROM slides WHERE id = ?').run(id)

  if (slide) {
    // Reorder remaining slides
    const remaining = db.prepare(
      'SELECT id FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
    ).all(slide.presentation_id) as any[]

    const update = db.prepare('UPDATE slides SET "order" = ? WHERE id = ?')
    remaining.forEach((s: any, i: number) => update.run(i, s.id))

    db.prepare("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?").run(slide.presentation_id)
  }

  return { success: true }
})
```

- [ ] **Step 5: Create PUT /api/slides/reorder**

Create `server/api/slides/reorder.put.ts`:

```ts
import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // body.slides = [{ id: 'slide-uuid', order: 0 }, { id: 'slide-uuid', order: 1 }, ...]
  const db = getDb()

  const update = db.prepare('UPDATE slides SET "order" = ? WHERE id = ?')
  const runAll = db.transaction((slides: { id: string; order: number }[]) => {
    for (const s of slides) {
      update.run(s.order, s.id)
    }
  })

  runAll(body.slides)
  return { success: true }
})
```

- [ ] **Step 6: Commit**

```bash
git add server/api/slides/
git commit -m "feat: slide CRUD + reorder API endpoints

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Asset Upload API

**Files:**
- Create: `server/api/assets/upload.post.ts`

- [ ] **Step 1: Create POST /api/assets/upload**

Create `server/api/assets/upload.post.ts`:

```ts
import { getDb } from '../../utils/db'
import { v4 as uuid } from 'uuid'
import { writeFileSync, mkdirSync } from 'fs'
import { join, extname } from 'path'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = form.find(f => f.name === 'file')
  const presentationId = form.find(f => f.name === 'presentation_id')?.data?.toString()
  const fileType = form.find(f => f.name === 'type')?.data?.toString() || 'image'

  if (!file || !file.data || !presentationId) {
    throw createError({ statusCode: 400, message: 'file and presentation_id required' })
  }

  const db = getDb()
  const id = uuid()
  const ext = extname(file.filename || '.png')
  const filename = `${id}${ext}`
  const dir = join(process.cwd(), 'data', 'assets', presentationId)
  mkdirSync(dir, { recursive: true })

  const filePath = join(dir, filename)
  writeFileSync(filePath, file.data)

  const relativePath = `data/assets/${presentationId}/${filename}`

  db.prepare(
    'INSERT INTO assets (id, presentation_id, filename, path, type) VALUES (?, ?, ?, ?, ?)'
  ).run(id, presentationId, file.filename || filename, relativePath, fileType)

  return { id, filename: file.filename, path: relativePath, type: fileType }
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/assets/
git commit -m "feat: asset upload API endpoint

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Markdown Generator

**Files:**
- Create: `server/utils/markdown.ts`, `tests/server/markdown.test.ts`, `server/api/generate.post.ts`, `server/api/export.post.ts`

- [ ] **Step 1: Write markdown generator test**

Create `tests/server/markdown.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateMarkdown } from '../../server/utils/markdown'
import type { Slide, ThemeConfig } from '../../types'

const theme: ThemeConfig = {
  colors: { background: '#1a1a2e', primary: '#e94560', secondary: '#533483', text: '#ffffff' },
  fonts: { heading: 'Inter', body: 'Inter', code: 'JetBrains Mono' },
  codeTheme: 'github-dark',
}

describe('generateMarkdown', () => {
  it('generates frontmatter for cover slide', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'cover',
      data: { title: 'My Talk', subtitle: 'Subtitle', author: 'Author' },
    }]
    const md = generateMarkdown('My Talk', slides, theme)
    expect(md).toContain('theme: default')
    expect(md).toContain('# My Talk')
    expect(md).toContain('Subtitle')
    expect(md).toContain('Author')
  })

  it('generates section slide', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'section',
      data: { title: 'Section Title', section_number: 'BLOCO 1' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('layout: section')
    expect(md).toContain('# Section Title')
  })

  it('generates content slide with bullets', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'content',
      data: { title: 'Content', bullets: ['Point A', 'Point B'], quote: 'A quote' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('# Content')
    expect(md).toContain('- Point A')
    expect(md).toContain('- Point B')
    expect(md).toContain('> A quote')
  })

  it('generates code slide', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'code',
      data: { title: 'Code Example', code: 'console.log("hi")', language: 'js', highlight_lines: '1' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('```js {1}')
    expect(md).toContain('console.log("hi")')
  })

  it('generates comparison slide with two-cols', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'comparison',
      data: { title: 'Vs', left_title: 'A', left_items: ['a1'], right_title: 'B', right_items: ['b1'], style: 'columns' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('layout: two-cols')
    expect(md).toContain('::left::')
    expect(md).toContain('::right::')
  })

  it('generates diagram slide with mermaid', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'diagram',
      data: { title: 'Architecture', diagram_type: 'mermaid', mermaid_code: 'graph TD\n  A-->B' },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('layout: center')
    expect(md).toContain('```mermaid')
    expect(md).toContain('A-->B')
  })

  it('separates slides with ---', () => {
    const slides: Slide[] = [
      { id: '1', presentation_id: 'p1', order: 0, template: 'cover', data: { title: 'T', subtitle: '', author: '' } },
      { id: '2', presentation_id: 'p1', order: 1, template: 'content', data: { title: 'C', bullets: ['x'] } },
    ]
    const md = generateMarkdown('Test', slides, theme)
    const separators = md.split('\n---\n').length - 1
    expect(separators).toBeGreaterThanOrEqual(1)
  })

  it('includes speaker notes', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'content',
      data: { title: 'T', bullets: ['x'] }, notes: 'Remember to mention X',
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('<!--')
    expect(md).toContain('Remember to mention X')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/server/markdown.test.ts
```

Expected: FAIL — `generateMarkdown` not found.

- [ ] **Step 3: Implement markdown generator**

Create `server/utils/markdown.ts`:

```ts
import type { Slide, ThemeConfig, CoverData, SectionData, ContentData, DiagramData, CodeData, ComparisonData } from '../../types'

export function generateMarkdown(title: string, slides: Slide[], theme: ThemeConfig): string {
  const parts: string[] = []

  slides.forEach((slide, index) => {
    if (index === 0 && slide.template === 'cover') {
      parts.push(generateCoverWithFrontmatter(slide, title, theme))
    } else {
      parts.push(generateSlide(slide))
    }
  })

  return parts.join('\n\n---\n\n')
}

function generateCoverWithFrontmatter(slide: Slide, title: string, theme: ThemeConfig): string {
  const data = slide.data as CoverData
  const lines = [
    '---',
    'theme: default',
    `title: "${title}"`,
    'class: text-center',
    'transition: slide-left',
    'mdc: true',
    '---',
    '',
    `# ${data.title || title}`,
  ]

  if (data.subtitle) lines.push(`## ${data.subtitle}`)
  if (data.author) lines.push('', data.author)
  if (slide.notes) lines.push('', '<!--', slide.notes, '-->')

  return lines.join('\n')
}

function generateSlide(slide: Slide): string {
  switch (slide.template) {
    case 'cover': return generateCover(slide)
    case 'section': return generateSection(slide)
    case 'content': return generateContent(slide)
    case 'diagram': return generateDiagram(slide)
    case 'code': return generateCode(slide)
    case 'comparison': return generateComparison(slide)
    default: return ''
  }
}

function generateCover(slide: Slide): string {
  const data = slide.data as CoverData
  const lines = ['---', 'layout: cover', '---', '', `# ${data.title}`]
  if (data.subtitle) lines.push(`## ${data.subtitle}`)
  if (data.author) lines.push('', data.author)
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateSection(slide: Slide): string {
  const data = slide.data as SectionData
  const lines = ['---', 'layout: section', '---', '']
  if (data.section_number) lines.push(`<p class="opacity-50 text-sm tracking-widest">${data.section_number}</p>`, '')
  lines.push(`# ${data.title}`)
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateContent(slide: Slide): string {
  const data = slide.data as ContentData
  const lines = ['---', 'layout: default', '---', '', `# ${data.title}`, '']
  if (data.bullets?.length) {
    data.bullets.forEach(b => lines.push(`- ${b}`))
  }
  if (data.quote) lines.push('', `> ${data.quote}`)
  if (data.image) lines.push('', `![](${data.image})`)
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateDiagram(slide: Slide): string {
  const data = slide.data as DiagramData
  const lines = ['---', 'layout: center', '---', '', `# ${data.title}`, '']

  if (data.diagram_type === 'mermaid' && data.mermaid_code) {
    lines.push('```mermaid', data.mermaid_code, '```')
  } else if (data.diagram_type === 'image' && data.image) {
    lines.push(`![${data.caption || ''}](${data.image})`)
  } else if (data.diagram_type === 'embed' && data.embed_url) {
    lines.push(`<iframe src="${data.embed_url}" class="w-full h-80" />`)
  }

  if (data.caption && data.diagram_type !== 'image') {
    lines.push('', `<p class="text-sm opacity-50">${data.caption}</p>`)
  }
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateCode(slide: Slide): string {
  const data = slide.data as CodeData
  const highlight = data.highlight_lines ? ` {${data.highlight_lines}}` : ''
  const lines = ['---', 'layout: default', '---', '', `# ${data.title}`, '']
  lines.push(`\`\`\`${data.language}${highlight}`, data.code, '```')
  if (data.note) lines.push('', `<p class="text-sm opacity-60 mt-2">${data.note}</p>`)
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function generateComparison(slide: Slide): string {
  const data = slide.data as ComparisonData
  const lines = ['---', 'layout: two-cols', '---', '', `# ${data.title}`, '', '::left::', '']
  lines.push(`### ${data.left_title}`, '')
  data.left_items.forEach(item => lines.push(`- ${item}`))
  lines.push('', '::right::', '')
  lines.push(`### ${data.right_title}`, '')
  data.right_items.forEach(item => lines.push(`- ${item}`))
  appendNotes(lines, slide.notes)
  return lines.join('\n')
}

function appendNotes(lines: string[], notes?: string) {
  if (notes) lines.push('', '<!--', notes, '-->')
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/server/markdown.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Create POST /api/generate**

Create `server/api/generate.post.ts`:

```ts
import { getDb } from '../utils/db'
import { generateMarkdown } from '../utils/markdown'
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { ThemeConfig } from '../../types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()

  const presentation = db.prepare('SELECT * FROM presentations WHERE id = ?').get(body.presentation_id) as any
  if (!presentation) throw createError({ statusCode: 404, message: 'Presentation not found' })

  const slides = db.prepare(
    'SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
  ).all(body.presentation_id) as any[]

  const theme = db.prepare('SELECT * FROM themes WHERE id = ?').get(presentation.theme_id) as any
  const themeConfig: ThemeConfig = theme ? JSON.parse(theme.config) : {
    colors: { background: '#1a1a2e', primary: '#e94560', secondary: '#533483', text: '#ffffff' },
    fonts: { heading: 'Inter', body: 'Inter', code: 'JetBrains Mono' },
    codeTheme: 'github-dark',
  }

  const parsedSlides = slides.map((s: any) => ({ ...s, data: JSON.parse(s.data) }))
  const markdown = generateMarkdown(presentation.title, parsedSlides, themeConfig)

  // Write to output directory
  const outDir = join(process.cwd(), 'output', body.presentation_id)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'slides.md'), markdown, 'utf-8')

  // Copy assets
  const assets = db.prepare('SELECT * FROM assets WHERE presentation_id = ?').all(body.presentation_id) as any[]
  if (assets.length > 0) {
    const assetsDir = join(outDir, 'assets')
    mkdirSync(assetsDir, { recursive: true })
    for (const asset of assets) {
      const src = join(process.cwd(), asset.path)
      if (existsSync(src)) {
        copyFileSync(src, join(assetsDir, asset.filename))
      }
    }
  }

  return { success: true, path: join(outDir, 'slides.md'), markdown }
})
```

- [ ] **Step 6: Create POST /api/export**

Create `server/api/export.post.ts`:

```ts
import { execSync } from 'child_process'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const outDir = join(process.cwd(), 'output', body.presentation_id)
  const slidesPath = join(outDir, 'slides.md')

  if (!existsSync(slidesPath)) {
    throw createError({ statusCode: 400, message: 'Generate markdown first' })
  }

  try {
    const slidevBin = resolve(process.cwd(), 'node_modules/.bin/slidev')
    execSync(`${slidevBin} export "${slidesPath}" --output "${join(outDir, 'export.pdf')}"`, {
      cwd: outDir,
      timeout: 60000,
    })
    return { success: true, path: join(outDir, 'export.pdf') }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: `Export failed: ${err.message}` })
  }
})
```

- [ ] **Step 7: Commit**

```bash
git add server/utils/markdown.ts server/api/generate.post.ts server/api/export.post.ts tests/server/markdown.test.ts
git commit -m "feat: markdown generator + generate/export API endpoints

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Home Page

**Files:**
- Create: `pages/index.vue`, `app.vue` (replace default)

- [ ] **Step 1: Create app.vue**

Replace `app.vue`:

```vue
<template>
  <NuxtPage />
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

- [ ] **Step 2: Create home page**

Create `pages/index.vue`:

```vue
<script setup lang="ts">
const { data: presentations, refresh } = useFetch('/api/presentations')

async function createPresentation() {
  const title = prompt('Nome da apresentação:')
  if (!title) return
  const result = await $fetch('/api/presentations', { method: 'POST', body: { title } })
  navigateTo(`/editor/${(result as any).id}`)
}

async function deletePresentation(id: string) {
  if (!confirm('Deletar esta apresentação?')) return
  await $fetch(`/api/presentations/${id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>📊 Slide Builder</h1>
      <button class="btn-primary" @click="createPresentation">+ Nova Apresentação</button>
    </header>

    <div class="grid" v-if="presentations?.length">
      <div v-for="p in presentations" :key="p.id" class="card">
        <NuxtLink :to="`/editor/${p.id}`" class="card-body">
          <h3>{{ p.title }}</h3>
          <p class="meta">{{ p.slide_count || 0 }} slides · {{ new Date(p.updated_at).toLocaleDateString('pt-BR') }}</p>
        </NuxtLink>
        <button class="btn-delete" @click.stop="deletePresentation(p.id)">🗑</button>
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
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.header h1 { font-size: 24px; }
.btn-primary { background: #e94560; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #d63851; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; display: flex; align-items: center; }
.card-body { flex: 1; padding: 20px; }
.card-body h3 { font-size: 16px; margin-bottom: 4px; }
.meta { font-size: 12px; color: #8b949e; }
.btn-delete { background: none; border: none; padding: 12px; cursor: pointer; font-size: 16px; opacity: 0.4; }
.btn-delete:hover { opacity: 1; }
.empty { text-align: center; padding: 80px 0; color: #8b949e; }
.empty .btn-primary { margin-top: 16px; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add app.vue pages/
git commit -m "feat: home page with presentation list and create

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Editor Page Layout

**Files:**
- Create: `pages/editor/[id].vue`, `components/editor/EditorToolbar.vue`

- [ ] **Step 1: Create editor toolbar**

Create `components/editor/EditorToolbar.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{ title: string; slideIndex: number; totalSlides: number }>()
const emit = defineEmits<{
  (e: 'present'): void
  (e: 'export'): void
  (e: 'openTheme'): void
  (e: 'navigate', direction: 'prev' | 'next'): void
}>()

const exporting = ref(false)

async function handleExport() {
  exporting.value = true
  emit('export')
  setTimeout(() => { exporting.value = false }, 3000)
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <NuxtLink to="/" class="back">← Voltar</NuxtLink>
      <span class="title">{{ title }}</span>
    </div>
    <div class="toolbar-center">
      <button class="nav-btn" @click="emit('navigate', 'prev')" :disabled="slideIndex <= 0">←</button>
      <span class="slide-count">{{ slideIndex + 1 }} / {{ totalSlides }}</span>
      <button class="nav-btn" @click="emit('navigate', 'next')" :disabled="slideIndex >= totalSlides - 1">→</button>
    </div>
    <div class="toolbar-right">
      <button class="btn" @click="emit('present')">▶ Apresentar</button>
      <button class="btn" @click="handleExport" :disabled="exporting">📄 {{ exporting ? 'Exportando...' : 'PDF' }}</button>
      <button class="btn" @click="emit('openTheme')">🎨 Tema</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; padding: 8px 16px; background: #161b22; border-bottom: 1px solid #30363d; gap: 12px; }
.toolbar-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.toolbar-center { display: flex; align-items: center; gap: 8px; }
.toolbar-right { display: flex; gap: 8px; flex: 1; justify-content: flex-end; }
.back { font-size: 13px; color: #8b949e; }
.back:hover { color: #e6edf3; }
.title { font-size: 14px; font-weight: 600; }
.slide-count { font-size: 12px; color: #8b949e; min-width: 50px; text-align: center; }
.btn, .nav-btn { background: rgba(255,255,255,0.08); color: #e6edf3; border: 1px solid #30363d; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn:hover, .nav-btn:hover { background: rgba(255,255,255,0.15); }
.btn:disabled, .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
```

- [ ] **Step 2: Create editor page**

Create `pages/editor/[id].vue`:

```vue
<script setup lang="ts">
import type { Slide } from '~/types'

const route = useRoute()
const presentationId = route.params.id as string

const { data: presentation, refresh } = useFetch(`/api/presentations/${presentationId}`)
const currentSlideIndex = ref(0)
const showThemeEditor = ref(false)

const slides = computed(() => presentation.value?.slides || [])
const currentSlide = computed(() => slides.value[currentSlideIndex.value])

function navigateSlide(direction: 'prev' | 'next') {
  if (direction === 'prev' && currentSlideIndex.value > 0) currentSlideIndex.value--
  if (direction === 'next' && currentSlideIndex.value < slides.value.length - 1) currentSlideIndex.value++
}

function selectSlide(index: number) {
  currentSlideIndex.value = index
}

async function addSlide(template: string) {
  await $fetch('/api/slides', {
    method: 'POST',
    body: { presentation_id: presentationId, template },
  })
  await refresh()
  currentSlideIndex.value = slides.value.length - 1
}

async function updateSlide(slideId: string, updates: Partial<Slide>) {
  await $fetch(`/api/slides/${slideId}`, { method: 'PUT', body: updates })
  await refresh()
}

async function deleteSlide(slideId: string) {
  if (slides.value.length <= 1) return
  await $fetch(`/api/slides/${slideId}`, { method: 'DELETE' })
  if (currentSlideIndex.value >= slides.value.length - 1) {
    currentSlideIndex.value = Math.max(0, currentSlideIndex.value - 1)
  }
  await refresh()
}

async function reorderSlides(newOrder: { id: string; order: number }[]) {
  await $fetch('/api/slides/reorder', { method: 'PUT', body: { slides: newOrder } })
  await refresh()
}

async function handlePresent() {
  await $fetch('/api/generate', { method: 'POST', body: { presentation_id: presentationId } })
  // Slidev preview would open here — placeholder for now
  alert('Markdown gerado! Slidev integration coming soon.')
}

async function handleExport() {
  await $fetch('/api/generate', { method: 'POST', body: { presentation_id: presentationId } })
  try {
    await $fetch('/api/export', { method: 'POST', body: { presentation_id: presentationId } })
    alert('PDF exportado com sucesso!')
  } catch (err: any) {
    alert('Erro ao exportar: ' + err.message)
  }
}
</script>

<template>
  <div class="editor" v-if="presentation">
    <EditorToolbar
      :title="presentation.title"
      :slide-index="currentSlideIndex"
      :total-slides="slides.length"
      @present="handlePresent"
      @export="handleExport"
      @open-theme="showThemeEditor = true"
      @navigate="navigateSlide"
    />

    <div class="editor-body">
      <!-- Left: Slide List -->
      <div class="panel-left">
        <EditorSlideList
          :slides="slides"
          :current-index="currentSlideIndex"
          @select="selectSlide"
          @add="addSlide"
          @delete="deleteSlide"
          @reorder="reorderSlides"
        />
      </div>

      <!-- Center: Preview -->
      <div class="panel-center">
        <EditorSlidePreview
          v-if="currentSlide"
          :slide="currentSlide"
          :theme="presentation.theme?.config"
        />
      </div>

      <!-- Right: Properties -->
      <div class="panel-right">
        <EditorSlideProperties
          v-if="currentSlide"
          :slide="currentSlide"
          :presentation-id="presentationId"
          @update="(updates) => updateSlide(currentSlide.id, updates)"
        />
      </div>
    </div>

    <!-- Theme Editor Modal -->
    <ThemeThemeEditor
      v-if="showThemeEditor && presentation.theme"
      :theme="presentation.theme"
      @close="showThemeEditor = false"
      @saved="refresh()"
    />
  </div>
</template>

<style scoped>
.editor { display: flex; flex-direction: column; height: 100vh; }
.editor-body { display: flex; flex: 1; overflow: hidden; }
.panel-left { width: 160px; background: #0d1117; border-right: 1px solid #30363d; overflow-y: auto; flex-shrink: 0; }
.panel-center { flex: 1; display: flex; align-items: center; justify-content: center; background: #1a1a2e; padding: 24px; }
.panel-right { width: 300px; background: #0d1117; border-left: 1px solid #30363d; overflow-y: auto; flex-shrink: 0; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add pages/editor/ components/editor/EditorToolbar.vue
git commit -m "feat: editor page layout with 3-panel structure + toolbar

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 11: SlideList Component

**Files:**
- Create: `components/editor/SlideList.vue`, `components/editor/TemplateSelector.vue`

- [ ] **Step 1: Create TemplateSelector**

Create `components/editor/TemplateSelector.vue`:

```vue
<script setup lang="ts">
const emit = defineEmits<{ (e: 'select', template: string): void; (e: 'close'): void }>()

const templates = [
  { id: 'cover', name: 'Cover', icon: '📌', desc: 'Slide de abertura' },
  { id: 'section', name: 'Section', icon: '📑', desc: 'Divisor de bloco' },
  { id: 'content', name: 'Content', icon: '📝', desc: 'Bullets + quote' },
  { id: 'diagram', name: 'Diagram', icon: '📊', desc: 'Mermaid / imagem' },
  { id: 'code', name: 'Code', icon: '💻', desc: 'Código com highlight' },
  { id: 'comparison', name: 'Comparison', icon: '⚖️', desc: 'Lado a lado' },
]
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <h3>Escolha um template</h3>
      <div class="grid">
        <button v-for="t in templates" :key="t.id" class="template-btn" @click="emit('select', t.id)">
          <span class="icon">{{ t.icon }}</span>
          <span class="name">{{ t.name }}</span>
          <span class="desc">{{ t.desc }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; width: 400px; }
.modal h3 { margin-bottom: 16px; font-size: 16px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.template-btn { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 8px; padding: 12px; cursor: pointer; text-align: left; color: #e6edf3; display: flex; flex-direction: column; gap: 2px; }
.template-btn:hover { background: rgba(255,255,255,0.1); border-color: #e94560; }
.icon { font-size: 20px; }
.name { font-size: 13px; font-weight: 600; }
.desc { font-size: 10px; color: #8b949e; }
</style>
```

- [ ] **Step 2: Create SlideList**

Create `components/editor/SlideList.vue`:

```vue
<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { Slide } from '~/types'

const props = defineProps<{ slides: Slide[]; currentIndex: number }>()
const emit = defineEmits<{
  (e: 'select', index: number): void
  (e: 'add', template: string): void
  (e: 'delete', id: string): void
  (e: 'reorder', newOrder: { id: string; order: number }[]): void
}>()

const showTemplateSelector = ref(false)
const localSlides = ref<Slide[]>([])

watch(() => props.slides, (val) => { localSlides.value = [...val] }, { immediate: true, deep: true })

function onDragEnd() {
  const newOrder = localSlides.value.map((s, i) => ({ id: s.id, order: i }))
  emit('reorder', newOrder)
}

function handleAdd(template: string) {
  showTemplateSelector.value = false
  emit('add', template)
}

const TEMPLATE_COLORS: Record<string, string> = {
  cover: '#e94560', section: '#e94560', content: '#533483',
  diagram: '#0f3460', code: '#238636', comparison: '#da3633',
}
</script>

<template>
  <div class="slide-list">
    <div class="header">
      <span class="label">Slides ({{ slides.length }})</span>
    </div>

    <VueDraggable v-model="localSlides" @end="onDragEnd" class="slides" handle=".slide-item">
      <div
        v-for="(slide, i) in localSlides"
        :key="slide.id"
        class="slide-item"
        :class="{ active: i === currentIndex }"
        @click="emit('select', i)"
      >
        <div class="slide-type" :style="{ color: TEMPLATE_COLORS[slide.template] }">
          {{ i + 1 }} · {{ slide.template.toUpperCase() }}
        </div>
        <div class="slide-title">{{ (slide.data as any).title || '(sem título)' }}</div>
        <button v-if="slides.length > 1" class="delete-btn" @click.stop="emit('delete', slide.id)">×</button>
      </div>
    </VueDraggable>

    <button class="add-btn" @click="showTemplateSelector = true">+ Novo slide</button>

    <TemplateSelector v-if="showTemplateSelector" @select="handleAdd" @close="showTemplateSelector = false" />
  </div>
</template>

<style scoped>
.slide-list { padding: 8px; display: flex; flex-direction: column; height: 100%; }
.header { padding: 4px 4px 8px; }
.label { font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; }
.slides { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.slide-item { background: #161b22; border: 1px solid #30363d; border-radius: 4px; padding: 8px; cursor: pointer; position: relative; }
.slide-item.active { border-color: #e94560; background: #1c2333; }
.slide-item:hover .delete-btn { opacity: 0.6; }
.slide-type { font-size: 9px; font-weight: 600; letter-spacing: 0.5px; }
.slide-title { font-size: 11px; color: #e6edf3; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.delete-btn { position: absolute; top: 4px; right: 4px; background: none; border: none; color: #f85149; font-size: 14px; cursor: pointer; opacity: 0; padding: 2px 4px; }
.delete-btn:hover { opacity: 1 !important; }
.add-btn { background: none; border: 1px dashed #30363d; border-radius: 4px; padding: 10px; color: #8b949e; cursor: pointer; font-size: 12px; margin-top: 4px; }
.add-btn:hover { border-color: #e94560; color: #e94560; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add components/editor/SlideList.vue components/editor/TemplateSelector.vue
git commit -m "feat: slide list sidebar with drag-and-drop + template selector

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 12: Template Field Components

**Files:**
- Create: `components/templates/CoverFields.vue`, `SectionFields.vue`, `ContentFields.vue`, `DiagramFields.vue`, `CodeFields.vue`, `ComparisonFields.vue`

- [ ] **Step 1: Create CoverFields**

Create `components/templates/CoverFields.vue`:

```vue
<script setup lang="ts">
import type { CoverData } from '~/types'
const props = defineProps<{ data: CoverData }>()
const emit = defineEmits<{ (e: 'update', data: CoverData): void }>()

function update(field: keyof CoverData, value: string) {
  emit('update', { ...props.data, [field]: value })
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>
    <label>Subtítulo<input :value="data.subtitle" @input="update('subtitle', ($event.target as HTMLInputElement).value)" /></label>
    <label>Autor<input :value="data.author" @input="update('author', ($event.target as HTMLInputElement).value)" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
</style>
```

- [ ] **Step 2: Create SectionFields**

Create `components/templates/SectionFields.vue`:

```vue
<script setup lang="ts">
import type { SectionData } from '~/types'
const props = defineProps<{ data: SectionData }>()
const emit = defineEmits<{ (e: 'update', data: SectionData): void }>()

function update(field: keyof SectionData, value: string) {
  emit('update', { ...props.data, [field]: value })
}
</script>

<template>
  <div class="fields">
    <label>Número da seção (opcional)<input :value="data.section_number" @input="update('section_number', ($event.target as HTMLInputElement).value)" placeholder="Ex: BLOCO 3" /></label>
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
</style>
```

- [ ] **Step 3: Create ContentFields**

Create `components/templates/ContentFields.vue`:

```vue
<script setup lang="ts">
import type { ContentData } from '~/types'
const props = defineProps<{ data: ContentData }>()
const emit = defineEmits<{ (e: 'update', data: ContentData): void }>()

function updateTitle(value: string) {
  emit('update', { ...props.data, title: value })
}

function updateBullet(index: number, value: string) {
  const bullets = [...(props.data.bullets || [])]
  bullets[index] = value
  emit('update', { ...props.data, bullets })
}

function addBullet() {
  emit('update', { ...props.data, bullets: [...(props.data.bullets || []), ''] })
}

function removeBullet(index: number) {
  const bullets = (props.data.bullets || []).filter((_, i) => i !== index)
  emit('update', { ...props.data, bullets })
}

function updateQuote(value: string) {
  emit('update', { ...props.data, quote: value })
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="updateTitle(($event.target as HTMLInputElement).value)" /></label>

    <div class="section-label">Bullets</div>
    <div v-for="(bullet, i) in (data.bullets || [])" :key="i" class="bullet-row">
      <input :value="bullet" @input="updateBullet(i, ($event.target as HTMLInputElement).value)" placeholder="Ponto..." />
      <button class="remove" @click="removeBullet(i)">×</button>
    </div>
    <button class="add-btn" @click="addBullet">+ Bullet</button>

    <label>Quote (opcional)<textarea :value="data.quote" @input="updateQuote(($event.target as HTMLTextAreaElement).value)" rows="2" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, textarea { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.section-label { font-size: 11px; color: #8b949e; }
.bullet-row { display: flex; gap: 4px; }
.bullet-row input { flex: 1; }
.remove { background: none; border: none; color: #f85149; font-size: 16px; cursor: pointer; padding: 0 4px; }
.add-btn { background: none; border: 1px dashed #30363d; border-radius: 4px; padding: 6px; color: #8b949e; cursor: pointer; font-size: 11px; }
</style>
```

- [ ] **Step 4: Create DiagramFields**

Create `components/templates/DiagramFields.vue`:

```vue
<script setup lang="ts">
import type { DiagramData } from '~/types'
const props = defineProps<{ data: DiagramData }>()
const emit = defineEmits<{ (e: 'update', data: DiagramData): void }>()

function update(field: keyof DiagramData, value: string) {
  emit('update', { ...props.data, [field]: value })
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>

    <label>Tipo
      <select :value="data.diagram_type" @change="update('diagram_type', ($event.target as HTMLSelectElement).value)">
        <option value="mermaid">Mermaid</option>
        <option value="image">Imagem</option>
        <option value="embed">Embed (iframe)</option>
      </select>
    </label>

    <label v-if="data.diagram_type === 'mermaid'">Código Mermaid
      <textarea :value="data.mermaid_code" @input="update('mermaid_code', ($event.target as HTMLTextAreaElement).value)" rows="8" class="code" placeholder="graph TD&#10;  A-->B" />
    </label>

    <label v-if="data.diagram_type === 'embed'">URL do embed
      <input :value="data.embed_url" @input="update('embed_url', ($event.target as HTMLInputElement).value)" placeholder="https://..." />
    </label>

    <label>Legenda (opcional)<input :value="data.caption" @input="update('caption', ($event.target as HTMLInputElement).value)" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, textarea, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.code { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
</style>
```

- [ ] **Step 5: Create CodeFields**

Create `components/templates/CodeFields.vue`:

```vue
<script setup lang="ts">
import type { CodeData } from '~/types'
const props = defineProps<{ data: CodeData }>()
const emit = defineEmits<{ (e: 'update', data: CodeData): void }>()

function update(field: keyof CodeData, value: string) {
  emit('update', { ...props.data, [field]: value })
}

const languages = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'sql', 'bash', 'json', 'yaml', 'html', 'css', 'php', 'ruby', 'csharp']
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>

    <label>Linguagem
      <select :value="data.language" @change="update('language', ($event.target as HTMLSelectElement).value)">
        <option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</option>
      </select>
    </label>

    <label>Código
      <textarea :value="data.code" @input="update('code', ($event.target as HTMLTextAreaElement).value)" rows="10" class="code" />
    </label>

    <label>Linhas destacadas (opcional)<input :value="data.highlight_lines" @input="update('highlight_lines', ($event.target as HTMLInputElement).value)" placeholder="Ex: 1,3-5" /></label>

    <label>Nota (opcional)<input :value="data.note" @input="update('note', ($event.target as HTMLInputElement).value)" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, textarea, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.code { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
</style>
```

- [ ] **Step 6: Create ComparisonFields**

Create `components/templates/ComparisonFields.vue`:

```vue
<script setup lang="ts">
import type { ComparisonData } from '~/types'
const props = defineProps<{ data: ComparisonData }>()
const emit = defineEmits<{ (e: 'update', data: ComparisonData): void }>()

function update(field: keyof ComparisonData, value: any) {
  emit('update', { ...props.data, [field]: value })
}

function updateItem(side: 'left' | 'right', index: number, value: string) {
  const key = side === 'left' ? 'left_items' : 'right_items'
  const items = [...(props.data[key] || [])]
  items[index] = value
  update(key, items)
}

function addItem(side: 'left' | 'right') {
  const key = side === 'left' ? 'left_items' : 'right_items'
  update(key, [...(props.data[key] || []), ''])
}

function removeItem(side: 'left' | 'right', index: number) {
  const key = side === 'left' ? 'left_items' : 'right_items'
  update(key, (props.data[key] || []).filter((_: string, i: number) => i !== index))
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>

    <label>Estilo
      <select :value="data.style" @change="update('style', ($event.target as HTMLSelectElement).value)">
        <option value="columns">Colunas</option>
        <option value="table">Tabela</option>
      </select>
    </label>

    <div class="side">
      <label>Lado esquerdo — título<input :value="data.left_title" @input="update('left_title', ($event.target as HTMLInputElement).value)" /></label>
      <div v-for="(item, i) in (data.left_items || [])" :key="'l'+i" class="item-row">
        <input :value="item" @input="updateItem('left', i, ($event.target as HTMLInputElement).value)" />
        <button class="remove" @click="removeItem('left', i)">×</button>
      </div>
      <button class="add-btn" @click="addItem('left')">+ Item</button>
    </div>

    <div class="side">
      <label>Lado direito — título<input :value="data.right_title" @input="update('right_title', ($event.target as HTMLInputElement).value)" /></label>
      <div v-for="(item, i) in (data.right_items || [])" :key="'r'+i" class="item-row">
        <input :value="item" @input="updateItem('right', i, ($event.target as HTMLInputElement).value)" />
        <button class="remove" @click="removeItem('right', i)">×</button>
      </div>
      <button class="add-btn" @click="addItem('right')">+ Item</button>
    </div>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
.side { border: 1px solid #30363d; border-radius: 6px; padding: 10px; }
.item-row { display: flex; gap: 4px; margin-top: 4px; }
.item-row input { flex: 1; }
.remove { background: none; border: none; color: #f85149; font-size: 16px; cursor: pointer; }
.add-btn { background: none; border: 1px dashed #30363d; border-radius: 4px; padding: 4px; color: #8b949e; cursor: pointer; font-size: 10px; margin-top: 4px; }
</style>
```

- [ ] **Step 7: Commit**

```bash
git add components/templates/
git commit -m "feat: 6 template field components (cover, section, content, diagram, code, comparison)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 13: SlideProperties Panel

**Files:**
- Create: `components/editor/SlideProperties.vue`

- [ ] **Step 1: Create SlideProperties**

Create `components/editor/SlideProperties.vue`:

```vue
<script setup lang="ts">
import type { Slide, SlideTemplate } from '~/types'

const props = defineProps<{ slide: Slide; presentationId: string }>()
const emit = defineEmits<{ (e: 'update', updates: Partial<Slide>): void }>()

const debounceTimer = ref<ReturnType<typeof setTimeout>>()

function onDataUpdate(newData: any) {
  clearTimeout(debounceTimer.value)
  debounceTimer.value = setTimeout(() => {
    emit('update', { data: newData })
  }, 500)
}

function onNotesUpdate(notes: string) {
  clearTimeout(debounceTimer.value)
  debounceTimer.value = setTimeout(() => {
    emit('update', { notes })
  }, 500)
}

function onTemplateChange(template: SlideTemplate) {
  emit('update', { template })
}

const templateOptions = [
  { value: 'cover', label: '📌 Cover' },
  { value: 'section', label: '📑 Section' },
  { value: 'content', label: '📝 Content' },
  { value: 'diagram', label: '📊 Diagram' },
  { value: 'code', label: '💻 Code' },
  { value: 'comparison', label: '⚖️ Comparison' },
]
</script>

<template>
  <div class="properties">
    <div class="section-title">Propriedades</div>

    <label class="field">
      <span>Template</span>
      <select :value="slide.template" @change="onTemplateChange(($event.target as HTMLSelectElement).value as SlideTemplate)">
        <option v-for="t in templateOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
    </label>

    <div class="divider" />

    <CoverFields v-if="slide.template === 'cover'" :data="slide.data as any" @update="onDataUpdate" />
    <SectionFields v-else-if="slide.template === 'section'" :data="slide.data as any" @update="onDataUpdate" />
    <ContentFields v-else-if="slide.template === 'content'" :data="slide.data as any" @update="onDataUpdate" />
    <DiagramFields v-else-if="slide.template === 'diagram'" :data="slide.data as any" @update="onDataUpdate" />
    <CodeFields v-else-if="slide.template === 'code'" :data="slide.data as any" @update="onDataUpdate" />
    <ComparisonFields v-else-if="slide.template === 'comparison'" :data="slide.data as any" @update="onDataUpdate" />

    <div class="divider" />

    <label class="field">
      <span>Speaker Notes</span>
      <textarea :value="slide.notes || ''" @input="onNotesUpdate(($event.target as HTMLTextAreaElement).value)" rows="4" placeholder="Notas para o apresentador..." />
    </label>
  </div>
</template>

<style scoped>
.properties { padding: 16px; }
.section-title { font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; margin-bottom: 12px; }
select, textarea { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.divider { border-top: 1px solid #30363d; margin: 16px 0; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add components/editor/SlideProperties.vue
git commit -m "feat: slide properties panel with dynamic template fields

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 14: SlidePreview Component

**Files:**
- Create: `components/editor/SlidePreview.vue`

- [ ] **Step 1: Create SlidePreview**

This renders a simplified preview of the current slide using Vue (not Slidev iframe — that comes later as an enhancement).

Create `components/editor/SlidePreview.vue`:

```vue
<script setup lang="ts">
import type { Slide, ThemeConfig, CoverData, SectionData, ContentData, DiagramData, CodeData, ComparisonData } from '~/types'

const props = defineProps<{ slide: Slide; theme?: ThemeConfig }>()

const bg = computed(() => props.theme?.colors?.background || '#1a1a2e')
const primary = computed(() => props.theme?.colors?.primary || '#e94560')
const textColor = computed(() => props.theme?.colors?.text || '#ffffff')
</script>

<template>
  <div class="preview-wrapper">
    <div class="slide" :style="{ background: bg, color: textColor }">
      <!-- Cover -->
      <template v-if="slide.template === 'cover'">
        <div class="cover">
          <h1>{{ (slide.data as CoverData).title }}</h1>
          <h2 v-if="(slide.data as CoverData).subtitle">{{ (slide.data as CoverData).subtitle }}</h2>
          <p class="author" v-if="(slide.data as CoverData).author">{{ (slide.data as CoverData).author }}</p>
          <div class="accent-bar" :style="{ background: primary }" />
        </div>
      </template>

      <!-- Section -->
      <template v-else-if="slide.template === 'section'">
        <div class="section-slide">
          <span class="section-num" v-if="(slide.data as SectionData).section_number">{{ (slide.data as SectionData).section_number }}</span>
          <h1>{{ (slide.data as SectionData).title }}</h1>
          <div class="accent-bar" :style="{ background: primary }" />
        </div>
      </template>

      <!-- Content -->
      <template v-else-if="slide.template === 'content'">
        <div class="content-slide">
          <h1 :style="{ color: primary }">{{ (slide.data as ContentData).title }}</h1>
          <ul>
            <li v-for="(b, i) in ((slide.data as ContentData).bullets || [])" :key="i">{{ b }}</li>
          </ul>
          <blockquote v-if="(slide.data as ContentData).quote">{{ (slide.data as ContentData).quote }}</blockquote>
        </div>
      </template>

      <!-- Diagram -->
      <template v-else-if="slide.template === 'diagram'">
        <div class="diagram-slide">
          <h1>{{ (slide.data as DiagramData).title }}</h1>
          <div class="diagram-placeholder">
            <template v-if="(slide.data as DiagramData).diagram_type === 'mermaid'">
              <pre class="mermaid-preview">{{ (slide.data as DiagramData).mermaid_code }}</pre>
            </template>
            <template v-else>
              <span class="placeholder-text">{{ (slide.data as DiagramData).diagram_type === 'image' ? '🖼 Imagem' : '🔗 Embed' }}</span>
            </template>
          </div>
        </div>
      </template>

      <!-- Code -->
      <template v-else-if="slide.template === 'code'">
        <div class="code-slide">
          <h1>{{ (slide.data as CodeData).title }}</h1>
          <pre class="code-block"><code>{{ (slide.data as CodeData).code }}</code></pre>
          <p class="note" v-if="(slide.data as CodeData).note">{{ (slide.data as CodeData).note }}</p>
        </div>
      </template>

      <!-- Comparison -->
      <template v-else-if="slide.template === 'comparison'">
        <div class="comparison-slide">
          <h1>{{ (slide.data as ComparisonData).title }}</h1>
          <div class="columns">
            <div class="col">
              <h3>{{ (slide.data as ComparisonData).left_title }}</h3>
              <ul><li v-for="(item, i) in ((slide.data as ComparisonData).left_items || [])" :key="i">{{ item }}</li></ul>
            </div>
            <div class="col">
              <h3>{{ (slide.data as ComparisonData).right_title }}</h3>
              <ul><li v-for="(item, i) in ((slide.data as ComparisonData).right_items || [])" :key="i">{{ item }}</li></ul>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.preview-wrapper { width: 100%; max-width: 720px; aspect-ratio: 16/9; }
.slide { width: 100%; height: 100%; border-radius: 8px; padding: 40px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
h1 { font-size: 28px; margin-bottom: 8px; }
h2 { font-size: 18px; opacity: 0.7; }
.accent-bar { width: 40px; height: 3px; margin-top: 12px; border-radius: 2px; }

.cover { text-align: center; }
.author { font-size: 13px; opacity: 0.5; margin-top: 8px; }

.section-slide { text-align: left; }
.section-num { font-size: 11px; opacity: 0.4; letter-spacing: 2px; text-transform: uppercase; }

.content-slide { text-align: left; width: 100%; }
.content-slide ul { list-style: disc; padding-left: 20px; font-size: 16px; line-height: 1.8; }
.content-slide blockquote { border-left: 3px solid currentColor; padding-left: 12px; font-style: italic; opacity: 0.8; margin-top: 12px; font-size: 14px; }

.diagram-slide { text-align: center; width: 100%; }
.diagram-placeholder { margin-top: 16px; }
.mermaid-preview { text-align: left; font-size: 10px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; max-height: 200px; overflow: auto; }
.placeholder-text { font-size: 40px; }

.code-slide { text-align: left; width: 100%; }
.code-block { background: #0d1117; padding: 16px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; overflow: auto; max-height: 250px; margin-top: 12px; }
.note { font-size: 11px; opacity: 0.6; margin-top: 8px; }

.comparison-slide { width: 100%; }
.columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; }
.col { background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; }
.col h3 { font-size: 16px; margin-bottom: 8px; }
.col ul { list-style: disc; padding-left: 16px; font-size: 13px; line-height: 1.6; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add components/editor/SlidePreview.vue
git commit -m "feat: slide preview component with all 6 template renderers

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 15: Theme Editor

**Files:**
- Create: `components/theme/ThemeEditor.vue`

- [ ] **Step 1: Create ThemeEditor**

Create `components/theme/ThemeEditor.vue`:

```vue
<script setup lang="ts">
import type { Theme, ThemeConfig } from '~/types'

const props = defineProps<{ theme: Theme }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>()

const config = ref<ThemeConfig>(JSON.parse(JSON.stringify(props.theme.config)))
const saving = ref(false)

async function save() {
  saving.value = true
  await $fetch(`/api/themes/${props.theme.id}`, {
    method: 'PUT',
    body: { name: props.theme.name, config: config.value },
  })
  saving.value = false
  emit('saved')
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>🎨 Editar Tema</h3>
        <button class="close" @click="emit('close')">×</button>
      </div>

      <div class="section">
        <h4>Cores</h4>
        <div class="color-grid">
          <label>Background<input type="color" v-model="config.colors.background" /></label>
          <label>Primary<input type="color" v-model="config.colors.primary" /></label>
          <label>Secondary<input type="color" v-model="config.colors.secondary" /></label>
          <label>Text<input type="color" v-model="config.colors.text" /></label>
        </div>
      </div>

      <div class="section">
        <h4>Fontes</h4>
        <label>Heading<input v-model="config.fonts.heading" /></label>
        <label>Body<input v-model="config.fonts.body" /></label>
        <label>Code<input v-model="config.fonts.code" /></label>
      </div>

      <div class="section">
        <h4>Code Theme</h4>
        <select v-model="config.codeTheme">
          <option value="github-dark">GitHub Dark</option>
          <option value="dracula">Dracula</option>
          <option value="nord">Nord</option>
          <option value="one-dark-pro">One Dark Pro</option>
          <option value="vitesse-dark">Vitesse Dark</option>
        </select>
      </div>

      <button class="btn-save" @click="save" :disabled="saving">
        {{ saving ? 'Salvando...' : 'Salvar tema' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; width: 420px; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { font-size: 16px; }
.close { background: none; border: none; color: #8b949e; font-size: 20px; cursor: pointer; }
.section { margin-bottom: 20px; }
.section h4 { font-size: 13px; margin-bottom: 8px; color: #8b949e; }
.color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; margin-bottom: 8px; }
input, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
input[type="color"] { height: 36px; cursor: pointer; padding: 2px; }
.btn-save { width: 100%; background: #e94560; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-save:disabled { opacity: 0.5; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add components/theme/
git commit -m "feat: theme editor modal with color pickers and font config

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 16: Integration & Smoke Test

**Files:**
- Modify: `pages/editor/[id].vue` (auto-generate on save)

- [ ] **Step 1: Add auto-generate on slide update**

In `pages/editor/[id].vue`, add auto-generation after each slide update. Add this function:

```ts
async function regenerateMarkdown() {
  try {
    await $fetch('/api/generate', { method: 'POST', body: { presentation_id: presentationId } })
  } catch {}
}
```

Call `regenerateMarkdown()` at the end of `updateSlide`, `addSlide`, `deleteSlide`, and `reorderSlides` functions (after `await refresh()`).

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (db tests + markdown generator tests).

- [ ] **Step 3: Start dev server and smoke test**

```bash
npx nuxt dev
```

Open `http://localhost:3000`. Verify:
1. Home page loads with "Nova Apresentação" button
2. Create a presentation → navigates to editor
3. Editor shows 3 panels with default cover slide
4. Can add slides of each template type
5. Can edit slide content in right panel
6. Preview updates in center panel
7. Can reorder slides via drag-and-drop
8. Can delete slides
9. Theme editor opens and saves colors

- [ ] **Step 4: Test markdown generation**

```bash
# After creating a presentation and adding slides in the UI:
curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d '{"presentation_id":"<UUID>"}'
# Check output/ directory for generated slides.md
```

- [ ] **Step 5: Initial git commit of all files**

```bash
git add -A
git commit -m "feat: complete slide builder v1 — editor, templates, themes, markdown generation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Summary

| Task | Description | Deps |
|------|-------------|------|
| 1 | Project scaffolding | — |
| 2 | TypeScript types | 1 |
| 3 | Database setup + tests | 1, 2 |
| 4 | Theme API | 3 |
| 5 | Presentation API | 3 |
| 6 | Slide API | 3 |
| 7 | Asset upload API | 3 |
| 8 | Markdown generator + tests | 2, 3 |
| 9 | Home page | 5 |
| 10 | Editor page layout | 5, 6 |
| 11 | SlideList + TemplateSelector | 10 |
| 12 | Template field components (6) | 2 |
| 13 | SlideProperties panel | 11, 12 |
| 14 | SlidePreview component | 2 |
| 15 | Theme editor | 4 |
| 16 | Integration & smoke test | all |
