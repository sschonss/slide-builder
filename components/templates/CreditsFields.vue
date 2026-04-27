<script setup lang="ts">
import type { CreditsData } from '~/types'
const props = defineProps<{ data: CreditsData }>()
const emit = defineEmits<{ (e: 'update', data: CreditsData): void }>()

function updateRepoUrl(value: string) {
  emit('update', { ...props.data, repo_url: value })
}

function updateMessage(value: string) {
  emit('update', { ...props.data, message: value })
}
</script>

<template>
  <div class="fields">
    <label>Repository URL<input :value="data.repo_url" @input="updateRepoUrl(($event.target as HTMLInputElement).value)" placeholder="https://github.com/sschonss/slide-builder" /></label>

    <label>Mensagem<input :value="data.message" @input="updateMessage(($event.target as HTMLInputElement).value)" placeholder="Feito com Slide Builder" /></label>
  </div>
</template>

<style scoped>
.fields { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; }
input { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
</style>
