<script setup lang="ts">
import type { CoverData } from '~/types'
const props = defineProps<{ data: CoverData; presentationId?: string; slideId?: string }>()
const emit = defineEmits<{ (e: 'update', data: CoverData): void }>()

const showExcalidraw = ref(false)

function update(field: keyof CoverData, value: string) {
  emit('update', { ...props.data, [field]: value })
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
    emit('update', { ...props.data, background_image: (result as any).path })
  }
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>
    <label>Subtítulo<input :value="data.subtitle" @input="update('subtitle', ($event.target as HTMLInputElement).value)" /></label>
    <label>Autor<input :value="data.author" @input="update('author', ($event.target as HTMLInputElement).value)" /></label>
    <label>Background image (path)<input :value="data.background_image" @input="update('background_image', ($event.target as HTMLInputElement).value)" placeholder="caminho da imagem..." /></label>
    <button class="excalidraw-btn" @click="showExcalidraw = true">🎨 Editar background com Excalidraw</button>

    <ExcalidrawModal
      v-if="showExcalidraw"
      @save="onExcalidrawSave"
      @close="showExcalidraw = false"
    />
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
.excalidraw-btn { background: #533483; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
.excalidraw-btn:hover { background: #6b44a8; }
</style>
