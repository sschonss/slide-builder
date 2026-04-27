# Editor UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 UX features to the slide editor: duplicate slide, keyboard shortcuts, drag & drop images, and undo/redo.

**Architecture:** Each feature is a self-contained commit. Backend uses existing Nitro API patterns (`dbGet`/`dbRun`/`dbAll`, `requireOwnership`, `logChange`, `saveBackup`). Frontend uses Vue composables and component emit patterns already established. Tests use Vitest with in-memory SQLite via `better-sqlite3`.

**Tech Stack:** Nuxt 4, Vue 3, Vitest, better-sqlite3, lucide-vue-next icons, h3/Nitro

---

## File Structure

```
server/api/presentations/[id]/slides/[slideId]/
  └── duplicate.post.ts       # CREATE — duplicate slide endpoint
composables/
  ├── useEditorShortcuts.ts    # CREATE — keyboard shortcut composable
  └── useUndoRedo.ts           # CREATE — undo/redo state composable
components/editor/
  ├── SlideList.vue            # MODIFY — add duplicate button
  ├── SlidePreview.vue         # MODIFY — add drag & drop image handling
  ├── EditorToolbar.vue        # MODIFY — add undo/redo buttons, shortcut help button
  └── ShortcutHelp.vue         # CREATE — shortcut help modal
pages/editor/[id].vue          # MODIFY — wire shortcuts, undo/redo, duplicate, image drop
tests/server/
  ├── duplicate.test.ts        # CREATE — duplicate slide API tests
  ├── shortcuts.test.ts        # CREATE — keyboard shortcut composable tests
  └── undo-redo.test.ts        # CREATE — undo/redo composable tests
public/openapi.json            # MODIFY — add duplicate endpoint
```

---

### Task 1: Duplicate Slide API

**Files:**
- Create: `server/api/presentations/[id]/slides/[slideId]/duplicate.post.ts`
- Create: `tests/server/duplicate.test.ts`
- Modify: `public/openapi.json`

- [ ] **Step 1: Write the duplicate slide tests**

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

describe('duplicate slide', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
    seedPresentation(db, { id: 'p1' })
  })

  afterEach(() => {
    db.close()
  })

  it('duplicates a slide with same data and template', () => {
    seedSlide(db, { id: 's1', presentationId: 'p1', order: 0, template: 'content', data: { title: 'Hello', bullets: ['A', 'B'] } })

    const source = db.prepare('SELECT * FROM slides WHERE id = ?').get('s1') as any

    db.prepare(
      'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('s1-copy', source.presentation_id, source.order + 1, source.template, source.data, source.notes)

    const copy = db.prepare('SELECT * FROM slides WHERE id = ?').get('s1-copy') as any
    expect(copy.template).toBe('content')
    expect(JSON.parse(copy.data)).toEqual({ title: 'Hello', bullets: ['A', 'B'] })
    expect(copy.order).toBe(1)
  })

  it('shifts subsequent slides down when duplicating in the middle', () => {
    seedSlide(db, { id: 's1', presentationId: 'p1', order: 0 })
    seedSlide(db, { id: 's2', presentationId: 'p1', order: 1 })
    seedSlide(db, { id: 's3', presentationId: 'p1', order: 2 })

    const source = db.prepare('SELECT * FROM slides WHERE id = ?').get('s1') as any
    const newOrder = source.order + 1

    db.prepare(
      'UPDATE slides SET "order" = "order" + 1 WHERE presentation_id = ? AND "order" >= ?'
    ).run('p1', newOrder)

    db.prepare(
      'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('s1-copy', 'p1', newOrder, source.template, source.data, source.notes)

    const slides = db.prepare(
      'SELECT id, "order" FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
    ).all('p1') as any[]

    expect(slides).toEqual([
      { id: 's1', order: 0 },
      { id: 's1-copy', order: 1 },
      { id: 's2', order: 2 },
      { id: 's3', order: 3 },
    ])
  })

  it('duplicates the last slide correctly', () => {
    seedSlide(db, { id: 's1', presentationId: 'p1', order: 0 })
    seedSlide(db, { id: 's2', presentationId: 'p1', order: 1 })

    const source = db.prepare('SELECT * FROM slides WHERE id = ?').get('s2') as any
    const newOrder = source.order + 1

    db.prepare(
      'UPDATE slides SET "order" = "order" + 1 WHERE presentation_id = ? AND "order" >= ?'
    ).run('p1', newOrder)

    db.prepare(
      'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('s2-copy', 'p1', newOrder, source.template, source.data, source.notes)

    const slides = db.prepare(
      'SELECT id, "order" FROM slides WHERE presentation_id = ? ORDER BY "order" ASC'
    ).all('p1') as any[]

    expect(slides).toEqual([
      { id: 's1', order: 0 },
      { id: 's2', order: 1 },
      { id: 's2-copy', order: 2 },
    ])
  })

  it('preserves notes during duplication', () => {
    seedSlide(db, { id: 's1', presentationId: 'p1', order: 0, notes: 'Important speaker notes' })

    const source = db.prepare('SELECT * FROM slides WHERE id = ?').get('s1') as any

    db.prepare(
      'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('s1-copy', source.presentation_id, source.order + 1, source.template, source.data, source.notes)

    const copy = db.prepare('SELECT notes FROM slides WHERE id = ?').get('s1-copy') as any
    expect(copy.notes).toBe('Important speaker notes')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- tests/server/duplicate.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 3: Write the duplicate API endpoint**

Create `server/api/presentations/[id]/slides/[slideId]/duplicate.post.ts`:

```typescript
import { dbGet, dbRun, dbAll } from '~/server/utils/db'
import { saveBackup } from '~/server/utils/backup'
import { logChange } from '~/server/utils/changelog'
import { requireOwnership } from '~/server/utils/ownership'
import { v4 as uuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const presId = getRouterParam(event, 'id')!
  const slideId = getRouterParam(event, 'slideId')!

  await requireOwnership(event, presId)

  const source = await dbGet(
    'SELECT * FROM slides WHERE id = ? AND presentation_id = ?',
    [slideId, presId]
  ) as any

  if (!source) {
    throw createError({ statusCode: 404, message: 'Slide não encontrado' })
  }

  const newOrder = source.order + 1

  await dbRun(
    'UPDATE slides SET "order" = "order" + 1 WHERE presentation_id = ? AND "order" >= ?',
    [presId, newOrder]
  )

  const newId = uuid()
  await dbRun(
    'INSERT INTO slides (id, presentation_id, "order", template, data, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [newId, presId, newOrder, source.template, source.data, source.notes]
  )

  await dbRun("UPDATE presentations SET updated_at = datetime('now') WHERE id = ?", [presId])
  await saveBackup(presId)
  await logChange(presId, 'add', `Duplicou slide ${source.order + 1} (${source.template})`)

  const data = typeof source.data === 'string' ? JSON.parse(source.data) : source.data

  setResponseStatus(event, 201)
  return {
    id: newId,
    presentation_id: presId,
    order: newOrder,
    template: source.template,
    data,
    notes: source.notes || null,
  }
})
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Add duplicate button to SlideList.vue**

In `components/editor/SlideList.vue`:

1. Add import: `import { GripVertical, Copy } from 'lucide-vue-next'`
2. Add emit: `(e: 'duplicate', id: string): void`
3. Add duplicate button next to delete button in the template, before the delete button:
   ```html
   <button class="duplicate-btn" @click.stop="emit('duplicate', slide.id)" title="Duplicar">
     <Copy :size="12" />
   </button>
   ```
4. Add CSS for `.duplicate-btn` (same style as `.delete-btn` but with different color):
   ```css
   .duplicate-btn { position: absolute; top: 4px; right: 22px; background: none; border: none; color: #8b949e; font-size: 14px; cursor: pointer; opacity: 0; padding: 2px 4px; }
   .duplicate-btn:hover { opacity: 1 !important; color: #58a6ff; }
   ```
5. Add to `.slide-item:hover` rule: `.slide-item:hover .duplicate-btn { opacity: 0.6; }`

- [ ] **Step 6: Wire duplicate in editor page**

In `pages/editor/[id].vue`:

1. Add `duplicateSlide` function:
   ```typescript
   async function duplicateSlide(slideId: string) {
     await withSaving(async () => {
       const result = await $fetch(`/api/presentations/${presentationId}/slides/${slideId}/duplicate`, {
         method: 'POST',
       })
       await refresh()
       const newIndex = slides.value.findIndex(s => s.id === result.id)
       if (newIndex >= 0) currentSlideIndex.value = newIndex
       await regenerateMarkdown()
     })
   }
   ```

2. Add `@duplicate="duplicateSlide"` to `<EditorSlideList>` in the template.

- [ ] **Step 7: Update openapi.json**

Add to `public/openapi.json` paths:

```json
"/api/presentations/{id}/slides/{slideId}/duplicate": {
  "post": {
    "summary": "Duplicate a slide",
    "description": "Creates a copy of the specified slide immediately after the original, shifting subsequent slides down.",
    "tags": ["Slides"],
    "security": [{ "cookieAuth": [] }],
    "parameters": [
      { "name": "id", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Presentation ID" },
      { "name": "slideId", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Slide ID to duplicate" }
    ],
    "responses": {
      "201": {
        "description": "Duplicated slide",
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Slide" }
          }
        }
      },
      "404": { "description": "Slide not found" },
      "403": { "description": "Not the owner" }
    }
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add server/api/presentations/\[id\]/slides/\[slideId\]/duplicate.post.ts \
  tests/server/duplicate.test.ts \
  components/editor/SlideList.vue \
  pages/editor/\[id\].vue \
  public/openapi.json
git commit -m "feat: add duplicate slide (API + UI button)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Keyboard Shortcuts

**Files:**
- Create: `composables/useEditorShortcuts.ts`
- Create: `components/editor/ShortcutHelp.vue`
- Create: `tests/server/shortcuts.test.ts`
- Modify: `pages/editor/[id].vue`
- Modify: `components/editor/EditorToolbar.vue`

- [ ] **Step 1: Write the shortcut composable tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

function createShortcutHandler(options: {
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
  onNavigate: (dir: 'prev' | 'next') => void
  onToggleHelp: () => void
  onUndo?: () => void
  onRedo?: () => void
}) {
  return function handleKeydown(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; target: { tagName?: string; isContentEditable?: boolean }; preventDefault: () => void }) {
    const tag = e.target?.tagName?.toLowerCase()
    const isEditable = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable
    const mod = e.ctrlKey || e.metaKey

    if (mod && e.key === 's') {
      e.preventDefault()
      options.onSave()
      return
    }

    if (e.key === 'Escape') {
      options.onToggleHelp()
      return
    }

    if (isEditable) return

    if (mod && e.key === 'd') {
      e.preventDefault()
      options.onDuplicate()
      return
    }

    if (mod && e.key === 'z' && !e.shiftKey && options.onUndo) {
      e.preventDefault()
      options.onUndo()
      return
    }

    if (mod && e.key === 'z' && e.shiftKey && options.onRedo) {
      e.preventDefault()
      options.onRedo()
      return
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      options.onDelete()
      return
    }

    if (e.key === 'ArrowUp') {
      options.onNavigate('prev')
      return
    }

    if (e.key === 'ArrowDown') {
      options.onNavigate('next')
      return
    }

    if (e.key === '?') {
      options.onToggleHelp()
      return
    }
  }
}

describe('editor shortcuts', () => {
  let handlers: Record<string, ReturnType<typeof vi.fn>>
  let handleKeydown: ReturnType<typeof createShortcutHandler>

  function makeEvent(overrides: Partial<Parameters<typeof handleKeydown>[0]> = {}) {
    return {
      key: '',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target: { tagName: 'DIV', isContentEditable: false },
      preventDefault: vi.fn(),
      ...overrides,
    }
  }

  beforeEach(() => {
    handlers = {
      onSave: vi.fn(),
      onDuplicate: vi.fn(),
      onDelete: vi.fn(),
      onNavigate: vi.fn(),
      onToggleHelp: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
    }
    handleKeydown = createShortcutHandler(handlers)
  })

  it('Ctrl+S calls onSave and prevents default', () => {
    const e = makeEvent({ key: 's', ctrlKey: true })
    handleKeydown(e)
    expect(handlers.onSave).toHaveBeenCalled()
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('Ctrl+S works even in text input', () => {
    const e = makeEvent({ key: 's', ctrlKey: true, target: { tagName: 'INPUT' } })
    handleKeydown(e)
    expect(handlers.onSave).toHaveBeenCalled()
  })

  it('Ctrl+D calls onDuplicate', () => {
    const e = makeEvent({ key: 'd', ctrlKey: true })
    handleKeydown(e)
    expect(handlers.onDuplicate).toHaveBeenCalled()
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('Ctrl+D is suppressed in text input', () => {
    const e = makeEvent({ key: 'd', ctrlKey: true, target: { tagName: 'TEXTAREA' } })
    handleKeydown(e)
    expect(handlers.onDuplicate).not.toHaveBeenCalled()
  })

  it('ArrowUp calls onNavigate prev', () => {
    const e = makeEvent({ key: 'ArrowUp' })
    handleKeydown(e)
    expect(handlers.onNavigate).toHaveBeenCalledWith('prev')
  })

  it('ArrowDown calls onNavigate next', () => {
    const e = makeEvent({ key: 'ArrowDown' })
    handleKeydown(e)
    expect(handlers.onNavigate).toHaveBeenCalledWith('next')
  })

  it('ArrowUp is suppressed in text input', () => {
    const e = makeEvent({ key: 'ArrowUp', target: { tagName: 'TEXTAREA' } })
    handleKeydown(e)
    expect(handlers.onNavigate).not.toHaveBeenCalled()
  })

  it('Delete calls onDelete (not in text input)', () => {
    const e = makeEvent({ key: 'Delete' })
    handleKeydown(e)
    expect(handlers.onDelete).toHaveBeenCalled()
  })

  it('Delete is suppressed in text input', () => {
    const e = makeEvent({ key: 'Delete', target: { tagName: 'INPUT' } })
    handleKeydown(e)
    expect(handlers.onDelete).not.toHaveBeenCalled()
  })

  it('? toggles help', () => {
    const e = makeEvent({ key: '?' })
    handleKeydown(e)
    expect(handlers.onToggleHelp).toHaveBeenCalled()
  })

  it('Ctrl+Z calls onUndo', () => {
    const e = makeEvent({ key: 'z', ctrlKey: true })
    handleKeydown(e)
    expect(handlers.onUndo).toHaveBeenCalled()
  })

  it('Ctrl+Shift+Z calls onRedo', () => {
    const e = makeEvent({ key: 'z', ctrlKey: true, shiftKey: true })
    handleKeydown(e)
    expect(handlers.onRedo).toHaveBeenCalled()
  })

  it('Escape calls onToggleHelp', () => {
    const e = makeEvent({ key: 'Escape' })
    handleKeydown(e)
    expect(handlers.onToggleHelp).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- tests/server/shortcuts.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Write the composable**

Create `composables/useEditorShortcuts.ts`:

```typescript
interface ShortcutOptions {
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
  onNavigate: (dir: 'prev' | 'next') => void
  onToggleHelp: () => void
  onUndo?: () => void
  onRedo?: () => void
}

export function useEditorShortcuts(options: ShortcutOptions) {
  function handleKeydown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable
    const mod = e.ctrlKey || e.metaKey

    if (mod && e.key === 's') {
      e.preventDefault()
      options.onSave()
      return
    }

    if (e.key === 'Escape') {
      options.onToggleHelp()
      return
    }

    if (isEditable) return

    if (mod && e.key === 'd') {
      e.preventDefault()
      options.onDuplicate()
      return
    }

    if (mod && e.key === 'z' && !e.shiftKey && options.onUndo) {
      e.preventDefault()
      options.onUndo()
      return
    }

    if (mod && e.key === 'z' && e.shiftKey && options.onRedo) {
      e.preventDefault()
      options.onRedo()
      return
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      options.onDelete()
      return
    }

    if (e.key === 'ArrowUp') {
      options.onNavigate('prev')
      return
    }

    if (e.key === 'ArrowDown') {
      options.onNavigate('next')
      return
    }

    if (e.key === '?') {
      options.onToggleHelp()
      return
    }
  }

  onMounted(() => document.addEventListener('keydown', handleKeydown))
  onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
}
```

- [ ] **Step 4: Create ShortcutHelp component**

Create `components/editor/ShortcutHelp.vue`:

```vue
<script setup lang="ts">
defineEmits<{ (e: 'close'): void }>()

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
const mod = isMac ? '⌘' : 'Ctrl'

const shortcuts = [
  { keys: `${mod}+S`, action: 'Salvar alterações' },
  { keys: `${mod}+D`, action: 'Duplicar slide atual' },
  { keys: `${mod}+Z`, action: 'Desfazer' },
  { keys: `${mod}+Shift+Z`, action: 'Refazer' },
  { keys: '↑ / ↓', action: 'Navegar entre slides' },
  { keys: 'Delete', action: 'Excluir slide' },
  { keys: '?', action: 'Mostrar/esconder atalhos' },
  { keys: 'Esc', action: 'Fechar modal' },
]
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3>Atalhos do Editor</h3>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
        <div class="shortcut-list">
          <div v-for="s in shortcuts" :key="s.keys" class="shortcut-row">
            <kbd>{{ s.keys }}</kbd>
            <span>{{ s.action }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; min-width: 360px; max-width: 90vw; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-header h3 { font-size: 16px; color: #e6edf3; margin: 0; }
.close-btn { background: none; border: none; color: #8b949e; font-size: 20px; cursor: pointer; padding: 4px 8px; }
.close-btn:hover { color: #e6edf3; }
.shortcut-list { display: flex; flex-direction: column; gap: 8px; }
.shortcut-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.shortcut-row span { color: #8b949e; font-size: 13px; }
kbd { background: rgba(255,255,255,0.1); border: 1px solid #30363d; border-radius: 4px; padding: 3px 8px; font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #e6edf3; min-width: 80px; text-align: center; }
</style>
```

- [ ] **Step 5: Wire shortcuts in editor page**

In `pages/editor/[id].vue`, add to `<script setup>`:

```typescript
const showShortcutHelp = ref(false)

useEditorShortcuts({
  onSave: handleSave,
  onDuplicate: () => { if (currentSlide.value) duplicateSlide(currentSlide.value.id) },
  onDelete: () => { if (currentSlide.value && slides.value.length > 1) deleteSlide(currentSlide.value.id) },
  onNavigate: navigateSlide,
  onToggleHelp: () => { showShortcutHelp.value = !showShortcutHelp.value },
})
```

Add to template (after ThemeEditor and before ChangeLog):

```html
<EditorShortcutHelp v-if="showShortcutHelp" @close="showShortcutHelp = false" />
```

- [ ] **Step 6: Add keyboard icon to toolbar**

In `components/editor/EditorToolbar.vue`:

1. Add import: `import { Play, Download, Save, Palette, ChevronLeft, ChevronRight, ChevronDown, FileText, Package, Loader2, Keyboard } from 'lucide-vue-next'`
2. Add emit: `(e: 'toggleHelp'): void`
3. Add button in `toolbar-right`, before the Theme button:
   ```html
   <button class="btn" @click="emit('toggleHelp')" title="Atalhos (?)"><Keyboard :size="13" /></button>
   ```

Wire in `pages/editor/[id].vue`:
```html
@toggle-help="showShortcutHelp = !showShortcutHelp"
```

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add composables/useEditorShortcuts.ts \
  components/editor/ShortcutHelp.vue \
  tests/server/shortcuts.test.ts \
  pages/editor/\[id\].vue \
  components/editor/EditorToolbar.vue
git commit -m "feat: add keyboard shortcuts with help modal

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Drag & Drop Images

**Files:**
- Modify: `components/editor/SlidePreview.vue`
- Modify: `pages/editor/[id].vue`

- [ ] **Step 1: Add drag & drop handling to SlidePreview**

In `components/editor/SlidePreview.vue`:

1. Add new props and emits:

```typescript
const props = defineProps<{ slide: Slide; theme?: ThemeConfig; presentationId?: string }>()
const emit = defineEmits<{ (e: 'image-dropped', payload: { path: string; filename: string }): void }>()
```

2. Add state and handlers:

```typescript
const isDragging = ref(false)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.types.includes('Files')) {
    isDragging.value = true
  }
}

function onDragLeave() {
  isDragging.value = false
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false

  const file = e.dataTransfer?.files[0]
  if (!file || !file.type.startsWith('image/')) return
  if (!props.presentationId) return

  const formData = new FormData()
  formData.append('file', file)
  formData.append('presentation_id', props.presentationId)
  formData.append('type', 'image')

  try {
    const result = await $fetch<{ path: string; filename: string }>('/api/assets/upload', {
      method: 'POST',
      body: formData,
    })
    emit('image-dropped', result)
  } catch {
    // Upload failed silently
  }
}
```

3. Update the `.slide` div to include event handlers and overlay:

```html
<div class="slide" :style="{ background: bg, color: textColor }"
     @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
  <div v-if="isDragging" class="drop-overlay">
    <span>📷 Solte a imagem aqui</span>
  </div>
  <!-- ...existing template content... -->
</div>
```

4. Add CSS:

```css
.drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(233, 69, 96, 0.15);
  border: 2px dashed #e94560;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-size: 16px;
  font-weight: 600;
}
```

Also add `position: relative;` to the `.slide` class.

- [ ] **Step 2: Wire image-dropped event in editor page**

In `pages/editor/[id].vue`:

1. Add handler:

```typescript
function handleImageDrop(payload: { path: string; filename: string }) {
  if (!currentSlide.value) return
  const template = currentSlide.value.template
  const data = { ...(currentSlide.value.data as any) }

  if (template === 'cover') {
    data.background_image = payload.path
  } else if (template === 'bio') {
    data.photo_url = payload.path
  } else if (template === 'content' || template === 'diagram') {
    data.image = payload.path
  } else {
    return
  }

  updateSlide(currentSlide.value.id, { data })
}
```

2. Update the `<EditorSlidePreview>` in template:

```html
<EditorSlidePreview
  v-if="currentSlide"
  :slide="currentSlide"
  :theme="presentation.theme?.config"
  :presentation-id="presentationId"
  @image-dropped="handleImageDrop"
/>
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add components/editor/SlidePreview.vue pages/editor/\[id\].vue
git commit -m "feat: add drag & drop image upload on slides

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Undo/Redo

**Files:**
- Create: `composables/useUndoRedo.ts`
- Create: `tests/server/undo-redo.test.ts`
- Modify: `pages/editor/[id].vue`
- Modify: `components/editor/EditorToolbar.vue`

- [ ] **Step 1: Write undo/redo tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

interface SlideState {
  past: any[]
  present: any
  future: any[]
}

function createUndoRedo(maxHistory = 50) {
  const slides = new Map<string, SlideState>()

  function getOrCreate(slideId: string, initial: any): SlideState {
    if (!slides.has(slideId)) {
      slides.set(slideId, { past: [], present: structuredClone(initial), future: [] })
    }
    return slides.get(slideId)!
  }

  function pushState(slideId: string, current: any, incoming: any) {
    const state = getOrCreate(slideId, current)
    state.past.push(structuredClone(state.present))
    if (state.past.length > maxHistory) state.past.shift()
    state.present = structuredClone(incoming)
    state.future = []
  }

  function undo(slideId: string): any | null {
    const state = slides.get(slideId)
    if (!state || state.past.length === 0) return null
    state.future.push(structuredClone(state.present))
    state.present = state.past.pop()!
    return structuredClone(state.present)
  }

  function redo(slideId: string): any | null {
    const state = slides.get(slideId)
    if (!state || state.future.length === 0) return null
    state.past.push(structuredClone(state.present))
    state.present = state.future.pop()!
    return structuredClone(state.present)
  }

  function canUndo(slideId: string): boolean {
    return (slides.get(slideId)?.past.length ?? 0) > 0
  }

  function canRedo(slideId: string): boolean {
    return (slides.get(slideId)?.future.length ?? 0) > 0
  }

  function clear(slideId?: string) {
    if (slideId) {
      slides.delete(slideId)
    } else {
      slides.clear()
    }
  }

  return { pushState, undo, redo, canUndo, canRedo, clear }
}

describe('useUndoRedo', () => {
  let ur: ReturnType<typeof createUndoRedo>

  beforeEach(() => {
    ur = createUndoRedo(50)
  })

  it('undo returns previous state', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    const prev = ur.undo('s1')
    expect(prev).toEqual({ title: 'A' })
  })

  it('redo returns undone state', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    ur.undo('s1')
    const redone = ur.redo('s1')
    expect(redone).toEqual({ title: 'B' })
  })

  it('undo returns null when no history', () => {
    expect(ur.undo('s1')).toBeNull()
  })

  it('redo returns null when no future', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    expect(ur.redo('s1')).toBeNull()
  })

  it('new edit clears redo stack', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    ur.undo('s1')
    expect(ur.canRedo('s1')).toBe(true)
    ur.pushState('s1', { title: 'A' }, { title: 'C' })
    expect(ur.canRedo('s1')).toBe(false)
  })

  it('respects maxHistory limit', () => {
    const ur3 = createUndoRedo(3)
    ur3.pushState('s1', { v: 0 }, { v: 1 })
    ur3.pushState('s1', { v: 1 }, { v: 2 })
    ur3.pushState('s1', { v: 2 }, { v: 3 })
    ur3.pushState('s1', { v: 3 }, { v: 4 })

    expect(ur3.canUndo('s1')).toBe(true)
    ur3.undo('s1')
    ur3.undo('s1')
    ur3.undo('s1')
    expect(ur3.canUndo('s1')).toBe(false)
  })

  it('tracks slides independently', () => {
    ur.pushState('s1', { title: 'A1' }, { title: 'B1' })
    ur.pushState('s2', { title: 'A2' }, { title: 'B2' })

    expect(ur.undo('s1')).toEqual({ title: 'A1' })
    expect(ur.canUndo('s2')).toBe(true)
  })

  it('canUndo and canRedo return correct values', () => {
    expect(ur.canUndo('s1')).toBe(false)
    expect(ur.canRedo('s1')).toBe(false)

    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    expect(ur.canUndo('s1')).toBe(true)
    expect(ur.canRedo('s1')).toBe(false)

    ur.undo('s1')
    expect(ur.canUndo('s1')).toBe(false)
    expect(ur.canRedo('s1')).toBe(true)
  })

  it('clear removes all history for a slide', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    ur.clear('s1')
    expect(ur.canUndo('s1')).toBe(false)
  })

  it('clear without arg removes all slides', () => {
    ur.pushState('s1', { title: 'A' }, { title: 'B' })
    ur.pushState('s2', { title: 'C' }, { title: 'D' })
    ur.clear()
    expect(ur.canUndo('s1')).toBe(false)
    expect(ur.canUndo('s2')).toBe(false)
  })

  it('deep clones state to prevent reference mutation', () => {
    const original = { title: 'A', bullets: ['x'] }
    ur.pushState('s1', original, { title: 'B', bullets: ['y'] })
    original.title = 'MUTATED'
    const prev = ur.undo('s1')
    expect(prev!.title).toBe('A')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- tests/server/undo-redo.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Write the composable**

Create `composables/useUndoRedo.ts`:

```typescript
interface SlideState {
  past: any[]
  present: any
  future: any[]
}

export function useUndoRedo(maxHistory = 50) {
  const slides = new Map<string, SlideState>()

  function getOrCreate(slideId: string, initial: any): SlideState {
    if (!slides.has(slideId)) {
      slides.set(slideId, { past: [], present: structuredClone(initial), future: [] })
    }
    return slides.get(slideId)!
  }

  function pushState(slideId: string, current: any, incoming: any) {
    const state = getOrCreate(slideId, current)
    state.past.push(structuredClone(state.present))
    if (state.past.length > maxHistory) state.past.shift()
    state.present = structuredClone(incoming)
    state.future = []
  }

  function undo(slideId: string): any | null {
    const state = slides.get(slideId)
    if (!state || state.past.length === 0) return null
    state.future.push(structuredClone(state.present))
    state.present = state.past.pop()!
    return structuredClone(state.present)
  }

  function redo(slideId: string): any | null {
    const state = slides.get(slideId)
    if (!state || state.future.length === 0) return null
    state.past.push(structuredClone(state.present))
    state.present = state.future.pop()!
    return structuredClone(state.present)
  }

  function canUndo(slideId: string): boolean {
    return (slides.get(slideId)?.past.length ?? 0) > 0
  }

  function canRedo(slideId: string): boolean {
    return (slides.get(slideId)?.future.length ?? 0) > 0
  }

  function clear(slideId?: string) {
    if (slideId) {
      slides.delete(slideId)
    } else {
      slides.clear()
    }
  }

  return { pushState, undo, redo, canUndo, canRedo, clear }
}
```

- [ ] **Step 4: Wire undo/redo in editor page**

In `pages/editor/[id].vue`:

1. Initialize undo/redo:
   ```typescript
   const undoRedo = useUndoRedo()
   ```

2. Modify `updateSlide` to push state before applying:
   ```typescript
   function updateSlide(_slideId: string, updates: Partial<Slide>) {
     const id = _slideId
     const slide = slides.value.find(s => s.id === id)
     if (slide && updates.data) {
       undoRedo.pushState(id, slide.data, updates.data)
     }
     localEdits.value[id] = { ...localEdits.value[id], ...updates }
   }
   ```

3. Add undo/redo handlers:
   ```typescript
   function handleUndo() {
     if (!currentSlide.value) return
     const prev = undoRedo.undo(currentSlide.value.id)
     if (prev) {
       localEdits.value[currentSlide.value.id] = {
         ...localEdits.value[currentSlide.value.id],
         data: prev,
       }
     }
   }

   function handleRedo() {
     if (!currentSlide.value) return
     const next = undoRedo.redo(currentSlide.value.id)
     if (next) {
       localEdits.value[currentSlide.value.id] = {
         ...localEdits.value[currentSlide.value.id],
         data: next,
       }
     }
   }
   ```

4. Add computed for toolbar buttons:
   ```typescript
   const canUndo = computed(() => currentSlide.value ? undoRedo.canUndo(currentSlide.value.id) : false)
   const canRedo = computed(() => currentSlide.value ? undoRedo.canRedo(currentSlide.value.id) : false)
   ```

5. Update `useEditorShortcuts` call to include undo/redo:
   ```typescript
   useEditorShortcuts({
     onSave: handleSave,
     onDuplicate: () => { if (currentSlide.value) duplicateSlide(currentSlide.value.id) },
     onDelete: () => { if (currentSlide.value && slides.value.length > 1) deleteSlide(currentSlide.value.id) },
     onNavigate: navigateSlide,
     onToggleHelp: () => { showShortcutHelp.value = !showShortcutHelp.value },
     onUndo: handleUndo,
     onRedo: handleRedo,
   })
   ```

6. Pass undo/redo state to toolbar:
   ```html
   <EditorToolbar
     ...existing props...
     :can-undo="canUndo"
     :can-redo="canRedo"
     @undo="handleUndo"
     @redo="handleRedo"
   />
   ```

- [ ] **Step 5: Add undo/redo buttons to toolbar**

In `components/editor/EditorToolbar.vue`:

1. Add imports: `import { ..., Undo2, Redo2 } from 'lucide-vue-next'`
2. Add props: `canUndo?: boolean; canRedo?: boolean`
3. Add emits: `(e: 'undo'): void; (e: 'redo'): void`
4. Add buttons in `toolbar-center`, after the slide navigation:
   ```html
   <div class="separator" />
   <button class="nav-btn" @click="emit('undo')" :disabled="!canUndo" title="Desfazer (Ctrl+Z)"><Undo2 :size="14" /></button>
   <button class="nav-btn" @click="emit('redo')" :disabled="!canRedo" title="Refazer (Ctrl+Shift+Z)"><Redo2 :size="14" /></button>
   ```
5. Add CSS:
   ```css
   .separator { width: 1px; height: 20px; background: #30363d; margin: 0 4px; }
   ```

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add composables/useUndoRedo.ts \
  tests/server/undo-redo.test.ts \
  pages/editor/\[id\].vue \
  components/editor/EditorToolbar.vue
git commit -m "feat: add undo/redo with Ctrl+Z / Ctrl+Shift+Z

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Final push

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Push to master**

```bash
git push origin master
```
