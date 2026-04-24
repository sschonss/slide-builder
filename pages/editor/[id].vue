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
  await regenerateMarkdown()
}

async function updateSlide(slideId: string, updates: Partial<Slide>) {
  await $fetch(`/api/slides/${slideId}`, { method: 'PUT', body: updates })
  await refresh()
  await regenerateMarkdown()
}

async function deleteSlide(slideId: string) {
  if (slides.value.length <= 1) return
  await $fetch(`/api/slides/${slideId}`, { method: 'DELETE' })
  if (currentSlideIndex.value >= slides.value.length - 1) {
    currentSlideIndex.value = Math.max(0, currentSlideIndex.value - 1)
  }
  await refresh()
  await regenerateMarkdown()
}

async function reorderSlides(newOrder: { id: string; order: number }[]) {
  await $fetch('/api/slides/reorder', { method: 'PUT', body: { slides: newOrder } })
  await refresh()
  await regenerateMarkdown()
}

async function regenerateMarkdown() {
  try {
    await $fetch('/api/generate', { method: 'POST', body: { presentation_id: presentationId } })
  } catch {}
}

async function handlePresent() {
  await $fetch('/api/generate', { method: 'POST', body: { presentation_id: presentationId } })
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
