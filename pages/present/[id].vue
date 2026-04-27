<script setup lang="ts">
import type { Slide } from '~/types'
import { RefreshCw, Maximize, Minimize } from 'lucide-vue-next'

const route = useRoute()
const presentationId = route.params.id as string

const { presentation, loading, syncing, init: initCache, forceSync } = useCachedPresentation(presentationId)
const currentSlideIndex = ref(0)

const slides = computed(() => presentation.value?.slides || [])
const currentSlide = computed(() => slides.value[currentSlideIndex.value])
const theme = computed(() => presentation.value?.theme?.config)

const { remoteIndex, remoteZoom, init, sendIndex, destroy } = usePresenterSync(presentationId, 'audience')

const zoomStyle = computed(() => ({
  zoom: remoteZoom.value,
}))

const isFullscreen = ref(false)

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

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
  initCache()
  init()
  window.addEventListener('keydown', handleKeydown)
  // Block all scrolling during presentation
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
  window.addEventListener('wheel', preventScroll, { passive: false })
  window.addEventListener('touchmove', preventScroll, { passive: false })
  nextTick(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
  })
})

function preventScroll(e: Event) {
  e.preventDefault()
}

onUnmounted(() => {
  destroy()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('wheel', preventScroll)
  window.removeEventListener('touchmove', preventScroll)
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <div v-if="loading" class="present-loading">
    <div class="loading-spinner"></div>
  </div>
  <div class="present-view" v-else @click="next">
    <div class="slide-container" v-if="currentSlide" :style="zoomStyle">
      <EditorSlidePreview :slide="currentSlide" :theme="theme" />
    </div>
    <div class="slide-counter">{{ currentSlideIndex + 1 }} / {{ slides.length }}</div>
    <button @click.stop="forceSync" class="sync-btn" :class="{ spinning: syncing }" title="Sincronizar">
      <RefreshCw :size="14" />
    </button>
    <button @click.stop="toggleFullscreen" class="fullscreen-btn" :title="isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'">
      <component :is="isFullscreen ? Minimize : Maximize" :size="14" />
    </button>
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
  transition: transform 0.3s ease;
  overflow: hidden;
}

.slide-container :deep(.preview-wrapper) {
  max-width: none;
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
  overflow: hidden;
}

.slide-container :deep(.slide) {
  border-radius: 0;
  box-shadow: none;
  padding: 60px 80px;
  overflow: hidden;
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

/* Bio — fullscreen overrides */
.slide-container :deep(.bio-slide) {
  gap: 60px;
}
.slide-container :deep(.avatar) {
  width: min(280px, 35vh);
  height: min(280px, 35vh);
  border-width: 4px;
}
.slide-container :deep(.avatar-placeholder) {
  width: min(280px, 35vh);
  height: min(280px, 35vh);
  font-size: 80px;
}
.slide-container :deep(.bio-info h1) {
  font-size: 48px;
  margin-bottom: 16px;
}
.slide-container :deep(.bio-info ul) {
  font-size: 28px;
  line-height: 1.8;
  padding-left: 36px;
}

/* Credits — fullscreen overrides */
.slide-container :deep(.credits-slide) {
  gap: 32px;
  justify-content: center;
}
.slide-container :deep(.credits-badge) {
  font-size: 56px;
  letter-spacing: 4px;
}
.slide-container :deep(.credits-message) {
  font-size: 32px;
}
.slide-container :deep(.qr-img) {
  width: min(220px, 30vh);
  height: min(220px, 30vh);
}
.slide-container :deep(.credits-url) {
  font-size: 20px;
}

/* Content — prevent overflow */
.slide-container :deep(.content-slide) {
  overflow: hidden;
}
.slide-container :deep(.code-block) {
  max-height: 60vh;
  overflow: hidden;
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

.present-loading {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top-color: #58a6ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.sync-btn {
  position: fixed;
  bottom: 16px;
  left: 24px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}
.sync-btn:hover {
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
}
.sync-btn.spinning :deep(svg) {
  animation: spin 1s linear infinite;
}
.fullscreen-btn {
  position: fixed;
  bottom: 16px;
  left: 60px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}
.fullscreen-btn:hover {
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
}
</style>
