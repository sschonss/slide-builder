<script setup lang="ts">
const props = defineProps<{ title: string; slideIndex: number; totalSlides: number }>()
const emit = defineEmits<{
  (e: 'present'): void
  (e: 'export'): void
  (e: 'openTheme'): void
  (e: 'navigate', direction: 'prev' | 'next'): void
}>()

const exporting = ref(false)

async function handleExport() {
  exporting.value = true
  emit('export')
  setTimeout(() => { exporting.value = false }, 3000)
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <NuxtLink to="/" class="back">← Voltar</NuxtLink>
      <span class="title">{{ title }}</span>
    </div>
    <div class="toolbar-center">
      <button class="nav-btn" @click="emit('navigate', 'prev')" :disabled="slideIndex <= 0">←</button>
      <span class="slide-count">{{ slideIndex + 1 }} / {{ totalSlides }}</span>
      <button class="nav-btn" @click="emit('navigate', 'next')" :disabled="slideIndex >= totalSlides - 1">→</button>
    </div>
    <div class="toolbar-right">
      <button class="btn" @click="emit('present')">▶ Apresentar</button>
      <button class="btn" @click="handleExport" :disabled="exporting">📄 {{ exporting ? 'Exportando...' : 'PDF' }}</button>
      <button class="btn" @click="emit('openTheme')">🎨 Tema</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; padding: 8px 16px; background: #161b22; border-bottom: 1px solid #30363d; gap: 12px; }
.toolbar-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.toolbar-center { display: flex; align-items: center; gap: 8px; }
.toolbar-right { display: flex; gap: 8px; flex: 1; justify-content: flex-end; }
.back { font-size: 13px; color: #8b949e; }
.back:hover { color: #e6edf3; }
.title { font-size: 14px; font-weight: 600; }
.slide-count { font-size: 12px; color: #8b949e; min-width: 50px; text-align: center; }
.btn, .nav-btn { background: rgba(255,255,255,0.08); color: #e6edf3; border: 1px solid #30363d; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn:hover, .nav-btn:hover { background: rgba(255,255,255,0.15); }
.btn:disabled, .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
