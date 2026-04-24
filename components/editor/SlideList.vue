<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { Slide } from '~/types'

const props = defineProps<{ slides: Slide[]; currentIndex: number }>()
const emit = defineEmits<{
  (e: 'select', index: number): void
  (e: 'add', template: string): void
  (e: 'delete', id: string): void
  (e: 'reorder', newOrder: { id: string; order: number }[]): void
}>()

const showTemplateSelector = ref(false)
const localSlides = ref<Slide[]>([])

watch(() => props.slides, (val) => { localSlides.value = [...val] }, { immediate: true, deep: true })

function onDragEnd() {
  const newOrder = localSlides.value.map((s, i) => ({ id: s.id, order: i }))
  emit('reorder', newOrder)
}

function handleAdd(template: string) {
  showTemplateSelector.value = false
  emit('add', template)
}

const TEMPLATE_COLORS: Record<string, string> = {
  cover: '#e94560', section: '#e94560', content: '#533483',
  diagram: '#0f3460', code: '#238636', comparison: '#da3633',
}
</script>

<template>
  <div class="slide-list">
    <div class="header">
      <span class="label">Slides ({{ slides.length }})</span>
    </div>

    <VueDraggable v-model="localSlides" @end="onDragEnd" class="slides" handle=".slide-item">
      <div
        v-for="(slide, i) in localSlides"
        :key="slide.id"
        class="slide-item"
        :class="{ active: i === currentIndex }"
        @click="emit('select', i)"
      >
        <div class="slide-type" :style="{ color: TEMPLATE_COLORS[slide.template] }">
          {{ i + 1 }} · {{ slide.template.toUpperCase() }}
        </div>
        <div class="slide-title">{{ (slide.data as any).title || '(sem título)' }}</div>
        <button v-if="slides.length > 1" class="delete-btn" @click.stop="emit('delete', slide.id)">×</button>
      </div>
    </VueDraggable>

    <button class="add-btn" @click="showTemplateSelector = true">+ Novo slide</button>

    <EditorTemplateSelector v-if="showTemplateSelector" @select="handleAdd" @close="showTemplateSelector = false" />
  </div>
</template>

<style scoped>
.slide-list { padding: 8px; display: flex; flex-direction: column; height: 100%; }
.header { padding: 4px 4px 8px; }
.label { font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; }
.slides { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.slide-item { background: #161b22; border: 1px solid #30363d; border-radius: 4px; padding: 8px; cursor: pointer; position: relative; }
.slide-item.active { border-color: #e94560; background: #1c2333; }
.slide-item:hover .delete-btn { opacity: 0.6; }
.slide-type { font-size: 9px; font-weight: 600; letter-spacing: 0.5px; }
.slide-title { font-size: 11px; color: #e6edf3; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.delete-btn { position: absolute; top: 4px; right: 4px; background: none; border: none; color: #f85149; font-size: 14px; cursor: pointer; opacity: 0; padding: 2px 4px; }
.delete-btn:hover { opacity: 1 !important; }
.add-btn { background: none; border: 1px dashed #30363d; border-radius: 4px; padding: 10px; color: #8b949e; cursor: pointer; font-size: 12px; margin-top: 4px; }
.add-btn:hover { border-color: #e94560; color: #e94560; }
</style>
