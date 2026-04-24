<script setup lang="ts">
import type { DiagramData } from '~/types'
const props = defineProps<{ data: DiagramData; presentationId?: string; slideId?: string }>()
const emit = defineEmits<{ (e: 'update', data: DiagramData): void }>()

const showExcalidraw = ref(false)

function update(field: keyof DiagramData, value: string) {
  emit('update', { ...props.data, [field]: value })
}

async function onExcalidrawSave(payload: { scene: string; svg: string }) {
  showExcalidraw.value = false

  let imagePath = ''
  if (props.presentationId && props.slideId) {
    const result = await $fetch('/api/assets/save-svg', {
      method: 'POST',
      body: {
        presentation_id: props.presentationId,
        slide_id: props.slideId,
        svg: payload.svg,
      },
    })
    imagePath = (result as any).path
  }

  emit('update', {
    ...props.data,
    diagram_type: 'excalidraw',
    excalidraw_scene: payload.scene,
    excalidraw_svg: payload.svg,
    image: imagePath || undefined,
  })
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>

    <label>Tipo
      <select :value="data.diagram_type" @change="update('diagram_type', ($event.target as HTMLSelectElement).value)">
        <option value="mermaid">Mermaid</option>
        <option value="excalidraw">Excalidraw</option>
        <option value="image">Imagem</option>
        <option value="embed">Embed (iframe)</option>
      </select>
    </label>

    <template v-if="data.diagram_type === 'excalidraw'">
      <button class="excalidraw-btn" @click="showExcalidraw = true">
        ✏️ {{ data.excalidraw_svg ? 'Editar no Excalidraw' : 'Abrir Excalidraw' }}
      </button>
      <div v-if="data.excalidraw_svg" class="svg-thumb" v-html="data.excalidraw_svg" />
    </template>

    <label v-if="data.diagram_type === 'mermaid'">Código Mermaid
      <textarea :value="data.mermaid_code" @input="update('mermaid_code', ($event.target as HTMLTextAreaElement).value)" rows="8" class="code" placeholder="graph TD&#10;  A-->B" />
    </label>

    <label v-if="data.diagram_type === 'embed'">URL do embed
      <input :value="data.embed_url" @input="update('embed_url', ($event.target as HTMLInputElement).value)" placeholder="https://..." />
    </label>

    <label>Legenda (opcional)<input :value="data.caption" @input="update('caption', ($event.target as HTMLInputElement).value)" /></label>

    <EditorExcalidrawModal
      v-if="showExcalidraw"
      :scene="data.excalidraw_scene"
      @save="onExcalidrawSave"
      @close="showExcalidraw = false"
    />
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, textarea, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.code { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.excalidraw-btn { background: #533483; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
.excalidraw-btn:hover { background: #6b44a8; }
.svg-thumb { margin-top: 8px; background: rgba(255,255,255,0.03); border: 1px solid #30363d; border-radius: 6px; padding: 8px; max-height: 150px; overflow: hidden; }
.svg-thumb :deep(svg) { width: 100%; height: auto; max-height: 140px; }
</style>
