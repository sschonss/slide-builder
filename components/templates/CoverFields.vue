<script setup lang="ts">
import type { CoverData } from '~/types'
const props = defineProps<{ data: CoverData }>()
const emit = defineEmits<{ (e: 'update', data: CoverData): void }>()

function update(field: keyof CoverData, value: string) {
  emit('update', { ...props.data, [field]: value })
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>
    <label>Subtítulo<input :value="data.subtitle" @input="update('subtitle', ($event.target as HTMLInputElement).value)" /></label>
    <label>Autor<input :value="data.author" @input="update('author', ($event.target as HTMLInputElement).value)" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
</style>
