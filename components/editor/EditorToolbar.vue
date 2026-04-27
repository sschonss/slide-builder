<script setup lang="ts">
import { Play, Download, Save, Palette, ChevronLeft, ChevronRight, ChevronDown, FileText, Package, Loader2, Undo2, Redo2, Keyboard } from 'lucide-vue-next'

const props = defineProps<{ title: string; slideIndex: number; totalSlides: number; presentationId: string; hasUnsavedChanges?: boolean; canUndo?: boolean; canRedo?: boolean }>()
const emit = defineEmits<{
  (e: 'present'): void
  (e: 'openTheme'): void
  (e: 'navigate', direction: 'prev' | 'next'): void
  (e: 'save'): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'toggleHelp'): void
}>()

const showDownloadMenu = ref(false)
const downloading = ref(false)
const saving = ref(false)
const { exporting: exportingPdf, progress: pdfProgress, exportToPdf } = useExportPdf()

function toggleDownloadMenu() { showDownloadMenu.value = !showDownloadMenu.value }
function closeDownloadMenu() { showDownloadMenu.value = false }

onMounted(() => { document.addEventListener('click', handleOutsideClick) })
onUnmounted(() => { document.removeEventListener('click', handleOutsideClick) })

function handleOutsideClick(e: Event) {
  const dropdown = document.querySelector('.dropdown')
  if (dropdown && !dropdown.contains(e.target as Node)) showDownloadMenu.value = false
}

function safeName() {
  return props.title.replace(/[^a-zA-Z0-9-_ ]/g, '') || 'presentation'
}

async function handleSave() {
  saving.value = true
  try {
    emit('save')
  } finally {
    setTimeout(() => { saving.value = false }, 600)
  }
}

async function downloadPdf() {
  closeDownloadMenu()
  await exportToPdf(props.presentationId, props.title)
}

async function downloadBundle() {
  closeDownloadMenu()
  downloading.value = true
  try {
    const res = await fetch(`/api/export-bundle?id=${props.presentationId}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeName()}.slidebuilder`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <NuxtLink to="/dashboard" class="back"><ChevronLeft :size="14" /> Voltar</NuxtLink>
      <span class="title">{{ title }}</span>
    </div>
    <div class="toolbar-center">
      <button class="nav-btn" @click="emit('navigate', 'prev')" :disabled="slideIndex <= 0"><ChevronLeft :size="14" /></button>
      <span class="slide-count">{{ slideIndex + 1 }} / {{ totalSlides }}</span>
      <button class="nav-btn" @click="emit('navigate', 'next')" :disabled="slideIndex >= totalSlides - 1"><ChevronRight :size="14" /></button>
      <div class="separator" />
      <button class="nav-btn" @click="emit('undo')" :disabled="!canUndo" title="Desfazer (Ctrl+Z)"><Undo2 :size="14" /></button>
      <button class="nav-btn" @click="emit('redo')" :disabled="!canRedo" title="Refazer (Ctrl+Shift+Z)"><Redo2 :size="14" /></button>
    </div>
    <div class="toolbar-right">
      <button class="btn btn-save" :class="{ 'has-changes': hasUnsavedChanges }" @click="handleSave" :disabled="saving">
        <Loader2 v-if="saving" :size="13" class="spin" />
        <Save v-else :size="13" />
        {{ saving ? 'Salvando...' : hasUnsavedChanges ? 'Salvar *' : 'Salvar' }}
      </button>
      <button class="btn" @click="emit('present')"><Play :size="13" /> Apresentar</button>
      <div class="dropdown">
        <button class="btn" @click.stop="toggleDownloadMenu" :disabled="downloading || exportingPdf">
          <Loader2 v-if="downloading || exportingPdf" :size="13" class="spin" />
          <Download v-else :size="13" />
          {{ exportingPdf ? 'Exportando...' : downloading ? 'Baixando...' : 'Baixar' }} <ChevronDown :size="11" />
        </button>
        <div class="dropdown-menu" v-if="showDownloadMenu">
          <button class="dropdown-item" @click="downloadPdf" :disabled="exportingPdf"><FileText :size="14" /> Exportar PDF</button>
          <button class="dropdown-item" @click="downloadBundle"><Package :size="14" /> Arquivo .slidebuilder</button>
        </div>
      </div>
      <button class="btn" @click="emit('toggleHelp')" title="Atalhos (?)"><Keyboard :size="13" /></button>
      <button class="btn" @click="emit('openTheme')"><Palette :size="13" /> Tema</button>
    </div>

    <!-- PDF export overlay -->
    <Teleport to="body">
      <div v-if="exportingPdf" class="pdf-overlay">
        <div class="pdf-modal">
          <Loader2 :size="32" class="spin" />
          <p>{{ pdfProgress }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; padding: 8px 16px; background: #161b22; border-bottom: 1px solid #30363d; gap: 12px; }
.toolbar-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.toolbar-center { display: flex; align-items: center; gap: 8px; }
.toolbar-right { display: flex; gap: 8px; flex: 1; justify-content: flex-end; }
.back { font-size: 13px; color: #8b949e; display: flex; align-items: center; gap: 2px; }
.back:hover { color: #e6edf3; }
.title { font-size: 14px; font-weight: 600; }
.slide-count { font-size: 12px; color: #8b949e; min-width: 50px; text-align: center; }
.separator { width: 1px; height: 20px; background: #30363d; margin: 0 4px; }
.btn, .nav-btn { background: rgba(255,255,255,0.08); color: #e6edf3; border: 1px solid #30363d; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px; }
.btn:hover, .nav-btn:hover { background: rgba(255,255,255,0.15); }
.btn:disabled, .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-save { background: #238636; border-color: #238636; }
.btn-save:hover { background: #2ea043; }
.btn-save.has-changes { background: #da3633; border-color: #da3633; animation: pulse-save 2s ease-in-out infinite; }
.btn-save.has-changes:hover { background: #f85149; }
@keyframes pulse-save { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.dropdown { position: relative; }
.dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: #1c2128; border: 1px solid #30363d; border-radius: 6px; overflow: hidden; z-index: 100; min-width: 200px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: none; border: none; color: #e6edf3; font-size: 13px; cursor: pointer; text-align: left; }
.dropdown-item:hover { background: rgba(255,255,255,0.1); }
.dropdown-item:disabled { opacity: 0.4; cursor: not-allowed; }
.pdf-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.pdf-modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; color: #e6edf3; }
.pdf-modal .spin { color: #e94560; }

@media (max-width: 640px) {
  .toolbar { padding: 6px 8px; gap: 6px; flex-wrap: wrap; }
  .toolbar-left { min-width: 0; }
  .back { font-size: 0; }
  .back :deep(svg) { font-size: initial; }
  .title { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .toolbar-right { gap: 4px; }
  .btn { padding: 6px 8px; font-size: 0; }
  .btn :deep(svg) { font-size: initial; }
  .btn-save { font-size: 0; }
  .btn-save :deep(svg) { font-size: initial; }
  .slide-count { font-size: 11px; min-width: 40px; }
  .nav-btn { padding: 6px 8px; }
}
</style>
