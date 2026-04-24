# Excalidraw Integration — Design Spec

## Overview

Add Excalidraw as a visual diagram editor to the Slide Builder app. Users can create and edit diagrams by dragging, drawing, and arranging elements visually (like a whiteboard), instead of writing code (Mermaid). Excalidraw runs as an isolated React app in an iframe, communicating with the Vue host via `postMessage`.

## Architecture

### Isolation Strategy: Iframe + postMessage

Excalidraw is a React library. Our app is Nuxt/Vue. To avoid framework conflicts:

- **Excalidraw runs as a standalone React app** served from `public/excalidraw-editor/index.html`
- **Vue wraps it in a modal** via `<iframe>` in `components/editor/ExcalidrawModal.vue`
- **Communication** via `window.postMessage`:
  - Vue → Excalidraw: `{ type: 'load', scene: {...}, darkMode: true }`
  - Excalidraw → Vue: `{ type: 'save', scene: {...}, svg: '...' }`
  - Excalidraw → Vue: `{ type: 'close' }`

### File Structure

```
public/excalidraw-editor/
  index.html          # Standalone React app with Excalidraw (bundled via CDN)

components/editor/
  ExcalidrawModal.vue  # Vue modal wrapping iframe + postMessage bridge

# Modified existing files:
types/index.ts                          # DiagramData gains excalidraw fields
components/templates/DiagramFields.vue  # Add excalidraw option + edit button
components/templates/ContentFields.vue  # Add "Edit with Excalidraw" button for image
components/templates/CoverFields.vue    # Add "Edit with Excalidraw" button for background
components/editor/SlidePreview.vue      # Render SVG inline for excalidraw diagrams
server/utils/markdown.ts                # Handle excalidraw SVG in diagram generation
server/api/assets/save-svg.post.ts      # New endpoint to save SVG from Excalidraw
tests/server/markdown.test.ts           # Add test for excalidraw diagram type
```

## Data Model Changes

### DiagramData (types/index.ts)

```ts
export interface DiagramData {
  title: string
  diagram_type: 'mermaid' | 'image' | 'embed' | 'excalidraw'  // +excalidraw
  mermaid_code?: string
  image?: string
  embed_url?: string
  caption?: string
  excalidraw_scene?: string   // JSON string of Excalidraw scene (for re-editing)
  excalidraw_svg?: string     // Exported SVG string (for preview and Slidev)
}
```

No database schema changes needed — `excalidraw_scene` and `excalidraw_svg` are stored in the `data` JSON column of the `slides` table.

### Usage in non-Diagram slides

When Excalidraw is used in Content or Cover slides:
- The exported SVG is saved as a file asset via `POST /api/assets/save-svg`
- The file path is stored in the existing `image` (Content) or `background_image` (Cover) field
- The scene JSON is stored in a transient way (in the asset metadata or as a separate field)

## Excalidraw Editor (public/excalidraw-editor/index.html)

A self-contained HTML file that:
1. Loads Excalidraw from CDN (`@excalidraw/excalidraw` UMD bundle + React/ReactDOM)
2. Listens for `message` events from parent to load scene data
3. Renders full-screen Excalidraw editor with dark mode
4. Has a "Salvar" (Save) button that:
   - Exports scene as SVG via `exportToSvg()`
   - Sends `{ type: 'save', scene, svg }` to parent via `postMessage`
5. Has a "Cancelar" (Cancel) button that sends `{ type: 'close' }`

### CDN Dependencies
- `react` and `react-dom` (required by Excalidraw)
- `@excalidraw/excalidraw` UMD bundle

## ExcalidrawModal.vue

Vue component that:
1. Opens a full-screen modal (90% viewport) with iframe
2. On mount, sends scene data to iframe via `postMessage`
3. Listens for `message` events from iframe
4. On `save`: emits `save` event with `{ scene: string, svg: string }`
5. On `close`: emits `close` event
6. Dark background overlay, close on overlay click

Props:
- `scene?: string` — existing scene JSON to load (for re-editing)
- `darkMode?: boolean` — pass theme preference

Events:
- `save(payload: { scene: string, svg: string })`
- `close()`

## Where the Edit Button Appears

### DiagramFields.vue
When `diagram_type === 'excalidraw'`:
- Show "✏️ Editar no Excalidraw" button (opens modal)
- Show SVG preview thumbnail if `excalidraw_svg` exists
- Caption field remains available

### ContentFields.vue
- New button "🎨 Criar/editar imagem com Excalidraw" below the image field
- Opens Excalidraw modal
- On save: SVG saved as asset file, path set to `image` field

### CoverFields.vue
- New button "🎨 Editar background com Excalidraw" below background_image field
- Opens Excalidraw modal
- On save: SVG saved as asset file, path set to `background_image` field

## SVG Save API

### POST /api/assets/save-svg

Saves an SVG string as a file asset.

Request body:
```json
{
  "presentation_id": "uuid",
  "slide_id": "uuid",
  "svg": "<svg>...</svg>",
  "filename": "excalidraw-slide-uuid.svg"
}
```

Response:
```json
{
  "path": "data/assets/{presentationId}/excalidraw-{slideId}.svg"
}
```

## Markdown Generation

In `server/utils/markdown.ts`, the `generateDiagram` function adds a case:

```ts
if (data.diagram_type === 'excalidraw' && data.image) {
  lines.push(`![${data.caption || ''}](${data.image})`)
}
```

When Excalidraw is used, the SVG is saved as a file and referenced via image path (same as `diagram_type === 'image'`). The `image` field is set to the asset path after saving the SVG file.

## Preview Rendering

In `SlidePreview.vue`, when `diagram_type === 'excalidraw'`:
- If `excalidraw_svg` exists: render SVG inline via `v-html`
- If not: show placeholder "🎨 Excalidraw (clique para editar)"

## Testing

Add 1 test to `tests/server/markdown.test.ts`:
- Test that excalidraw diagram with image path generates correct markdown (`![caption](path)`)

## Summary of Changes

| File | Change |
|------|--------|
| `types/index.ts` | Add `'excalidraw'` to `diagram_type`, add `excalidraw_scene?`, `excalidraw_svg?` |
| `public/excalidraw-editor/index.html` | NEW — standalone Excalidraw React app |
| `components/editor/ExcalidrawModal.vue` | NEW — Vue modal with iframe bridge |
| `components/templates/DiagramFields.vue` | Add excalidraw option + edit button |
| `components/templates/ContentFields.vue` | Add Excalidraw button for image |
| `components/templates/CoverFields.vue` | Add Excalidraw button for background |
| `components/editor/SlidePreview.vue` | Render excalidraw SVG inline |
| `server/utils/markdown.ts` | Handle excalidraw diagram type |
| `server/api/assets/save-svg.post.ts` | NEW — save SVG file endpoint |
| `tests/server/markdown.test.ts` | Add excalidraw test case |
