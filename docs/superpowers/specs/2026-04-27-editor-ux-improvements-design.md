# Editor UX Improvements — Design Spec

**Goal:** 5 independent UX features for the slide editor, each committed separately with tests, docs, and Swagger updates.

**Delivery:** Direct commits to master, one per feature.

---

## Feature 1: Duplicate Slide

**What:** Duplicate a slide within the same presentation, inserting the copy immediately after the original.

### API

**Endpoint:** `POST /api/presentations/:presId/slides/:slideId/duplicate`

**Auth:** Requires ownership of the presentation (same `requireOwnership` pattern).

**Logic:**
1. Fetch the source slide by `slideId` (validate it belongs to `presId`)
2. Read its `template`, `data`, `notes`
3. Compute `newOrder = sourceSlide.order + 1`
4. Increment `order` of all slides where `order >= newOrder` (shift down)
5. Insert new slide with new UUID, same `template`/`data`/`notes`, `order = newOrder`
6. Log change: "Duplicou slide {order} ({template})"
7. Update presentation `updated_at`
8. Return the new slide object

**Response:** `201 Created` with `{ id, presentation_id, order, template, data, notes }`

### Frontend

- Add "Duplicate" button in `SlideList.vue` next to the delete button on each slide thumbnail
- Icon: `Copy` from lucide-vue-next
- On click: call the API, then `refresh()` to reload slides
- Also wire Ctrl+D shortcut (added in Feature 2)

### Tests

- Unit test: duplicate creates new slide with same data
- Unit test: order is correctly shifted for subsequent slides
- Unit test: rejects duplicate of slide from another presentation (403)
- Unit test: rejects duplicate of nonexistent slide (404)

### Swagger

Add endpoint to `public/openapi.json` with request/response schemas.

---

## Feature 2: Keyboard Shortcuts

**What:** Global keyboard shortcuts in the editor for common actions.

### Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Ctrl+S` / `Cmd+S` | Save all changes | Always |
| `Ctrl+D` / `Cmd+D` | Duplicate current slide | When slide selected |
| `Delete` / `Backspace` | Delete current slide (with confirm) | When slide selected, NOT in text input |
| `ArrowUp` | Previous slide | When NOT in text input |
| `ArrowDown` | Next slide | When NOT in text input |
| `?` | Toggle shortcut help modal | When NOT in text input |
| `Escape` | Close any open modal | Always |

### Implementation

**Composable:** `composables/useEditorShortcuts.ts`

```typescript
export function useEditorShortcuts(options: {
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
  onNavigate: (dir: 'prev' | 'next') => void
  onToggleHelp: () => void
})
```

- Register `keydown` listener on `onMounted`, remove on `onUnmounted`
- Guard: skip shortcuts when `event.target` is `input`, `textarea`, or `[contenteditable]`
- Prevent default for Ctrl+S and Ctrl+D (browser defaults)

**Help Modal:** `components/editor/ShortcutHelp.vue`
- Simple modal listing all shortcuts in a two-column table
- Toggled by `?` key or a `⌨️` button in the toolbar

### Integration

- Call `useEditorShortcuts()` in `pages/editor/[id].vue`
- Pass existing handler functions (`handleSave`, `deleteSlide`, `navigateSlide`)
- Add `showShortcutHelp: ref(false)` state

### Tests

- Unit test: composable calls correct handler for each key combo
- Unit test: shortcuts are suppressed when target is text input
- Unit test: Ctrl+S prevents default browser behavior

---

## Feature 3: Drag & Drop Images

**What:** Drop image files directly onto the slide preview to upload and insert them.

### Implementation

**Component:** Modify `components/editor/SlidePreview.vue`

- Add `dragover`, `dragleave`, `drop` event handlers to the `.slide` element
- On `dragover`: show visual overlay ("Solte a imagem aqui"), set `isDragging = true`
- On `dragleave`: hide overlay
- On `drop`:
  1. Extract `File` from `event.dataTransfer.files`
  2. Validate: only accept `image/*` MIME types
  3. Upload via `POST /api/assets/upload` (existing endpoint) using `FormData`
  4. Emit `'image-dropped'` event with the returned `{ path, filename }` to parent
  5. Parent updates slide data to include the image URL

**Accepted formats:** PNG, JPG, GIF, SVG, WebP (validated client-side by MIME type)

**Visual feedback:**
- Semi-transparent overlay with dashed border and icon during drag
- Brief success toast after upload
- Error toast if upload fails or wrong file type

### Integration

- `SlidePreview.vue` emits `(e: 'image-dropped', payload: { path: string, filename: string }): void`
- `pages/editor/[id].vue` handles the event: updates the current slide's `data` to include an `image` or `logo` field (depends on template)
- For templates that don't support images (e.g., code), show a toast: "Este template não suporta imagens"

### Props needed

- `presentationId: string` — passed to SlidePreview for upload API call

### Tests

- Unit test: dragover sets isDragging state
- Unit test: drop with image file triggers upload
- Unit test: drop with non-image file is rejected
- Unit test: emits image-dropped event with correct payload

---

## Feature 4: Real-time Preview

**What:** Slide preview updates instantly as the user types, without waiting for save.

### Current Behavior (already partially works)

The data flow is:
```
SlideProperties emits 'update' (500ms debounce)
  → editor [id].vue updateSlide() → localEdits
  → slides computed merges localEdits with base
  → SlidePreview receives merged slide via prop
```

**This already provides near-real-time preview** because `localEdits` is reactive and `slides` is a computed that merges them. The 500ms debounce in SlideProperties is the only delay.

### Improvements

1. **Reduce debounce** in `SlideProperties.vue` from 500ms to 150ms for data updates (keep 500ms for notes since those aren't visible in preview)
2. **Optimistic mermaid rendering**: In `SlidePreview.vue`, debounce mermaid re-renders separately at 500ms (mermaid is expensive), but show a "rendering..." indicator while pending
3. **Visual save indicator**: Enhance `SavingIndicator.vue` to show "Editando..." when there are local edits, "Salvando..." during save, "Salvo ✓" after save

### Tests

- Unit test: SlideProperties emits update within 150ms for data changes
- Unit test: SlideProperties keeps 500ms debounce for notes

---

## Feature 5: Undo/Redo

**What:** Ctrl+Z to undo, Ctrl+Shift+Z to redo changes in the current slide.

### Architecture

**Composable:** `composables/useUndoRedo.ts`

In-memory undo/redo stack per slide. Does NOT use the server-side `change_log` (that's for audit/backup, not interactive undo).

```typescript
export function useUndoRedo(options: { maxHistory?: number }) {
  // Returns:
  // - pushState(slideId: string, state: SlideData): void
  // - undo(slideId: string): SlideData | null
  // - redo(slideId: string): SlideData | null
  // - canUndo(slideId: string): boolean
  // - canRedo(slideId: string): boolean
  // - clear(slideId?: string): void
}
```

**State per slide:**
```typescript
{
  past: SlideData[]     // max 50 entries
  present: SlideData    // current state
  future: SlideData[]   // redo stack, cleared on new edit
}
```

### Logic

- `pushState`: snapshot current `data` before applying an edit. Push `present` to `past`, set new state as `present`, clear `future`. Trim `past` to `maxHistory` (default 50).
- `undo`: pop from `past` → set as `present`, push old `present` to `future`
- `redo`: pop from `future` → set as `present`, push old `present` to `past`
- State is stored as deep-cloned JSON objects (no references)

### Integration

- Initialize in `pages/editor/[id].vue`
- Before each `updateSlide()` call, `pushState(slideId, currentSlide.data)`
- When undo is triggered: `const prev = undo(slideId)` → `updateSlide(slideId, { data: prev })`
- Wire Ctrl+Z and Ctrl+Shift+Z via `useEditorShortcuts` (extend Feature 2)
- Add undo/redo buttons to `EditorToolbar.vue` (disabled when stack empty)

### Tests

- Unit test: push/undo/redo cycle works correctly
- Unit test: redo stack is cleared on new edit
- Unit test: respects maxHistory limit
- Unit test: independent stacks per slide
- Unit test: canUndo/canRedo return correct booleans

---

## Cross-cutting: OpenAPI Updates

Each feature that adds/modifies an API endpoint updates `public/openapi.json`:
- Feature 1: Add `POST /api/presentations/{id}/slides/{slideId}/duplicate`
- Features 2-5: No new endpoints (frontend-only changes)

---

## Dependency Order

```
Feature 1 (Duplicate) → independent
Feature 2 (Shortcuts) → independent (but extends to support Feature 5's Ctrl+Z)
Feature 3 (Drag & Drop) → independent
Feature 4 (Real-time Preview) → independent
Feature 5 (Undo/Redo) → depends on Feature 2 (extends shortcuts composable)
```

Features 1-4 can be implemented in any order. Feature 5 must come after Feature 2.
