<script setup lang="ts">
import type { Slide } from '~/types'

const route = useRoute()
const presentationId = route.params.id as string

const { data: presentation } = useFetch(`/api/presentations/${presentationId}`)
const currentSlideIndex = ref(0)

const slides = computed(() => presentation.value?.slides || [])
const currentSlide = computed(() => slides.value[currentSlideIndex.value])
const theme = computed(() => presentation.value?.theme?.config)

const { remoteIndex, init, sendIndex, destroy } = usePresenterSync(presentationId)

function goTo(index: number) {
  if (index < 0 || index >= slides.value.length) return
  currentSlideIndex.value = index
  sendIndex(index)
}

function next() { goTo(currentSlideIndex.value + 1) }
function prev() { goTo(currentSlideIndex.value - 1) }

watch(remoteIndex, (idx) => {
  if (idx >= 0 && idx < slides.value.length) {
    currentSlideIndex.value = idx
  }
})

function handleKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case ' ':
    case 'PageDown':
      e.preventDefault()
      next()
      break
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault()
      prev()
      break
    case 'Escape':
      if (document.fullscreenElement) {
        document.exitFullscreen()
      }
      break
  }
}

onMounted(() => {
  init()
  window.addEventListener('keydown', handleKeydown)
  // Try to enter fullscreen
  nextTick(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
  })
})

onUnmounted(() => {
  destroy()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="present-view" @click="next">
    <div class="slide-container" v-if="currentSlide">
      <EditorSlidePreview :slide="currentSlide" :theme="theme" />
    </div>
    <div class="slide-counter">{{ currentSlideIndex + 1 }} / {{ slides.length }}</div>
  </div>
</template>

<style scoped>
.present-view {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: none;
  overflow: hidden;
}

.present-view:hover {
  cursor: none;
}

.slide-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.slide-container :deep(.preview-wrapper) {
  max-width: none;
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
}

.slide-container :deep(.slide) {
  border-radius: 0;
  box-shadow: none;
  padding: 60px 80px;
}

.slide-container :deep(h1) {
  font-size: 56px;
  margin-bottom: 16px;
}

.slide-container :deep(h2) {
  font-size: 36px;
}

.slide-container :deep(.author) {
  font-size: 24px;
}

.slide-container :deep(.content-slide ul) {
  font-size: 32px;
  line-height: 2;
}

.slide-container :deep(.content-slide blockquote) {
  font-size: 28px;
}

.slide-container :deep(.section-num) {
  font-size: 20px;
}

.slide-container :deep(.code-block) {
  font-size: 22px;
  max-height: none;
  padding: 32px;
}

.slide-container :deep(.note) {
  font-size: 20px;
}

.slide-container :deep(.columns) {
  gap: 40px;
}

.slide-container :deep(.col) {
  padding: 32px;
}

.slide-container :deep(.col h3) {
  font-size: 28px;
  margin-bottom: 16px;
}

.slide-container :deep(.col ul) {
  font-size: 24px;
  line-height: 2;
}

.slide-container :deep(.mermaid-rendered) {
  max-height: none;
}

.slide-container :deep(.mermaid-rendered svg) {
  max-height: 70vh;
}

.slide-counter {
  position: fixed;
  bottom: 16px;
  right: 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.2);
  font-family: 'JetBrains Mono', monospace;
  pointer-events: none;
}
</style>
