<script setup lang="ts">
import type { Slide } from '~/types'
import { Timer, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, StickyNote, RefreshCw, Cast, Link, Check, ArrowLeft, ShieldAlert, Minus, Plus } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const presentationId = route.params.id as string

const { presentation, loading, syncing, init: initCache, forceSync } = useCachedPresentation(presentationId)
const currentSlideIndex = ref(0)
const isOwner = computed(() => presentation.value?.isOwner === true)

const slides = computed(() => presentation.value?.slides || [])
const currentSlide = computed(() => slides.value[currentSlideIndex.value])
const nextSlide = computed(() => slides.value[currentSlideIndex.value + 1] || null)
const theme = computed(() => presentation.value?.theme?.config)
const notes = computed(() => currentSlide.value?.notes || '')

const { remoteIndex, remoteZoom, init, sendIndex, sendZoom, destroy } = usePresenterSync(presentationId, 'presenter')

// Zoom controls
const zoomLevel = ref(1)
const zoomPercent = computed(() => Math.round(zoomLevel.value * 100))

function zoomIn() {
  zoomLevel.value = Math.min(3, +(zoomLevel.value + 0.1).toFixed(1))
  sendZoom(zoomLevel.value)
}

function zoomOut() {
  zoomLevel.value = Math.max(0.5, +(zoomLevel.value - 0.1).toFixed(1))
  sendZoom(zoomLevel.value)
}

function resetZoom() {
  zoomLevel.value = 1
  sendZoom(1)
}

// Presentation API — cast audience view to external display
const canCast = ref(false)
const casting = ref(false)
let presentationConnection: any = null

function checkCastSupport() {
  canCast.value = typeof PresentationRequest !== 'undefined'
}

async function startCast() {
  if (!canCast.value) return
  try {
    const url = `${window.location.origin}/present/${presentationId}`
    const request = new PresentationRequest([url])
    presentationConnection = await request.start()
    casting.value = true
    presentationConnection.onclose = () => { casting.value = false }
    presentationConnection.onterminate = () => { casting.value = false }
  } catch {
    // User cancelled or not supported
  }
}

function stopCast() {
  if (presentationConnection) {
    presentationConnection.terminate()
    presentationConnection = null
    casting.value = false
  }
}

// Copy audience link
const linkCopied = ref(false)
const audienceUrl = computed(() => `${window.location.origin}/present/${presentationId}`)

async function copyAudienceLink() {
  try {
    await navigator.clipboard.writeText(audienceUrl.value)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  } catch {}
}

function goBack() {
  navigateTo(`/editor/${presentationId}`)
}

// Timer
const elapsed = ref(0)
const timerRunning = ref(true)
let timerInterval: ReturnType<typeof setInterval> | null = null

const timerDisplay = computed(() => {
  const s = elapsed.value
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
})

function startTimer() {
  if (timerInterval) return
  timerInterval = setInterval(() => { elapsed.value++ }, 1000)
  timerRunning.value = true
}

function pauseTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  timerRunning.value = false
}

function resetTimer() {
  pauseTimer()
  elapsed.value = 0
  startTimer()
}

function toggleTimer() {
  timerRunning.value ? pauseTimer() : startTimer()
}

// Navigation
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
  }
}

onMounted(() => {
  initCache()
  init()
  checkCastSupport()
  startTimer()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  destroy()
  stopCast()
  pauseTimer()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="loading" class="presenter-loading">
    <div class="loading-spinner"></div>
    <p>Carregando apresentação...</p>
  </div>
  <div v-else-if="!isOwner" class="presenter-denied">
    <ShieldAlert :size="48" />
    <h2>Acesso restrito</h2>
    <p>Apenas o autor pode controlar esta apresentação.</p>
    <NuxtLink :to="`/present/${presentationId}`" class="btn-audience">Abrir como audiência</NuxtLink>
  </div>
  <div class="presenter-view" v-else>
    <!-- Top: Slides -->
    <div class="slides-row">
      <div class="current-slide-box">
        <div class="slide-label">Slide Atual</div>
        <div class="slide-frame">
          <EditorSlidePreview v-if="currentSlide" :slide="currentSlide" :theme="theme" />
        </div>
      </div>
      <div class="next-slide-box">
        <div class="slide-label">Próximo</div>
        <div class="slide-frame small">
          <EditorSlidePreview v-if="nextSlide" :slide="nextSlide" :theme="theme" />
          <div v-else class="end-marker">FIM</div>
        </div>
      </div>
    </div>

    <!-- Middle: Controls -->
    <div class="controls-row">
      <button @click="goBack" class="ctrl-btn back-btn" title="Voltar ao editor">
        <ArrowLeft :size="16" />
      </button>
      <div class="timer" :class="{ paused: !timerRunning }">
        <Timer :size="22" /> {{ timerDisplay }}
      </div>
      <div class="nav-controls">
        <button @click="prev" :disabled="currentSlideIndex <= 0" class="nav-btn"><ChevronLeft :size="18" /></button>
        <span class="slide-count">{{ currentSlideIndex + 1 }} / {{ slides.length }}</span>
        <button @click="next" :disabled="currentSlideIndex >= slides.length - 1" class="nav-btn"><ChevronRight :size="18" /></button>
      </div>
      <div class="action-controls">
        <div class="zoom-controls">
          <button @click="zoomOut" class="ctrl-btn" :disabled="zoomLevel <= 0.5" title="Diminuir zoom"><Minus :size="16" /></button>
          <button @click="resetZoom" class="zoom-label" :title="'Zoom: ' + zoomPercent + '%'">{{ zoomPercent }}%</button>
          <button @click="zoomIn" class="ctrl-btn" :disabled="zoomLevel >= 3" title="Aumentar zoom"><Plus :size="16" /></button>
        </div>
        <button @click="toggleTimer" class="ctrl-btn"><component :is="timerRunning ? Pause : Play" :size="16" /></button>
        <button @click="resetTimer" class="ctrl-btn"><RotateCcw :size="16" /></button>
        <button @click="forceSync" class="ctrl-btn sync-btn" :class="{ spinning: syncing }" title="Sincronizar dados do servidor">
          <RefreshCw :size="16" />
        </button>
        <button @click="copyAudienceLink" class="ctrl-btn link-btn" :class="{ copied: linkCopied }" :title="linkCopied ? 'Link copiado!' : 'Copiar link da apresentação'">
          <component :is="linkCopied ? Check : Link" :size="16" />
          <span class="link-label">{{ linkCopied ? 'Copiado!' : 'Link' }}</span>
        </button>
        <button v-if="canCast" @click="casting ? stopCast() : startCast()" class="ctrl-btn cast-btn" :class="{ active: casting }" :title="casting ? 'Parar transmissão' : 'Transmitir para tela externa'">
          <Cast :size="16" />
          <span class="cast-label">{{ casting ? 'Parar' : 'Transmitir' }}</span>
        </button>
      </div>
    </div>

    <!-- Bottom: Notes -->
    <div class="notes-row">
      <div class="notes-label"><StickyNote :size="14" /> Notas do Palestrante</div>
      <div class="notes-content" v-if="notes">{{ notes }}</div>
      <div class="notes-empty" v-else>Sem notas para este slide</div>
    </div>
  </div>
</template>

<style scoped>
.presenter-view {
  width: 100vw;
  height: 100vh;
  background: #0d1117;
  color: #e6edf3;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

/* Slides Row */
.slides-row {
  display: flex;
  gap: 16px;
  padding: 16px 16px 8px;
  flex: 1;
  min-height: 0;
}

.current-slide-box {
  flex: 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.next-slide-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.slide-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #8b949e;
  margin-bottom: 6px;
  font-weight: 600;
}

.slide-frame {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
  overflow: hidden;
  padding: 8px;
  min-height: 0;
}

.slide-frame :deep(.preview-wrapper) {
  max-width: 100%;
  width: 100%;
}

.slide-frame.small :deep(.preview-wrapper) {
  max-width: 100%;
}

.end-marker {
  font-size: 24px;
  color: #484f58;
  font-weight: 700;
  letter-spacing: 4px;
}

/* Controls Row */
.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid #30363d;
  border-bottom: 1px solid #30363d;
  background: #161b22;
  flex-shrink: 0;
  gap: 12px;
}

.back-btn {
  flex-shrink: 0;
}

.timer {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 600;
  color: #58a6ff;
  min-width: 140px;
}

.timer.paused {
  color: #f0883e;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.slide-count {
  font-size: 18px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  min-width: 80px;
  text-align: center;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #e6edf3;
  border: 1px solid #30363d;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  transition: background 0.15s;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-controls {
  display: flex;
  gap: 8px;
}

.ctrl-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #e6edf3;
  border: 1px solid #30363d;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.15s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.sync-btn {
  margin-left: 8px;
}
.sync-btn.spinning :deep(svg) {
  animation: spin 1s linear infinite;
}
.link-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}
.link-btn.copied {
  background: rgba(63, 185, 80, 0.15);
  border-color: #3fb950;
  color: #3fb950;
}
.link-label {
  font-size: 12px;
  font-weight: 600;
}
.cast-btn {
  margin-left: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cast-btn.active {
  background: rgba(88, 166, 255, 0.15);
  border-color: #58a6ff;
  color: #58a6ff;
}
.cast-label {
  font-size: 12px;
  font-weight: 600;
}
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
}
.zoom-label {
  background: none;
  border: none;
  color: #8b949e;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  min-width: 42px;
  text-align: center;
  cursor: pointer;
  padding: 4px;
}
.zoom-label:hover {
  color: #e6edf3;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.presenter-loading {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  color: #8b949e;
  gap: 16px;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #30363d;
  border-top-color: #58a6ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.presenter-denied {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  color: #8b949e;
  gap: 16px;
  text-align: center;
}
.presenter-denied h2 {
  color: #e6edf3;
  font-size: 24px;
}
.presenter-denied p {
  font-size: 16px;
}
.btn-audience {
  margin-top: 8px;
  padding: 10px 24px;
  background: #238636;
  color: #fff;
  border-radius: 6px;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-audience:hover {
  background: #2ea043;
}

/* Notes Row */
.notes-row {
  padding: 12px 16px;
  flex-shrink: 0;
  max-height: 35%;
  overflow-y: auto;
}

.notes-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #8b949e;
  margin-bottom: 8px;
  font-weight: 600;
}

.notes-content {
  font-size: 18px;
  line-height: 1.7;
  color: #e6edf3;
  white-space: pre-wrap;
}

.notes-empty {
  font-size: 14px;
  color: #484f58;
  font-style: italic;
}
</style>
