# Excalidraw Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Excalidraw as a visual drag-and-drop diagram editor, available in Diagram, Content, and Cover slides, with SVG export for Slidev.

**Architecture:** Excalidraw runs as a standalone React app in `public/excalidraw-editor/index.html`, loaded via CDN. Vue communicates with it via `postMessage` through an iframe wrapped in `ExcalidrawModal.vue`. SVG output is saved as asset files for Slidev markdown generation.

**Tech Stack:** Excalidraw (React, loaded via CDN), Vue 3 / Nuxt 4, postMessage API, SVG export

---

## Task 1: Update Types + Markdown Generator + Test

**Files:**
- Modify: `types/index.ts`
- Modify: `server/utils/markdown.ts`
- Modify: `tests/server/markdown.test.ts`

- [ ] **Step 1: Write the failing test for excalidraw diagram**

Add this test at the end of the `describe('generateMarkdown')` block in `tests/server/markdown.test.ts`:

```ts
  it('generates excalidraw diagram slide with image path', () => {
    const slides: Slide[] = [{
      id: '1', presentation_id: 'p1', order: 0, template: 'diagram',
      data: {
        title: 'System Architecture',
        diagram_type: 'excalidraw',
        image: './assets/excalidraw-1.svg',
        caption: 'Overview',
      },
    }]
    const md = generateMarkdown('Test', slides, theme)
    expect(md).toContain('layout: center')
    expect(md).toContain('# System Architecture')
    expect(md).toContain('![Overview](./assets/excalidraw-1.svg)')
  })
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/luizschons/Documents/codes/slide-builder && npx vitest run tests/server/markdown.test.ts
```

Expected: FAIL — TypeScript error because `'excalidraw'` is not in `diagram_type` union yet.

- [ ] **Step 3: Update DiagramData type**

In `types/index.ts`, replace the existing `DiagramData` interface:

```ts
export interface DiagramData {
  title: string
  diagram_type: 'mermaid' | 'image' | 'embed' | 'excalidraw'
  mermaid_code?: string
  image?: string
  embed_url?: string
  caption?: string
  excalidraw_scene?: string
  excalidraw_svg?: string
}
```

- [ ] **Step 4: Add excalidraw case to markdown generator**

In `server/utils/markdown.ts`, in the `generateDiagram` function, add the excalidraw case. Replace:

```ts
  if (data.diagram_type === 'mermaid' && data.mermaid_code) {
    lines.push('```mermaid', data.mermaid_code, '```')
  } else if (data.diagram_type === 'image' && data.image) {
```

With:

```ts
  if (data.diagram_type === 'mermaid' && data.mermaid_code) {
    lines.push('```mermaid', data.mermaid_code, '```')
  } else if (data.diagram_type === 'excalidraw' && data.image) {
    lines.push(`![${data.caption || ''}](${data.image})`)
  } else if (data.diagram_type === 'image' && data.image) {
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/luizschons/Documents/codes/slide-builder && npx vitest run
```

Expected: All 13 tests PASS (8 previous markdown + 1 new excalidraw + 4 db).

- [ ] **Step 6: Commit**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
git add types/index.ts server/utils/markdown.ts tests/server/markdown.test.ts
git commit -m "feat: add excalidraw diagram type + markdown generation support

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: SVG Save API Endpoint

**Files:**
- Create: `server/api/assets/save-svg.post.ts`

- [ ] **Step 1: Create the save-svg endpoint**

Create `server/api/assets/save-svg.post.ts`:

```ts
import { getDb } from '../../utils/db'
import { v4 as uuid } from 'uuid'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.presentation_id || !body.slide_id || !body.svg) {
    throw createError({ statusCode: 400, message: 'presentation_id, slide_id, and svg required' })
  }

  const db = getDb()
  const filename = `excalidraw-${body.slide_id}.svg`
  const dir = join(process.cwd(), 'data', 'assets', body.presentation_id)
  mkdirSync(dir, { recursive: true })

  const filePath = join(dir, filename)
  writeFileSync(filePath, body.svg, 'utf-8')

  const relativePath = `data/assets/${body.presentation_id}/${filename}`

  // Upsert asset record — delete old if exists, then insert new
  const existing = db.prepare(
    'SELECT id FROM assets WHERE presentation_id = ? AND filename = ?'
  ).get(body.presentation_id, filename) as any

  if (existing) {
    db.prepare('UPDATE assets SET path = ? WHERE id = ?').run(relativePath, existing.id)
  } else {
    const id = uuid()
    db.prepare(
      'INSERT INTO assets (id, presentation_id, filename, path, type) VALUES (?, ?, ?, ?, ?)'
    ).run(id, body.presentation_id, filename, relativePath, 'image')
  }

  return { path: relativePath, filename }
})
```

- [ ] **Step 2: Commit**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
git add server/api/assets/save-svg.post.ts
git commit -m "feat: SVG save API endpoint for Excalidraw export

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Excalidraw Standalone Editor (public HTML)

**Files:**
- Create: `public/excalidraw-editor/index.html`

- [ ] **Step 1: Create the standalone Excalidraw editor**

Create `public/excalidraw-editor/index.html`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Excalidraw Editor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; overflow: hidden; }
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 8px 16px; background: rgba(0,0,0,0.8);
    }
    .toolbar button {
      padding: 8px 20px; border: none; border-radius: 6px;
      font-size: 14px; cursor: pointer; font-weight: 600;
    }
    .btn-save { background: #e94560; color: white; }
    .btn-save:hover { background: #d63851; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel { background: #30363d; color: #e6edf3; }
    .btn-cancel:hover { background: #484f58; }
    .loading {
      display: flex; align-items: center; justify-content: center;
      height: 100%; background: #1a1a2e; color: #e6edf3;
      font-family: Inter, sans-serif; font-size: 16px;
    }
  </style>
</head>
<body>
  <div id="root"><div class="loading">Carregando Excalidraw...</div></div>

  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@excalidraw/excalidraw/dist/excalidraw.production.min.js" crossorigin></script>

  <script>
    const { createElement: h, useRef, useState, useEffect, useCallback } = React;
    const { Excalidraw, exportToSvg } = ExcalidrawLib;

    function App() {
      const excalidrawRef = useRef(null);
      const [saving, setSaving] = useState(false);
      const [initialData, setInitialData] = useState(null);
      const [ready, setReady] = useState(false);

      useEffect(() => {
        function handleMessage(e) {
          if (e.data && e.data.type === 'load') {
            if (e.data.scene) {
              try {
                setInitialData(JSON.parse(e.data.scene));
              } catch { /* ignore parse errors */ }
            }
            setReady(true);
          }
        }
        window.addEventListener('message', handleMessage);
        // Tell parent we're ready to receive data
        window.parent.postMessage({ type: 'ready' }, '*');
        return () => window.removeEventListener('message', handleMessage);
      }, []);

      const handleSave = useCallback(async () => {
        if (!excalidrawRef.current || saving) return;
        setSaving(true);
        try {
          const api = excalidrawRef.current;
          const elements = api.getSceneElements();
          const appState = api.getAppState();
          const files = api.getFiles();

          const svgElement = await exportToSvg({
            elements: elements,
            appState: { ...appState, exportWithDarkMode: true, exportBackground: false },
            files: files,
          });
          const svgString = new XMLSerializer().serializeToString(svgElement);

          const scene = JSON.stringify({ elements, appState: { viewBackgroundColor: appState.viewBackgroundColor }, files });

          window.parent.postMessage({ type: 'save', scene, svg: svgString }, '*');
        } catch (err) {
          console.error('Save failed:', err);
        } finally {
          setSaving(false);
        }
      }, [saving]);

      const handleCancel = useCallback(() => {
        window.parent.postMessage({ type: 'close' }, '*');
      }, []);

      if (!ready) {
        return h('div', { className: 'loading' }, 'Carregando Excalidraw...');
      }

      return h('div', { style: { width: '100%', height: '100%' } },
        h('div', { className: 'toolbar' },
          h('button', { className: 'btn-cancel', onClick: handleCancel }, 'Cancelar'),
          h('button', { className: 'btn-save', onClick: handleSave, disabled: saving },
            saving ? 'Salvando...' : '💾 Salvar'
          ),
        ),
        h('div', { style: { width: '100%', height: '100%', paddingTop: '44px' } },
          h(Excalidraw, {
            ref: excalidrawRef,
            initialData: initialData || undefined,
            theme: 'dark',
            langCode: 'pt-BR',
          })
        )
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(h(App));
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
git add public/excalidraw-editor/index.html
git commit -m "feat: standalone Excalidraw editor loaded via CDN

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: ExcalidrawModal Vue Component

**Files:**
- Create: `components/editor/ExcalidrawModal.vue`

- [ ] **Step 1: Create ExcalidrawModal**

Create `components/editor/ExcalidrawModal.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  scene?: string
  darkMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', payload: { scene: string; svg: string }): void
  (e: 'close'): void
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)

function onIframeLoad() {
  loaded.value = true
}

function sendScene() {
  if (!iframeRef.value?.contentWindow) return
  iframeRef.value.contentWindow.postMessage({
    type: 'load',
    scene: props.scene || null,
    darkMode: props.darkMode ?? true,
  }, '*')
}

function handleMessage(event: MessageEvent) {
  if (!event.data || typeof event.data.type !== 'string') return

  if (event.data.type === 'ready') {
    sendScene()
  } else if (event.data.type === 'save') {
    emit('save', { scene: event.data.scene, svg: event.data.svg })
  } else if (event.data.type === 'close') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div class="excalidraw-overlay" @click.self="emit('close')">
    <div class="excalidraw-modal">
      <iframe
        ref="iframeRef"
        src="/excalidraw-editor/index.html"
        class="excalidraw-iframe"
        @load="onIframeLoad"
      />
      <div v-if="!loaded" class="loading">Carregando editor...</div>
    </div>
  </div>
</template>

<style scoped>
.excalidraw-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
}
.excalidraw-modal {
  width: 92vw; height: 90vh;
  border-radius: 12px; overflow: hidden;
  background: #1a1a2e;
  position: relative;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}
.excalidraw-iframe {
  width: 100%; height: 100%; border: none;
}
.loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #8b949e; font-size: 14px; font-family: Inter, sans-serif;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
git add components/editor/ExcalidrawModal.vue
git commit -m "feat: ExcalidrawModal Vue component with iframe + postMessage bridge

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Update DiagramFields with Excalidraw Option

**Files:**
- Modify: `components/templates/DiagramFields.vue`

- [ ] **Step 1: Update DiagramFields**

Replace the entire content of `components/templates/DiagramFields.vue`:

```vue
<script setup lang="ts">
import type { DiagramData } from '~/types'
const props = defineProps<{ data: DiagramData; presentationId?: string; slideId?: string }>()
const emit = defineEmits<{ (e: 'update', data: DiagramData): void }>()

const showExcalidraw = ref(false)

function update(field: keyof DiagramData, value: string) {
  emit('update', { ...props.data, [field]: value })
}

async function onExcalidrawSave(payload: { scene: string; svg: string }) {
  showExcalidraw.value = false

  // Save SVG as asset file
  let imagePath = ''
  if (props.presentationId && props.slideId) {
    const result = await $fetch('/api/assets/save-svg', {
      method: 'POST',
      body: {
        presentation_id: props.presentationId,
        slide_id: props.slideId,
        svg: payload.svg,
      },
    })
    imagePath = (result as any).path
  }

  emit('update', {
    ...props.data,
    diagram_type: 'excalidraw',
    excalidraw_scene: payload.scene,
    excalidraw_svg: payload.svg,
    image: imagePath || undefined,
  })
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>

    <label>Tipo
      <select :value="data.diagram_type" @change="update('diagram_type', ($event.target as HTMLSelectElement).value)">
        <option value="mermaid">Mermaid</option>
        <option value="excalidraw">Excalidraw</option>
        <option value="image">Imagem</option>
        <option value="embed">Embed (iframe)</option>
      </select>
    </label>

    <template v-if="data.diagram_type === 'excalidraw'">
      <button class="excalidraw-btn" @click="showExcalidraw = true">
        ✏️ {{ data.excalidraw_svg ? 'Editar no Excalidraw' : 'Abrir Excalidraw' }}
      </button>
      <div v-if="data.excalidraw_svg" class="svg-thumb" v-html="data.excalidraw_svg" />
    </template>

    <label v-if="data.diagram_type === 'mermaid'">Código Mermaid
      <textarea :value="data.mermaid_code" @input="update('mermaid_code', ($event.target as HTMLTextAreaElement).value)" rows="8" class="code" placeholder="graph TD&#10;  A-->B" />
    </label>

    <label v-if="data.diagram_type === 'embed'">URL do embed
      <input :value="data.embed_url" @input="update('embed_url', ($event.target as HTMLInputElement).value)" placeholder="https://..." />
    </label>

    <label>Legenda (opcional)<input :value="data.caption" @input="update('caption', ($event.target as HTMLInputElement).value)" /></label>

    <ExcalidrawModal
      v-if="showExcalidraw"
      :scene="data.excalidraw_scene"
      @save="onExcalidrawSave"
      @close="showExcalidraw = false"
    />
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, textarea, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.code { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.excalidraw-btn { background: #533483; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
.excalidraw-btn:hover { background: #6b44a8; }
.svg-thumb { margin-top: 8px; background: rgba(255,255,255,0.03); border: 1px solid #30363d; border-radius: 6px; padding: 8px; max-height: 150px; overflow: hidden; }
.svg-thumb :deep(svg) { width: 100%; height: auto; max-height: 140px; }
</style>
```

- [ ] **Step 2: Update SlideProperties to pass presentationId and slideId to DiagramFields**

In `components/editor/SlideProperties.vue`, the DiagramFields component needs `presentationId` and `slideId` props. Replace the DiagramFields line:

```vue
    <DiagramFields v-else-if="slide.template === 'diagram'" :data="slide.data as any" @update="onDataUpdate" />
```

With:

```vue
    <DiagramFields v-else-if="slide.template === 'diagram'" :data="slide.data as any" :presentation-id="presentationId" :slide-id="slide.id" @update="onDataUpdate" />
```

- [ ] **Step 3: Commit**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
git add components/templates/DiagramFields.vue components/editor/SlideProperties.vue
git commit -m "feat: Excalidraw option in DiagramFields with edit button + SVG save

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Update ContentFields + CoverFields with Excalidraw Button

**Files:**
- Modify: `components/templates/ContentFields.vue`
- Modify: `components/templates/CoverFields.vue`

- [ ] **Step 1: Update ContentFields**

Replace the entire content of `components/templates/ContentFields.vue`:

```vue
<script setup lang="ts">
import type { ContentData } from '~/types'
const props = defineProps<{ data: ContentData; presentationId?: string; slideId?: string }>()
const emit = defineEmits<{ (e: 'update', data: ContentData): void }>()

const showExcalidraw = ref(false)

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

async function onExcalidrawSave(payload: { scene: string; svg: string }) {
  showExcalidraw.value = false
  if (props.presentationId && props.slideId) {
    const result = await $fetch('/api/assets/save-svg', {
      method: 'POST',
      body: {
        presentation_id: props.presentationId,
        slide_id: props.slideId,
        svg: payload.svg,
      },
    })
    emit('update', { ...props.data, image: (result as any).path })
  }
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

    <label>Imagem (path)<input :value="data.image" @input="emit('update', { ...data, image: ($event.target as HTMLInputElement).value })" placeholder="caminho da imagem..." /></label>
    <button class="excalidraw-btn" @click="showExcalidraw = true">🎨 Criar/editar imagem com Excalidraw</button>

    <ExcalidrawModal
      v-if="showExcalidraw"
      @save="onExcalidrawSave"
      @close="showExcalidraw = false"
    />
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
.excalidraw-btn { background: #533483; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
.excalidraw-btn:hover { background: #6b44a8; }
</style>
```

- [ ] **Step 2: Update CoverFields**

Replace the entire content of `components/templates/CoverFields.vue`:

```vue
<script setup lang="ts">
import type { CoverData } from '~/types'
const props = defineProps<{ data: CoverData; presentationId?: string; slideId?: string }>()
const emit = defineEmits<{ (e: 'update', data: CoverData): void }>()

const showExcalidraw = ref(false)

function update(field: keyof CoverData, value: string) {
  emit('update', { ...props.data, [field]: value })
}

async function onExcalidrawSave(payload: { scene: string; svg: string }) {
  showExcalidraw.value = false
  if (props.presentationId && props.slideId) {
    const result = await $fetch('/api/assets/save-svg', {
      method: 'POST',
      body: {
        presentation_id: props.presentationId,
        slide_id: props.slideId,
        svg: payload.svg,
      },
    })
    emit('update', { ...props.data, background_image: (result as any).path })
  }
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>
    <label>Subtítulo<input :value="data.subtitle" @input="update('subtitle', ($event.target as HTMLInputElement).value)" /></label>
    <label>Autor<input :value="data.author" @input="update('author', ($event.target as HTMLInputElement).value)" /></label>
    <label>Background image (path)<input :value="data.background_image" @input="update('background_image', ($event.target as HTMLInputElement).value)" placeholder="caminho da imagem..." /></label>
    <button class="excalidraw-btn" @click="showExcalidraw = true">🎨 Editar background com Excalidraw</button>

    <ExcalidrawModal
      v-if="showExcalidraw"
      @save="onExcalidrawSave"
      @close="showExcalidraw = false"
    />
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
.excalidraw-btn { background: #533483; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
.excalidraw-btn:hover { background: #6b44a8; }
</style>
```

- [ ] **Step 3: Update SlideProperties to pass presentationId and slideId to ContentFields and CoverFields**

In `components/editor/SlideProperties.vue`, replace:

```vue
    <CoverFields v-if="slide.template === 'cover'" :data="slide.data as any" @update="onDataUpdate" />
    <SectionFields v-else-if="slide.template === 'section'" :data="slide.data as any" @update="onDataUpdate" />
    <ContentFields v-else-if="slide.template === 'content'" :data="slide.data as any" @update="onDataUpdate" />
```

With:

```vue
    <CoverFields v-if="slide.template === 'cover'" :data="slide.data as any" :presentation-id="presentationId" :slide-id="slide.id" @update="onDataUpdate" />
    <SectionFields v-else-if="slide.template === 'section'" :data="slide.data as any" @update="onDataUpdate" />
    <ContentFields v-else-if="slide.template === 'content'" :data="slide.data as any" :presentation-id="presentationId" :slide-id="slide.id" @update="onDataUpdate" />
```

- [ ] **Step 4: Commit**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
git add components/templates/ContentFields.vue components/templates/CoverFields.vue components/editor/SlideProperties.vue
git commit -m "feat: Excalidraw buttons in ContentFields + CoverFields

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Update SlidePreview for Excalidraw

**Files:**
- Modify: `components/editor/SlidePreview.vue`

- [ ] **Step 1: Update the diagram preview section**

In `components/editor/SlidePreview.vue`, replace the Diagram template section:

```vue
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
```

With:

```vue
      <!-- Diagram -->
      <template v-else-if="slide.template === 'diagram'">
        <div class="diagram-slide">
          <h1>{{ (slide.data as DiagramData).title }}</h1>
          <div class="diagram-placeholder">
            <template v-if="(slide.data as DiagramData).diagram_type === 'mermaid'">
              <pre class="mermaid-preview">{{ (slide.data as DiagramData).mermaid_code }}</pre>
            </template>
            <template v-else-if="(slide.data as DiagramData).diagram_type === 'excalidraw'">
              <div v-if="(slide.data as DiagramData).excalidraw_svg" class="excalidraw-preview" v-html="(slide.data as DiagramData).excalidraw_svg" />
              <span v-else class="placeholder-text">🎨 Excalidraw</span>
            </template>
            <template v-else>
              <span class="placeholder-text">{{ (slide.data as DiagramData).diagram_type === 'image' ? '🖼 Imagem' : '🔗 Embed' }}</span>
            </template>
          </div>
        </div>
      </template>
```

- [ ] **Step 2: Add excalidraw-preview style**

In the `<style scoped>` section, add after `.mermaid-preview`:

```css
.excalidraw-preview { max-height: 200px; overflow: hidden; }
.excalidraw-preview :deep(svg) { width: 100%; height: auto; max-height: 200px; }
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/luizschons/Documents/codes/slide-builder && npx vitest run
```

Expected: All 13 tests PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/luizschons/Documents/codes/slide-builder
git add components/editor/SlidePreview.vue
git commit -m "feat: Excalidraw SVG preview in slide preview component

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Types + Markdown + Test | `types/index.ts`, `server/utils/markdown.ts`, `tests/server/markdown.test.ts` |
| 2 | SVG Save API | `server/api/assets/save-svg.post.ts` |
| 3 | Standalone Excalidraw editor | `public/excalidraw-editor/index.html` |
| 4 | ExcalidrawModal Vue component | `components/editor/ExcalidrawModal.vue` |
| 5 | DiagramFields + excalidraw option | `components/templates/DiagramFields.vue`, `components/editor/SlideProperties.vue` |
| 6 | ContentFields + CoverFields buttons | `components/templates/ContentFields.vue`, `components/templates/CoverFields.vue`, `components/editor/SlideProperties.vue` |
| 7 | SlidePreview excalidraw rendering | `components/editor/SlidePreview.vue` |
