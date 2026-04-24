<script setup lang="ts">
import type { ContentData } from '~/types'
const props = defineProps<{ data: ContentData }>()
const emit = defineEmits<{ (e: 'update', data: ContentData): void }>()

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
</style>
