<script setup lang="ts">
import type { CodeData } from '~/types'
const props = defineProps<{ data: CodeData }>()
const emit = defineEmits<{ (e: 'update', data: CodeData): void }>()

function update(field: keyof CodeData, value: string) {
  emit('update', { ...props.data, [field]: value })
}

const languages = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'sql', 'bash', 'json', 'yaml', 'html', 'css', 'php', 'ruby', 'csharp']
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>

    <label>Linguagem
      <select :value="data.language" @change="update('language', ($event.target as HTMLSelectElement).value)">
        <option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</option>
      </select>
    </label>

    <label>Código
      <textarea :value="data.code" @input="update('code', ($event.target as HTMLTextAreaElement).value)" rows="10" class="code" />
    </label>

    <label>Linhas destacadas (opcional)<input :value="data.highlight_lines" @input="update('highlight_lines', ($event.target as HTMLInputElement).value)" placeholder="Ex: 1,3-5" /></label>

    <label>Nota (opcional)<input :value="data.note" @input="update('note', ($event.target as HTMLInputElement).value)" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, textarea, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.code { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
</style>
