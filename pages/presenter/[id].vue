<script setup lang="ts">
import type { Slide } from '~/types'
import { Timer, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, StickyNote, RefreshCw, Cast, Link, Check, ArrowLeft, ShieldAlert, Minus, Plus, Settings } from 'lucide-vue-next'

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

// Presenter preferences — persisted to localStorage
const PREFS_KEY = 'slide-builder-presenter-prefs'
const defaultPrefs = { showNextSlide: true, showNotes: true, showTimer: true, notesFontSize: 18 }

const prefs = ref({ ...defaultPrefs })
const showSettings = ref(false)

function loadPrefs() {
  try {
    const saved = localStorage.getItem(PREFS_KEY)
    if (saved) prefs.value = { ...defaultPrefs, ...JSON.parse(saved) }
  } catch {}
}

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs.value))
}

function togglePref(key: keyof typeof defaultPrefs) {
  if (typeof prefs.value[key] === 'boolean') {
    (prefs.value as any)[key] = !(prefs.value as any)[key]
    savePrefs()
  }
}

function adjustNotesFontSize(delta: number) {
  prefs.value.notesFontSize = Math.min(36, Math.max(12, prefs.value.notesFontSize + delta))
  savePrefs()
}

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

// Swipe support
let touchStartX = 0
let touchStartY = 0

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
    if (dx < 0) next()
    else prev()
  }
}

onMounted(() => {
  loadPrefs()
  initCache()
  init()
  checkCastSupport()
  startTimer()
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleSettingsOutside)
})

onUnmounted(() => {
  destroy()
  stopCast()
  pauseTimer()
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleSettingsOutside)
})

function handleSettingsOutside(e: Event) {
  const el = document.querySelector('.settings-wrapper')
  if (el && !el.contains(e.target as Node)) showSettings.value = false
}
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
  <div class="presenter-view" v-else @touchstart="onTouchStart" @touchend="onTouchEnd">
    <!-- Top: Slides -->
    <div class="slides-row">
      <div class="current-slide-box" :class="{ 'full-width': !prefs.showNextSlide }">
        <div class="slide-label">Slide Atual</div>
        <div class="slide-frame">
          <EditorSlidePreview v-if="currentSlide" :slide="currentSlide" :theme="theme" />
        </div>
      </div>
      <div class="next-slide-box" v-if="prefs.showNextSlide">
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
      <div class="timer" :class="{ paused: !timerRunning }" v-if="prefs.showTimer">
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
        <button @click="toggleTimer" class="ctrl-btn" v-if="prefs.showTimer"><component :is="timerRunning ? Pause : Play" :size="16" /></button>
        <button @click="resetTimer" class="ctrl-btn" v-if="prefs.showTimer"><RotateCcw :size="16" /></button>
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
        <div class="settings-wrapper">
          <button @click.stop="showSettings = !showSettings" class="ctrl-btn settings-btn" :class="{ active: showSettings }" title="Preferências">
            <Settings :size="16" />
          </button>
          <div class="settings-panel" v-if="showSettings" @click.stop>
            <div class="settings-title">Preferências</div>
            <label class="settings-toggle">
              <input type="checkbox" :checked="prefs.showNextSlide" @change="togglePref('showNextSlide')" />
              <span>Próximo slide</span>
            </label>
            <label class="settings-toggle">
              <input type="checkbox" :checked="prefs.showNotes" @change="togglePref('showNotes')" />
              <span>Notas do palestrante</span>
            </label>
            <label class="settings-toggle">
              <input type="checkbox" :checked="prefs.showTimer" @change="togglePref('showTimer')" />
              <span>Cronômetro</span>
            </label>
            <div class="settings-divider" />
            <div class="settings-label">Tamanho das notas</div>
            <div class="notes-size-controls">
              <button @click="adjustNotesFontSize(-2)" class="size-btn" :disabled="prefs.notesFontSize <= 12">A-</button>
              <span class="size-value">{{ prefs.notesFontSize }}px</span>
              <button @click="adjustNotesFontSize(2)" class="size-btn" :disabled="prefs.notesFontSize >= 36">A+</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom: Notes -->
    <div class="notes-row" v-if="prefs.showNotes">
      <div class="notes-label"><StickyNote :size="14" /> Notas do Palestrante</div>
      <div class="notes-content" v-if="notes" :style="{ fontSize: prefs.notesFontSize + 'px' }">{{ notes }}</div>
      <div class="notes-empty" v-else>Sem notas para este slide</div>
    </div>

    <!-- Mobile bottom nav (hidden on desktop) -->
    <div class="mobile-presenter-nav">
      <div class="mobile-top-row">
        <div class="mobile-timer" v-if="prefs.showTimer" :class="{ paused: !timerRunning }" @click="toggleTimer">
          <Timer :size="16" /> {{ timerDisplay }}
        </div>
        <div class="mobile-actions">
          <button @click="copyAudienceLink" class="mobile-action-btn" :class="{ copied: linkCopied }">
            <component :is="linkCopied ? Check : Link" :size="16" />
          </button>
          <div class="settings-wrapper mobile-settings-wrapper">
            <button @click.stop="showSettings = !showSettings" class="mobile-action-btn" :class="{ active: showSettings }">
              <Settings :size="16" />
            </button>
            <div class="settings-panel mobile-settings-panel" v-if="showSettings" @click.stop>
              <div class="settings-title">Preferências</div>
              <label class="settings-toggle">
                <input type="checkbox" :checked="prefs.showNotes" @change="togglePref('showNotes')" />
                <span>Notas</span>
              </label>
              <label class="settings-toggle">
                <input type="checkbox" :checked="prefs.showTimer" @change="togglePref('showTimer')" />
                <span>Cronômetro</span>
              </label>
              <div class="settings-divider" />
              <div class="settings-label">Tamanho das notas</div>
              <div class="notes-size-controls">
                <button @click="adjustNotesFontSize(-2)" class="size-btn" :disabled="prefs.notesFontSize <= 12">A-</button>
                <span class="size-value">{{ prefs.notesFontSize }}px</span>
                <button @click="adjustNotesFontSize(2)" class="size-btn" :disabled="prefs.notesFontSize >= 36">A+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mobile-nav-row">
        <button @click="prev" :disabled="currentSlideIndex <= 0" class="mobile-nav-btn">
          <ChevronLeft :size="32" />
        </button>
        <span class="mobile-slide-count">{{ currentSlideIndex + 1 }} / {{ slides.length }}</span>
        <button @click="next" :disabled="currentSlideIndex >= slides.length - 1" class="mobile-nav-btn next-btn">
          <ChevronRight :size="32" />
        </button>
      </div>
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

.current-slide-box.full-width {
  flex: 1;
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
  line-height: 1.7;
  color: #e6edf3;
  white-space: pre-wrap;
}

.notes-empty {
  font-size: 14px;
  color: #484f58;
  font-style: italic;
}

/* Settings Panel */
.settings-wrapper {
  position: relative;
}
.settings-btn.active {
  background: rgba(88, 166, 255, 0.15);
  border-color: #58a6ff;
  color: #58a6ff;
}
.settings-panel {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  background: #1c2128;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 12px 14px;
  min-width: 220px;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.settings-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #8b949e;
  margin-bottom: 10px;
  font-weight: 600;
}
.settings-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 13px;
  color: #e6edf3;
}
.settings-toggle input[type="checkbox"] {
  accent-color: #58a6ff;
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.settings-divider {
  border-top: 1px solid #30363d;
  margin: 8px 0;
}
.settings-label {
  font-size: 12px;
  color: #8b949e;
  margin-bottom: 6px;
}
.notes-size-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.size-btn {
  background: rgba(255,255,255,0.08);
  color: #e6edf3;
  border: 1px solid #30363d;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.size-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.15);
}
.size-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.size-value {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: #8b949e;
  min-width: 36px;
  text-align: center;
}

/* Mobile presenter nav — always in DOM, hidden on desktop */
.mobile-presenter-nav {
  display: none;
}

@media (max-width: 640px) {
  .presenter-view {
    height: 100dvh;
  }
  /* Reorder: slide → nav+controls → notes */
  .slides-row { order: 1; }
  .mobile-presenter-nav { order: 2; }
  .controls-row { order: 99; display: none; }
  .notes-row { order: 3; }

  .slides-row {
    flex-direction: column;
    padding: 8px;
    gap: 4px;
    flex: none;
  }
  .current-slide-box {
    flex: none;
    max-height: 30vh;
  }
  .next-slide-box {
    display: none;
  }

  .notes-row {
    flex: 1;
    min-height: 0;
    max-height: none;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .mobile-presenter-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
    flex-shrink: 0;
    border-top: 1px solid #30363d;
    border-bottom: 1px solid #30363d;
    background: #161b22;
  }
  .mobile-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .mobile-timer {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 600;
    color: #58a6ff;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
  }
  .mobile-timer:active {
    background: rgba(88, 166, 255, 0.1);
  }
  .mobile-timer.paused {
    color: #f0883e;
  }
  .mobile-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .mobile-action-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #e6edf3;
    border: 1px solid #30363d;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .mobile-action-btn:active {
    background: rgba(255, 255, 255, 0.15);
  }
  .mobile-action-btn.copied {
    background: rgba(63, 185, 80, 0.15);
    border-color: #3fb950;
    color: #3fb950;
  }
  .mobile-action-btn.active {
    background: rgba(88, 166, 255, 0.15);
    border-color: #58a6ff;
    color: #58a6ff;
  }
  .mobile-settings-wrapper {
    position: relative;
  }
  .mobile-settings-panel {
    bottom: auto;
    top: 100%;
    margin-top: 8px;
    margin-bottom: 0;
    right: 0;
  }
  .mobile-nav-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .mobile-nav-btn {
    flex: 1;
    padding: 14px;
    border-radius: 12px;
    border: 2px solid #30363d;
    background: rgba(255, 255, 255, 0.06);
    color: #e6edf3;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .mobile-nav-btn:active:not(:disabled) {
    background: rgba(88, 166, 255, 0.2);
    border-color: #58a6ff;
  }
  .mobile-nav-btn:disabled {
    opacity: 0.2;
  }
  .mobile-nav-btn.next-btn {
    background: rgba(35, 134, 54, 0.15);
    border-color: #238636;
  }
  .mobile-nav-btn.next-btn:active:not(:disabled) {
    background: rgba(35, 134, 54, 0.4);
  }
  .mobile-slide-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 700;
    min-width: 60px;
    text-align: center;
  }
}
</style>
