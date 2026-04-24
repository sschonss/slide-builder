<script setup lang="ts">
import type { Theme, ThemeConfig } from '~/types'
import { Palette } from 'lucide-vue-next'

const props = defineProps<{ theme: Theme }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>()

const config = ref<ThemeConfig>(JSON.parse(JSON.stringify(props.theme.config)))
const saving = ref(false)

async function save() {
  saving.value = true
  await $fetch(`/api/themes/${props.theme.id}`, {
    method: 'PUT',
    body: { name: props.theme.name, config: config.value },
  })
  saving.value = false
  emit('saved')
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3><Palette :size="16" /> Editar Tema</h3>
        <button class="close" @click="emit('close')">×</button>
      </div>

      <div class="section">
        <h4>Cores</h4>
        <div class="color-grid">
          <label>Background<input type="color" v-model="config.colors.background" /></label>
          <label>Primary<input type="color" v-model="config.colors.primary" /></label>
          <label>Secondary<input type="color" v-model="config.colors.secondary" /></label>
          <label>Text<input type="color" v-model="config.colors.text" /></label>
        </div>
      </div>

      <div class="section">
        <h4>Fontes</h4>
        <label>Heading<input v-model="config.fonts.heading" /></label>
        <label>Body<input v-model="config.fonts.body" /></label>
        <label>Code<input v-model="config.fonts.code" /></label>
      </div>

      <div class="section">
        <h4>Code Theme</h4>
        <select v-model="config.codeTheme">
          <option value="github-dark">GitHub Dark</option>
          <option value="dracula">Dracula</option>
          <option value="nord">Nord</option>
          <option value="one-dark-pro">One Dark Pro</option>
          <option value="vitesse-dark">Vitesse Dark</option>
        </select>
      </div>

      <button class="btn-save" @click="save" :disabled="saving">
        {{ saving ? 'Salvando...' : 'Salvar tema' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; width: 420px; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { font-size: 16px; }
.close { background: none; border: none; color: #8b949e; font-size: 20px; cursor: pointer; }
.section { margin-bottom: 20px; }
.section h4 { font-size: 13px; margin-bottom: 8px; color: #8b949e; }
.color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #8b949e; margin-bottom: 8px; }
input, select { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 4px; padding: 8px; color: #e6edf3; font-size: 13px; }
input[type="color"] { height: 36px; cursor: pointer; padding: 2px; }
.btn-save { width: 100%; background: #e94560; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-save:disabled { opacity: 0.5; }
</style>
