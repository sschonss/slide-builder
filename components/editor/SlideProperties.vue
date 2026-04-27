<script setup lang="ts">
import type { Slide, SlideTemplate } from '~/types'

const props = defineProps<{ slide: Slide; presentationId: string }>()
const emit = defineEmits<{ (e: 'update', updates: Partial<Slide>): void }>()

const debounceTimer = ref<ReturnType<typeof setTimeout>>()

function onDataUpdate(newData: any) {
  clearTimeout(debounceTimer.value)
  debounceTimer.value = setTimeout(() => {
    emit('update', { data: newData })
  }, 500)
}

function onNotesUpdate(notes: string) {
  clearTimeout(debounceTimer.value)
  debounceTimer.value = setTimeout(() => {
    emit('update', { notes })
  }, 500)
}

function onTemplateChange(template: SlideTemplate) {
  emit('update', { template })
}

const templateOptions = [
  { value: 'cover', label: 'Cover' },
  { value: 'section', label: 'Section' },
  { value: 'content', label: 'Content' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'code', label: 'Code' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'bio', label: 'Bio' },
  { value: 'credits', label: 'Credits' },
]
</script>

<template>
  <div class="properties">
    <div class="section-title">Propriedades</div>

    <label class="field">
      <span>Template</span>
      <select :value="slide.template" @change="onTemplateChange(($event.target as HTMLSelectElement).value as SlideTemplate)">
        <option v-for="t in templateOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
    </label>

    <div class="divider" />

    <TemplatesCoverFields v-if="slide.template === 'cover'" :data="slide.data as any" :presentation-id="presentationId" :slide-id="slide.id" @update="onDataUpdate" />
    <TemplatesSectionFields v-else-if="slide.template === 'section'" :data="slide.data as any" @update="onDataUpdate" />
    <TemplatesContentFields v-else-if="slide.template === 'content'" :data="slide.data as any" :presentation-id="presentationId" :slide-id="slide.id" @update="onDataUpdate" />
    <TemplatesDiagramFields v-else-if="slide.template === 'diagram'" :data="slide.data as any" :presentation-id="presentationId" :slide-id="slide.id" @update="onDataUpdate" />
    <TemplatesCodeFields v-else-if="slide.template === 'code'" :data="slide.data as any" @update="onDataUpdate" />
    <TemplatesComparisonFields v-else-if="slide.template === 'comparison'" :data="slide.data as any" @update="onDataUpdate" />
    <TemplatesBioFields v-else-if="slide.template === 'bio'" :data="slide.data as any" @update="onDataUpdate" />
    <TemplatesCreditsFields v-else-if="slide.template === 'credits'" :data="slide.data as any" @update="onDataUpdate" />

    <div class="divider" />

    <label class="field">
      <span>Speaker Notes</span>
      <textarea :value="slide.notes || ''" @input="onNotesUpdate(($event.target as HTMLTextAreaElement).value)" rows="4" placeholder="Notas para o apresentador..." />
    </label>
  </div>
</template>

<style scoped>
.properties { padding: 16px; }
.section-title { font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; margin-bottom: 12px; }
select, textarea { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; resize: vertical; }
.divider { border-top: 1px solid #30363d; margin: 16px 0; }
</style>
