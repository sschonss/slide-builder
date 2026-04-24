<script setup lang="ts">
import type { ContentData } from '~/types'
const props = defineProps<{ data: ContentData; presentationId?: string; slideId?: string }>()
const emit = defineEmits<{ (e: 'update', data: ContentData): void }>()

const showExcalidraw = ref(false)

function updateTitle(value: string) {
  emit('update', { ...props.data, title: value })
}

function updateBullet(index: number, value: string) {
  const bullets = [...(props.data.bullets || [])]
  bullets[index] = value
  emit('update', { ...props.data, bullets })
}

function addBullet() {
  emit('update', { ...props.data, bullets: [...(props.data.bullets || []), ''] })
}

function removeBullet(index: number) {
  const bullets = (props.data.bullets || []).filter((_, i) => i !== index)
  emit('update', { ...props.data, bullets })
}

function updateQuote(value: string) {
  emit('update', { ...props.data, quote: value })
}

async function onExcalidrawSave(payload: { scene: string; svg: string }) {
  showExcalidraw.value = false
  if (props.presentationId && props.slideId) {
    const result = await $fetch('/api/assets/save-svg', {
      method: 'POST',
      body: {
        presentation_id: props.presentationId,
        slide_id: props.slideId,
        svg: payload.svg,
      },
    })
    emit('update', { ...props.data, image: (result as any).path })
  }
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="updateTitle(($event.target as HTMLInputElement).value)" /></label>

    <div class="section-label">Bullets</div>
    <div v-for="(bullet, i) in (data.bullets || [])" :key="i" class="bullet-row">
      <input :value="bullet" @input="updateBullet(i, ($event.target as HTMLInputElement).value)" placeholder="Ponto..." />
      <button class="remove" @click="removeBullet(i)">×</button>
    </div>
    <button class="add-btn" @click="addBullet">+ Bullet</button>

    <label>Quote (opcional)<textarea :value="data.quote" @input="updateQuote(($event.target as HTMLTextAreaElement).value)" rows="2" /></label>

    <label>Imagem (path)<input :value="data.image" @input="emit('update', { ...data, image: ($event.target as HTMLInputElement).value })" placeholder="caminho da imagem..." /></label>
    <button class="excalidraw-btn" @click="showExcalidraw = true">Criar/editar imagem com Excalidraw</button>

    <EditorExcalidrawModal
      v-if="showExcalidraw"
      @save="onExcalidrawSave"
      @close="showExcalidraw = false"
    />
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, textarea { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.section-label { font-size: 11px; color: #8b949e; }
.bullet-row { display: flex; gap: 4px; }
.bullet-row input { flex: 1; }
.remove { background: none; border: none; color: #f85149; font-size: 16px; cursor: pointer; padding: 0 4px; }
.add-btn { background: none; border: 1px dashed #30363d; border-radius: 4px; padding: 6px; color: #8b949e; cursor: pointer; font-size: 11px; }
.excalidraw-btn { background: #533483; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
.excalidraw-btn:hover { background: #6b44a8; }
</style>
