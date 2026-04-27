<script setup lang="ts">
defineEmits<{ (e: 'close'): void }>()

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
const mod = isMac ? '⌘' : 'Ctrl'

const shortcuts = [
  { keys: `${mod}+S`, action: 'Salvar alterações' },
  { keys: `${mod}+D`, action: 'Duplicar slide atual' },
  { keys: `${mod}+Z`, action: 'Desfazer' },
  { keys: `${mod}+Shift+Z`, action: 'Refazer' },
  { keys: '↑ / ↓', action: 'Navegar entre slides' },
  { keys: 'Delete', action: 'Excluir slide' },
  { keys: '?', action: 'Mostrar/esconder atalhos' },
  { keys: 'Esc', action: 'Fechar modal' },
]
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3>Atalhos do Editor</h3>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
        <div class="shortcut-list">
          <div v-for="s in shortcuts" :key="s.keys" class="shortcut-row">
            <kbd>{{ s.keys }}</kbd>
            <span>{{ s.action }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; min-width: 360px; max-width: 90vw; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-header h3 { font-size: 16px; color: #e6edf3; margin: 0; }
.close-btn { background: none; border: none; color: #8b949e; font-size: 20px; cursor: pointer; padding: 4px 8px; }
.close-btn:hover { color: #e6edf3; }
.shortcut-list { display: flex; flex-direction: column; gap: 8px; }
.shortcut-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.shortcut-row span { color: #8b949e; font-size: 13px; }
kbd { background: rgba(255,255,255,0.1); border: 1px solid #30363d; border-radius: 4px; padding: 3px 8px; font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #e6edf3; min-width: 80px; text-align: center; }
</style>
