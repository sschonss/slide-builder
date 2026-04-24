# PWA + Remote Presenter Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Slide Builder into a PWA with cross-device presenter sync so the user can present from an iPad while the audience screen follows along via server-side polling.

**Architecture:** Add `@vite-pwa/nuxt` module for installable PWA with standalone display mode. Replace BroadcastChannel-only sync with a hybrid approach: a `presenter_sync` table in Turso holds the current slide index per presentation; the presenter POSTs index changes; audience devices poll GET every 1s. BroadcastChannel remains as a same-device fast path.

**Tech Stack:** `@vite-pwa/nuxt` (already installed), Turso (existing), Nuxt server routes

---

## File Structure

### New Files
- `public/pwa-192x192.png` — PWA icon 192x192 (generated from SVG)
- `public/pwa-512x512.png` — PWA icon 512x512 (generated from SVG)
- `public/maskable-icon-512x512.png` — Maskable PWA icon
- `server/api/sync/[id].get.ts` — GET current slide index for a presentation
- `server/api/sync/[id].post.ts` — POST to update slide index (presenter only)

### Modified Files
- `nuxt.config.ts` — Add `@vite-pwa/nuxt` module with manifest config
- `server/utils/db.ts` — Add `presenter_sync` table to migrations
- `composables/usePresenterSync.ts` — Rewrite with hybrid BroadcastChannel + polling
- `pages/presenter/[id].vue` — Use updated sync composable
- `pages/present/[id].vue` — Use updated sync composable (audience view)

---

### Task 1: Add presenter_sync table migration

**Files:**
- Modify: `server/utils/db.ts:39-46`

- [ ] **Step 1: Add presenter_sync table to the migration batch**

In `server/utils/db.ts`, add a new statement to the `client.batch([...])` array inside `_initDbInternal()`:

```typescript
{ sql: `CREATE TABLE IF NOT EXISTS presenter_sync (presentation_id TEXT PRIMARY KEY REFERENCES presentations(id) ON DELETE CASCADE, slide_index INTEGER NOT NULL DEFAULT 0, updated_at DATETIME NOT NULL DEFAULT (datetime('now')))`, args: [] },
```

Add it right after the `change_log` CREATE TABLE statement (the last one in the batch).

- [ ] **Step 2: Verify build passes**

Run: `cd /Users/luizschons/Documents/codes/slide-builder && npx nuxt build 2>&1 | tail -5`
Expected: `✨ Build complete!`

- [ ] **Step 3: Commit**

```bash
git add server/utils/db.ts
git commit -m "feat: add presenter_sync table for cross-device sync

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Create sync API endpoints

**Files:**
- Create: `server/api/sync/[id].get.ts`
- Create: `server/api/sync/[id].post.ts`

- [ ] **Step 1: Create GET endpoint**

Create `server/api/sync/[id].get.ts` — returns the current slide index for a presentation. No auth required (audience needs to read this for public presentations).

```typescript
import { dbGet } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const presentationId = getRouterParam(event, 'id')
  if (!presentationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing presentation ID' })
  }

  const row = await dbGet<{ slide_index: number; updated_at: string }>(
    'SELECT slide_index, updated_at FROM presenter_sync WHERE presentation_id = ?',
    [presentationId]
  )

  return {
    slideIndex: row?.slide_index ?? 0,
    updatedAt: row?.updated_at ?? null,
  }
})
```

- [ ] **Step 2: Create POST endpoint**

Create `server/api/sync/[id].post.ts` — updates the current slide index. Requires auth and ownership of the presentation.

```typescript
import { dbRun, dbGet } from '~/server/utils/db'
import { requireOwnership } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const presentationId = getRouterParam(event, 'id')
  if (!presentationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing presentation ID' })
  }

  await requireOwnership(event, presentationId)

  const body = await readBody(event)
  const slideIndex = typeof body?.slideIndex === 'number' ? body.slideIndex : null
  if (slideIndex === null || slideIndex < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slideIndex' })
  }

  await dbRun(
    `INSERT INTO presenter_sync (presentation_id, slide_index, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(presentation_id) DO UPDATE SET slide_index = excluded.slide_index, updated_at = excluded.updated_at`,
    [presentationId, slideIndex]
  )

  return { ok: true }
})
```

- [ ] **Step 3: Verify build passes**

Run: `cd /Users/luizschons/Documents/codes/slide-builder && npx nuxt build 2>&1 | tail -5`
Expected: `✨ Build complete!`

- [ ] **Step 4: Commit**

```bash
git add server/api/sync/
git commit -m "feat: add sync API endpoints for cross-device presenter sync

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Rewrite usePresenterSync composable

**Files:**
- Modify: `composables/usePresenterSync.ts`

- [ ] **Step 1: Rewrite composable with hybrid sync**

Replace the entire content of `composables/usePresenterSync.ts` with a hybrid approach:
- **Presenter mode** (`role: 'presenter'`): POSTs slide index to server on every navigation + sends via BroadcastChannel for same-device.
- **Audience mode** (`role: 'audience'`): Polls GET endpoint every 1000ms + listens to BroadcastChannel for instant same-device updates.

```typescript
type Message =
  | { type: 'navigate'; index: number }
  | { type: 'sync-request' }

type SyncRole = 'presenter' | 'audience'

export function usePresenterSync(presentationId: string, role: SyncRole = 'audience') {
  const channelName = `presenter-${presentationId}`
  const channel = ref<BroadcastChannel | null>(null)
  const remoteIndex = ref(-1)
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let lastUpdatedAt: string | null = null

  function init() {
    if (import.meta.server) return

    // BroadcastChannel for same-device instant sync
    channel.value = new BroadcastChannel(channelName)
    channel.value.onmessage = (ev: MessageEvent<Message>) => {
      if (ev.data.type === 'navigate') {
        remoteIndex.value = ev.data.index
      }
      if (ev.data.type === 'sync-request' && role === 'presenter') {
        if (remoteIndex.value >= 0) {
          channel.value?.postMessage({ type: 'navigate', index: remoteIndex.value })
        }
      }
    }

    // Server-side polling for cross-device sync (audience only)
    if (role === 'audience') {
      pollTimer = setInterval(pollSync, 1000)
      pollSync() // immediate first poll
    }
  }

  async function pollSync() {
    try {
      const data = await $fetch<{ slideIndex: number; updatedAt: string | null }>(
        `/api/sync/${presentationId}`
      )
      if (data.updatedAt && data.updatedAt !== lastUpdatedAt) {
        lastUpdatedAt = data.updatedAt
        remoteIndex.value = data.slideIndex
      }
    } catch {
      // Silently ignore poll errors — will retry on next interval
    }
  }

  async function sendIndex(index: number) {
    // Local BroadcastChannel (instant, same-device)
    channel.value?.postMessage({ type: 'navigate', index })

    // Server sync (cross-device, presenter only)
    if (role === 'presenter') {
      try {
        await $fetch(`/api/sync/${presentationId}`, {
          method: 'POST',
          body: { slideIndex: index },
        })
      } catch {
        // Non-critical — BroadcastChannel still works locally
      }
    }
  }

  function requestSync() {
    channel.value?.postMessage({ type: 'sync-request' })
    // Also do an immediate poll for cross-device
    if (role === 'audience') {
      pollSync()
    }
  }

  function destroy() {
    channel.value?.close()
    channel.value = null
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  return { remoteIndex, init, sendIndex, requestSync, destroy }
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd /Users/luizschons/Documents/codes/slide-builder && npx nuxt build 2>&1 | tail -5`
Expected: `✨ Build complete!`

- [ ] **Step 3: Commit**

```bash
git add composables/usePresenterSync.ts
git commit -m "feat: hybrid presenter sync with server polling + BroadcastChannel

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Update presenter and audience pages to use roles

**Files:**
- Modify: `pages/presenter/[id].vue:20`
- Modify: `pages/present/[id].vue:14`

- [ ] **Step 1: Update presenter page**

In `pages/presenter/[id].vue`, change line 20 from:

```typescript
const { remoteIndex, init, sendIndex, destroy } = usePresenterSync(presentationId)
```

to:

```typescript
const { remoteIndex, init, sendIndex, destroy } = usePresenterSync(presentationId, 'presenter')
```

- [ ] **Step 2: Update audience page**

In `pages/present/[id].vue`, change line 14 from:

```typescript
const { remoteIndex, init, sendIndex, destroy } = usePresenterSync(presentationId)
```

to:

```typescript
const { remoteIndex, init, sendIndex, destroy } = usePresenterSync(presentationId, 'audience')
```

- [ ] **Step 3: Verify build passes**

Run: `cd /Users/luizschons/Documents/codes/slide-builder && npx nuxt build 2>&1 | tail -5`
Expected: `✨ Build complete!`

- [ ] **Step 4: Commit**

```bash
git add pages/presenter/[id].vue pages/present/[id].vue
git commit -m "feat: assign presenter/audience roles for cross-device sync

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Configure PWA module

**Files:**
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Add @vite-pwa/nuxt module and manifest config**

Replace the entire `nuxt.config.ts` with:

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  ssr: false,
  modules: ['nuxt-auth-utils', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Slide Builder',
      short_name: 'SlideBuilder',
      description: 'Crie apresentações profissionais no browser',
      theme_color: '#0d1117',
      background_color: '#0d1117',
      display: 'standalone',
      orientation: 'any',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },
  runtimeConfig: {
    tursoUrl: '',
    tursoToken: '',
    session: {
      maxAge: 60 * 60 * 24 * 7,
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
      meta: [
        { name: 'description', content: 'Crie apresentações profissionais no browser com temas customizáveis, export PDF e apresentação em tempo real.' },
        { name: 'theme-color', content: '#0d1117' },
      ],
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.svg' },
      ],
    },
  },
})
```

- [ ] **Step 2: Verify build passes**

Run: `cd /Users/luizschons/Documents/codes/slide-builder && npx nuxt build 2>&1 | tail -5`
Expected: `✨ Build complete!`

- [ ] **Step 3: Commit**

```bash
git add nuxt.config.ts
git commit -m "feat: configure PWA with manifest, service worker, and caching

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Generate PWA icons

**Files:**
- Create: `public/pwa-192x192.png`
- Create: `public/pwa-512x512.png`
- Create: `public/maskable-icon-512x512.png`

- [ ] **Step 1: Generate PNG icons from SVG**

Use a Node.js script with sharp (or resvg if available) to convert the existing SVG to required PNG sizes. If neither is available, create simple canvas-based PNGs.

```bash
cd /Users/luizschons/Documents/codes/slide-builder
npx --yes sharp-cli -i public/icon.svg -o public/pwa-192x192.png resize 192 192
npx --yes sharp-cli -i public/icon.svg -o public/pwa-512x512.png resize 512 512
```

For the maskable icon, create a version with extra padding (safe zone = inner 80%):

```bash
node -e "
const sharp = require('sharp');
sharp('public/icon.svg')
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: { r: 13, g: 17, b: 23, alpha: 1 } })
  .png()
  .toFile('public/maskable-icon-512x512.png');
" 2>/dev/null || cp public/pwa-512x512.png public/maskable-icon-512x512.png
```

If sharp is not available, use an alternative approach:

```bash
node -e "
const { createCanvas, loadImage } = require('canvas');
// fallback: just copy 512 as maskable
const fs = require('fs');
fs.copyFileSync('public/pwa-512x512.png', 'public/maskable-icon-512x512.png');
"
```

- [ ] **Step 2: Verify the files exist**

```bash
ls -la public/pwa-192x192.png public/pwa-512x512.png public/maskable-icon-512x512.png
```

- [ ] **Step 3: Commit**

```bash
git add public/pwa-*.png public/maskable-*.png
git commit -m "feat: add PWA icons (192, 512, maskable)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Build, verify, and push

**Files:** None (verification only)

- [ ] **Step 1: Full build**

```bash
cd /Users/luizschons/Documents/codes/slide-builder && npx nuxt build 2>&1 | tail -10
```

Expected: `✨ Build complete!`

- [ ] **Step 2: Push all commits**

```bash
git push origin master
```

- [ ] **Step 3: Verify deployment**

Wait for Vercel to deploy and check:
- `https://slide-builder-dev.vercel.app/` loads with PWA manifest
- Service worker registers
- App is installable on iPad/mobile
- Sync API endpoints respond: `curl https://slide-builder-dev.vercel.app/api/sync/test-id`
