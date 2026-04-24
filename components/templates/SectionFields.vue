<script setup lang="ts">
import type { SectionData } from '~/types'
const props = defineProps<{ data: SectionData }>()
const emit = defineEmits<{ (e: 'update', data: SectionData): void }>()

function update(field: keyof SectionData, value: string) {
  emit('update', { ...props.data, [field]: value })
}
</script>

<template>
  <div class="fields">
    <label>Número da seção (opcional)<input :value="data.section_number" @input="update('section_number', ($event.target as HTMLInputElement).value)" placeholder="Ex: BLOCO 3" /></label>
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
</style>
