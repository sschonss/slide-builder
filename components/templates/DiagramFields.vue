<script setup lang="ts">
import type { DiagramData } from '~/types'
const props = defineProps<{ data: DiagramData }>()
const emit = defineEmits<{ (e: 'update', data: DiagramData): void }>()

function update(field: keyof DiagramData, value: string) {
  emit('update', { ...props.data, [field]: value })
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>

    <label>Tipo
      <select :value="data.diagram_type" @change="update('diagram_type', ($event.target as HTMLSelectElement).value)">
        <option value="mermaid">Mermaid</option>
        <option value="image">Imagem</option>
        <option value="embed">Embed (iframe)</option>
      </select>
    </label>

    <label v-if="data.diagram_type === 'mermaid'">Código Mermaid
      <textarea :value="data.mermaid_code" @input="update('mermaid_code', ($event.target as HTMLTextAreaElement).value)" rows="8" class="code" placeholder="graph TD&#10;  A-->B" />
    </label>

    <label v-if="data.diagram_type === 'embed'">URL do embed
      <input :value="data.embed_url" @input="update('embed_url', ($event.target as HTMLInputElement).value)" placeholder="https://..." />
    </label>

    <label>Legenda (opcional)<input :value="data.caption" @input="update('caption', ($event.target as HTMLInputElement).value)" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, textarea, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.code { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
</style>
