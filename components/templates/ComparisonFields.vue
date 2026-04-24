<script setup lang="ts">
import type { ComparisonData } from '~/types'
const props = defineProps<{ data: ComparisonData }>()
const emit = defineEmits<{ (e: 'update', data: ComparisonData): void }>()

function update(field: keyof ComparisonData, value: any) {
  emit('update', { ...props.data, [field]: value })
}

function updateItem(side: 'left' | 'right', index: number, value: string) {
  const key = side === 'left' ? 'left_items' : 'right_items'
  const items = [...(props.data[key] || [])]
  items[index] = value
  update(key, items)
}

function addItem(side: 'left' | 'right') {
  const key = side === 'left' ? 'left_items' : 'right_items'
  update(key, [...(props.data[key] || []), ''])
}

function removeItem(side: 'left' | 'right', index: number) {
  const key = side === 'left' ? 'left_items' : 'right_items'
  update(key, (props.data[key] || []).filter((_: string, i: number) => i !== index))
}
</script>

<template>
  <div class="fields">
    <label>Título<input :value="data.title" @input="update('title', ($event.target as HTMLInputElement).value)" /></label>

    <label>Estilo
      <select :value="data.style" @change="update('style', ($event.target as HTMLSelectElement).value)">
        <option value="columns">Colunas</option>
        <option value="table">Tabela</option>
      </select>
    </label>

    <div class="side">
      <label>Lado esquerdo — título<input :value="data.left_title" @input="update('left_title', ($event.target as HTMLInputElement).value)" /></label>
      <div v-for="(item, i) in (data.left_items || [])" :key="'l'+i" class="item-row">
        <input :value="item" @input="updateItem('left', i, ($event.target as HTMLInputElement).value)" />
        <button class="remove" @click="removeItem('left', i)">×</button>
      </div>
      <button class="add-btn" @click="addItem('left')">+ Item</button>
    </div>

    <div class="side">
      <label>Lado direito — título<input :value="data.right_title" @input="update('right_title', ($event.target as HTMLInputElement).value)" /></label>
      <div v-for="(item, i) in (data.right_items || [])" :key="'r'+i" class="item-row">
        <input :value="item" @input="updateItem('right', i, ($event.target as HTMLInputElement).value)" />
        <button class="remove" @click="removeItem('right', i)">×</button>
      </div>
      <button class="add-btn" @click="addItem('right')">+ Item</button>
    </div>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
.side { border: 1px solid #30363d; border-radius: 6px; padding: 10px; }
.item-row { display: flex; gap: 4px; margin-top: 4px; }
.item-row input { flex: 1; }
.remove { background: none; border: none; color: #f85149; font-size: 16px; cursor: pointer; }
.add-btn { background: none; border: 1px dashed #30363d; border-radius: 4px; padding: 4px; color: #8b949e; cursor: pointer; font-size: 10px; margin-top: 4px; }
</style>
