<script setup lang="ts">
import { Pin, BookOpen, List, GitBranch, Code2, Columns2, User, Award } from 'lucide-vue-next'

const emit = defineEmits<{ (e: 'select', template: string): void; (e: 'close'): void }>()

const templates = [
  { id: 'cover', name: 'Cover', icon: Pin, desc: 'Slide de abertura' },
  { id: 'section', name: 'Section', icon: BookOpen, desc: 'Divisor de bloco' },
  { id: 'content', name: 'Content', icon: List, desc: 'Bullets + quote' },
  { id: 'diagram', name: 'Diagram', icon: GitBranch, desc: 'Mermaid / imagem' },
  { id: 'code', name: 'Code', icon: Code2, desc: 'Código com highlight' },
  { id: 'comparison', name: 'Comparison', icon: Columns2, desc: 'Lado a lado' },
  { id: 'bio', name: 'Bio', icon: User, desc: 'Perfil do palestrante' },
  { id: 'credits', name: 'Credits', icon: Award, desc: 'Feito com Slide Builder' },
]
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <h3>Escolha um template</h3>
      <div class="grid">
        <button v-for="t in templates" :key="t.id" class="template-btn" @click="emit('select', t.id)">
          <component :is="t.icon" :size="20" class="icon" />
          <span class="name">{{ t.name }}</span>
          <span class="desc">{{ t.desc }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; width: 560px; }
.modal h3 { margin-bottom: 16px; font-size: 16px; }
.grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
.template-btn { background: rgba(255,255,255,0.05); border: 1px solid #30363d; border-radius: 8px; padding: 12px; cursor: pointer; text-align: left; color: #e6edf3; display: flex; flex-direction: column; gap: 2px; }
.template-btn:hover { background: rgba(255,255,255,0.1); border-color: #e94560; }
.icon { font-size: 20px; }
.name { font-size: 13px; font-weight: 600; }
.desc { font-size: 10px; color: #8b949e; }
</style>
