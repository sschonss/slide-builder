<script setup lang="ts">
import type { Slide } from '~/types'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const presentationId = route.params.id as string
const { withSaving } = useSaving()

const { data: presentation, refresh } = useFetch(`/api/presentations/${presentationId}`)
const currentSlideIndex = ref(0)
const showThemeEditor = ref(false)
const mobilePanel = ref<'list' | 'preview' | 'properties'>('preview')

const localEdits = ref<Record<string, Partial<Slide>>>({})

const slides = computed(() => {
  const base = presentation.value?.slides || []
  return base.map(s => {
    const edits = localEdits.value[s.id]
    if (!edits) return s
    return { ...s, ...edits, data: edits.data ?? s.data, notes: edits.notes ?? s.notes }
  })
})
const currentSlide = computed(() => slides.value[currentSlideIndex.value])

function navigateSlide(direction: 'prev' | 'next') {
  if (direction === 'prev' && currentSlideIndex.value > 0) currentSlideIndex.value--
  if (direction === 'next' && currentSlideIndex.value < slides.value.length - 1) currentSlideIndex.value++
}

function selectSlide(index: number) {
  currentSlideIndex.value = index
}

async function addSlide(template: string) {
  await withSaving(async () => {
    await $fetch('/api/slides', {
      method: 'POST',
      body: { presentation_id: presentationId, template },
    })
    await refresh()
    currentSlideIndex.value = slides.value.length - 1
    await regenerateMarkdown()
  })
}

function updateSlide(_slideId: string, updates: Partial<Slide>) {
  const id = _slideId
  localEdits.value[id] = { ...localEdits.value[id], ...updates }
}

async function deleteSlide(slideId: string) {
  if (slides.value.length <= 1) return
  await withSaving(async () => {
    await $fetch(`/api/slides/${slideId}`, { method: 'DELETE' })
    delete localEdits.value[slideId]
    if (currentSlideIndex.value >= slides.value.length - 1) {
      currentSlideIndex.value = Math.max(0, currentSlideIndex.value - 1)
    }
    await refresh()
    await regenerateMarkdown()
  })
}

async function reorderSlides(newOrder: { id: string; order: number }[]) {
  await withSaving(async () => {
    await $fetch('/api/slides/reorder', { method: 'PUT', body: { slides: newOrder } })
    await refresh()
    await regenerateMarkdown()
  })
}

async function duplicateSlide(slideId: string) {
  await withSaving(async () => {
    const result = await $fetch(`/api/presentations/${presentationId}/slides/${slideId}/duplicate`, {
      method: 'POST',
    })
    await refresh()
    const newIndex = slides.value.findIndex(s => s.id === (result as any).id)
    if (newIndex >= 0) currentSlideIndex.value = newIndex
    await regenerateMarkdown()
  })
}

async function regenerateMarkdown() {
  try {
    await $fetch('/api/generate', { method: 'POST', body: { presentation_id: presentationId } })
  } catch {}
}

async function handleSave() {
  const edits = { ...localEdits.value }
  const slideIds = Object.keys(edits)
  if (slideIds.length === 0 && currentSlide.value) {
    // No pending edits — save current slide as before
    await withSaving(async () => {
      await $fetch(`/api/slides/${currentSlide.value.id}`, {
        method: 'PUT',
        body: { data: currentSlide.value.data, notes: currentSlide.value.notes, template: currentSlide.value.template },
      })
      await regenerateMarkdown()
      await refresh()
    })
    return
  }

  await withSaving(async () => {
    for (const id of slideIds) {
      const slide = slides.value.find(s => s.id === id)
      if (!slide) continue
      await $fetch(`/api/slides/${id}`, {
        method: 'PUT',
        body: { data: slide.data, notes: slide.notes, template: slide.template },
      })
    }
    localEdits.value = {}
    await regenerateMarkdown()
    await refresh()
  })
}

const hasUnsavedChanges = computed(() => Object.keys(localEdits.value).length > 0)

function handlePresent() {
  const presentUrl = `${window.location.origin}/present/${presentationId}`
  // Copy audience link to clipboard
  navigator.clipboard.writeText(presentUrl).catch(() => {})
  // Navigate to presenter view within PWA (no window.open)
  navigateTo(`/presenter/${presentationId}`)
}

async function handleExport() {
  await withSaving(async () => {
    await $fetch('/api/generate', { method: 'POST', body: { presentation_id: presentationId } })
    try {
      await $fetch('/api/export', { method: 'POST', body: { presentation_id: presentationId } })
      alert('PDF exportado com sucesso!')
    } catch (err: any) {
      alert('Erro ao exportar: ' + err.message)
    }
  })
}

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
</script>

<template>
  <div class="editor" v-if="presentation">
    <EditorToolbar
      :title="presentation.title"
      :slide-index="currentSlideIndex"
      :total-slides="slides.length"
      :presentation-id="presentationId"
      :has-unsaved-changes="hasUnsavedChanges"
      @present="handlePresent"
      @save="handleSave"
      @open-theme="showThemeEditor = true"
      @navigate="navigateSlide"
    />

    <div class="mobile-tabs">
      <button :class="{ active: mobilePanel === 'list' }" @click="mobilePanel = 'list'">Slides</button>
      <button :class="{ active: mobilePanel === 'preview' }" @click="mobilePanel = 'preview'">Preview</button>
      <button :class="{ active: mobilePanel === 'properties' }" @click="mobilePanel = 'properties'">Editar</button>
    </div>

    <div class="editor-body">
      <!-- Left: Slide List -->
      <div class="panel-left" :class="{ 'mobile-hidden': mobilePanel !== 'list' }">
        <EditorSlideList
          :slides="slides"
          :current-index="currentSlideIndex"
          @select="selectSlide"
          @add="addSlide"
          @delete="deleteSlide"
          @duplicate="duplicateSlide"
          @reorder="reorderSlides"
        />
      </div>

      <!-- Center: Preview -->
      <div class="panel-center" :class="{ 'mobile-hidden': mobilePanel !== 'preview' }">
        <EditorSlidePreview
          v-if="currentSlide"
          :slide="currentSlide"
          :theme="presentation.theme?.config"
          :presentation-id="presentationId"
          @image-dropped="handleImageDrop"
        />
      </div>

      <!-- Right: Properties -->
      <div class="panel-right" :class="{ 'mobile-hidden': mobilePanel !== 'properties' }">
        <EditorSlideProperties
          v-if="currentSlide"
          :slide="currentSlide"
          :presentation-id="presentationId"
          @update="(updates) => updateSlide(currentSlide.id, updates)"
        />
      </div>
    </div>

    <!-- Theme Editor Modal -->
    <ThemeEditor
      v-if="showThemeEditor && presentation.theme"
      :theme="presentation.theme"
      @close="showThemeEditor = false"
      @saved="refresh()"
    />

    <!-- Git-style Change Log -->
    <EditorChangeLog :presentation-id="presentationId" @reverted="refresh(); currentSlideIndex = 0" />
  </div>
</template>

<style scoped>
.editor { display: flex; flex-direction: column; height: 100%; }
.editor-body { display: flex; flex: 1; overflow: hidden; }
.panel-left { width: 160px; background: #0d1117; border-right: 1px solid #30363d; overflow-y: auto; flex-shrink: 0; }
.panel-center { flex: 1; display: flex; align-items: center; justify-content: center; background: #1a1a2e; padding: 24px; }
.panel-right { width: 300px; background: #0d1117; border-left: 1px solid #30363d; overflow-y: auto; flex-shrink: 0; }

.mobile-tabs { display: none; }

@media (max-width: 640px) {
  .mobile-tabs {
    display: flex;
    background: #161b22;
    border-bottom: 1px solid #30363d;
    flex-shrink: 0;
  }
  .mobile-tabs button {
    flex: 1;
    padding: 10px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #8b949e;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .mobile-tabs button.active {
    color: #e94560;
    border-bottom-color: #e94560;
  }
  .panel-left, .panel-right { width: 100%; }
  .panel-center { padding: 12px; }
  .mobile-hidden { display: none !important; }
}
</style>
