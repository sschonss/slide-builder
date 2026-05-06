<script setup lang="ts">
import type { Slide, SlideTemplate, VerticalAlign } from '~/types'

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

const currentAlign = computed<VerticalAlign>(() => {
  const v = (props.slide.data as any)?.vertical_align as VerticalAlign | undefined
  return v === 'center' || v === 'bottom' ? v : 'top'
})

function onAlignChange(value: VerticalAlign) {
  emit('update', { data: { ...(props.slide.data as any), vertical_align: value } })
}

const alignOptions: { value: VerticalAlign; label: string; icon: string }[] = [
  { value: 'top', label: 'Topo', icon: '⬆' },
  { value: 'center', label: 'Centro', icon: '⬌' },
  { value: 'bottom', label: 'Base', icon: '⬇' },
]

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

    <div class="field">
      <span>Alinhamento Vertical</span>
      <div class="align-group" role="radiogroup" aria-label="Alinhamento vertical">
        <button
          v-for="opt in alignOptions"
          :key="opt.value"
          type="button"
          class="align-btn"
          :class="{ active: currentAlign === opt.value }"
          :aria-pressed="currentAlign === opt.value"
          :title="opt.label"
          @click="onAlignChange(opt.value)"
        >
          <span class="align-icon">{{ opt.icon }}</span>
          <span class="align-label">{{ opt.label }}</span>
        </button>
      </div>
    </div>

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
.align-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.align-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 4px; background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; color: #e6edf3; font-size: 11px; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.align-btn:hover { background: rgba(255,255,255,0.1); }
.align-btn.active { background: rgba(233, 69, 96, 0.2); border-color: #e94560; color: #ffffff; }
.align-icon { font-size: 14px; line-height: 1; }
.align-label { font-size: 10px; }
</style>
