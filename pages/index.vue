<script setup lang="ts">
import { Plus, Upload, Trash2 } from 'lucide-vue-next'

const { data: presentations, refresh } = useFetch('/api/presentations')

async function createPresentation() {
  const title = prompt('Nome da apresentação:')
  if (!title) return
  const result = await $fetch('/api/presentations', { method: 'POST', body: { title } })
  navigateTo(`/editor/${(result as any).id}`)
}

async function importPresentation() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.slidebuilder'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const bundle = JSON.parse(text)
      const result = await $fetch('/api/presentations/import', { method: 'POST', body: bundle }) as any
      navigateTo(`/editor/${result.id}`)
    } catch {
      alert('Erro ao importar arquivo.')
    }
  }
  input.click()
}

async function deletePresentation(id: string) {
  if (!confirm('Deletar esta apresentação?')) return
  await $fetch(`/api/presentations/${id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>Slide Builder</h1>
      <button class="btn-primary" @click="createPresentation"><Plus :size="14" /> Nova Apresentação</button>
      <button class="btn-import" @click="importPresentation"><Upload :size="14" /> Importar</button>
    </header>

    <div class="grid" v-if="presentations?.length">
      <div v-for="p in presentations" :key="p.id" class="card">
        <NuxtLink :to="`/editor/${p.id}`" class="card-body">
          <h3>{{ p.title }}</h3>
          <p class="meta">{{ p.slide_count || 0 }} slides · {{ new Date(p.updated_at).toLocaleDateString('pt-BR') }}</p>
        </NuxtLink>
        <button class="btn-delete" @click.stop="deletePresentation(p.id)"><Trash2 :size="14" /></button>
      </div>
    </div>

    <div v-else class="empty">
      <p>Nenhuma apresentação ainda.</p>
      <button class="btn-primary" @click="createPresentation">Criar primeira</button>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; gap: 8px; }
.header h1 { font-size: 24px; }
.btn-primary { background: #e94560; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.btn-primary:hover { background: #d63851; }
.btn-import { background: rgba(255,255,255,0.08); color: #e6edf3; border: 1px solid #30363d; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.btn-import:hover { background: rgba(255,255,255,0.15); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; display: flex; align-items: center; }
.card-body { flex: 1; padding: 20px; }
.card-body h3 { font-size: 16px; margin-bottom: 4px; }
.meta { font-size: 12px; color: #8b949e; }
.btn-delete { background: none; border: none; padding: 12px; cursor: pointer; font-size: 16px; opacity: 0.4; }
.btn-delete:hover { opacity: 1; }
.empty { text-align: center; padding: 80px 0; color: #8b949e; }
.empty .btn-primary { margin-top: 16px; }
</style>
