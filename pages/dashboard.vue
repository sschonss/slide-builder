<script setup lang="ts">
import { Plus, Upload, Trash2, Globe, Lock, Loader2 } from 'lucide-vue-next'

definePageMeta({ middleware: 'auth' })

const { data: presentations, status, refresh } = useFetch('/api/presentations')
const { withSaving } = useSaving()
const importing = ref(false)
const deletingId = ref<string | null>(null)
const togglingId = ref<string | null>(null)
const creating = ref(false)

async function createPresentation() {
  const title = prompt('Nome da apresentação:')
  if (!title) return
  creating.value = true
  try {
    const result = await withSaving(() =>
      $fetch('/api/presentations', { method: 'POST', body: { title } })
    )
    navigateTo(`/editor/${(result as any).id}`)
  } finally {
    creating.value = false
  }
}

async function importPresentation() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.slidebuilder'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    importing.value = true
    try {
      const text = await file.text()
      const bundle = JSON.parse(text)
      const result = await withSaving(() =>
        $fetch('/api/presentations/import', { method: 'POST', body: bundle })
      ) as any
      navigateTo(`/editor/${result.id}`)
    } catch {
      alert('Erro ao importar arquivo.')
    } finally {
      importing.value = false
    }
  }
  input.click()
}

async function deletePresentation(id: string) {
  if (!confirm('Deletar esta apresentação?')) return
  deletingId.value = id
  try {
    await withSaving(() => $fetch(`/api/presentations/${id}`, { method: 'DELETE' }))
    refresh()
  } finally {
    deletingId.value = null
  }
}

async function toggleVisibility(p: any) {
  togglingId.value = p.id
  const newVis = p.visibility === 'public' ? 'private' : 'public'
  try {
    await withSaving(() =>
      $fetch(`/api/presentations/${p.id}`, { method: 'PUT', body: { visibility: newVis } })
    )
    refresh()
  } finally {
    togglingId.value = null
  }
}
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>Minhas Apresentações</h1>
      <div class="actions">
        <button class="btn-primary" @click="createPresentation" :disabled="creating">
          <Loader2 v-if="creating" :size="14" class="spin" />
          <Plus v-else :size="14" />
          {{ creating ? 'Criando...' : 'Nova' }}
        </button>
        <button class="btn-import" @click="importPresentation" :disabled="importing">
          <Loader2 v-if="importing" :size="14" class="spin" />
          <Upload v-else :size="14" />
          {{ importing ? 'Importando...' : 'Importar' }}
        </button>
      </div>
    </header>

    <!-- Loading skeleton -->
    <div class="grid" v-if="status === 'pending'">
      <div v-for="i in 3" :key="i" class="card skeleton">
        <div class="card-body">
          <div class="skel-line skel-title" />
          <div class="skel-line skel-meta" />
        </div>
      </div>
    </div>

    <div class="grid" v-else-if="presentations?.length">
      <div v-for="p in presentations" :key="p.id" class="card" :class="{ 'card-busy': deletingId === p.id }">
        <NuxtLink :to="`/editor/${p.id}`" class="card-body">
          <h3>{{ p.title }}</h3>
          <p class="meta">{{ p.slide_count || 0 }} slides · {{ new Date(p.updated_at).toLocaleDateString('pt-BR') }}</p>
        </NuxtLink>
        <div class="card-actions">
          <button class="btn-vis" @click.stop="toggleVisibility(p)" :disabled="togglingId === p.id" :title="p.visibility === 'public' ? 'Pública' : 'Privada'">
            <Loader2 v-if="togglingId === p.id" :size="15" class="spin" />
            <Globe v-else-if="p.visibility === 'public'" :size="15" class="icon-public" />
            <Lock v-else :size="15" class="icon-private" />
          </button>
          <button class="btn-delete" @click.stop="deletePresentation(p.id)" :disabled="deletingId === p.id">
            <Loader2 v-if="deletingId === p.id" :size="16" class="spin" />
            <Trash2 v-else :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <p>Nenhuma apresentação ainda.</p>
      <button class="btn-primary" @click="createPresentation">Criar primeira</button>
    </div>
    <!-- Import overlay -->
    <Teleport to="body">
      <div v-if="importing" class="import-overlay">
        <div class="import-modal">
          <Loader2 :size="32" class="spin" />
          <p>Importando apresentação...</p>
        </div>
      </div>
    </Teleport>
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
.btn-primary:disabled, .btn-import:disabled { opacity: 0.6; cursor: not-allowed; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.card-busy { opacity: 0.5; pointer-events: none; }
.skeleton { pointer-events: none; }
.skel-line { background: #21262d; border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }
.skel-title { height: 16px; width: 70%; margin-bottom: 8px; }
.skel-meta { height: 12px; width: 50%; }
@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
.import-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999; }
.import-modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; color: #e6edf3; }
.import-modal .spin { color: #e94560; }
</style>
