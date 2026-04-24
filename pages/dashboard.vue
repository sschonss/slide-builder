<script setup lang="ts">
import { Plus, Upload, Trash2, Globe, Lock } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

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

async function toggleVisibility(p: any) {
  const newVis = p.visibility === 'public' ? 'private' : 'public'
  await $fetch(`/api/presentations/${p.id}`, { method: 'PUT', body: { visibility: newVis } })
  refresh()
}
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>Minhas Apresentações</h1>
      <div class="actions">
        <button class="btn-primary" @click="createPresentation"><Plus :size="14" /> Nova</button>
        <button class="btn-import" @click="importPresentation"><Upload :size="14" /> Importar</button>
      </div>
    </header>

    <div class="grid" v-if="presentations?.length">
      <div v-for="p in presentations" :key="p.id" class="card">
        <NuxtLink :to="`/editor/${p.id}`" class="card-body">
          <h3>{{ p.title }}</h3>
          <p class="meta">{{ p.slide_count || 0 }} slides · {{ new Date(p.updated_at).toLocaleDateString('pt-BR') }}</p>
        </NuxtLink>
        <div class="card-actions">
          <button class="btn-vis" @click.stop="toggleVisibility(p)" :title="p.visibility === 'public' ? 'Pública' : 'Privada'">
            <Globe v-if="p.visibility === 'public'" :size="15" class="icon-public" />
            <Lock v-else :size="15" class="icon-private" />
          </button>
          <button class="btn-delete" @click.stop="deletePresentation(p.id)"><Trash2 :size="16" /></button>
        </div>
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
.actions { display: flex; gap: 8px; }
.btn-primary { background: #e94560; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.btn-primary:hover { background: #d63851; }
.btn-import { background: rgba(255,255,255,0.08); color: #e6edf3; border: 1px solid #30363d; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.btn-import:hover { background: rgba(255,255,255,0.15); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; display: flex; align-items: center; }
.card-body { flex: 1; padding: 20px; }
.card-body h3 { font-size: 16px; margin-bottom: 4px; }
.meta { font-size: 12px; color: #8b949e; }
.card-actions { display: flex; flex-direction: column; gap: 2px; padding: 4px; }
.btn-vis { background: none; border: none; padding: 8px; cursor: pointer; color: #484f58; display: flex; align-items: center; }
.btn-vis:hover { color: #e6edf3; }
.icon-public { color: #3fb950; }
.icon-private { color: #8b949e; }
.btn-delete { background: none; border: none; padding: 8px; cursor: pointer; color: #484f58; display: flex; align-items: center; }
.btn-delete:hover { color: #f85149; }
.empty { text-align: center; padding: 80px 0; color: #8b949e; }
.empty .btn-primary { margin-top: 16px; }
</style>
