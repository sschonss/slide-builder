<script setup lang="ts">
import { Search, Users, Loader2 } from 'lucide-vue-next'

const searchQuery = ref('')
const results = ref<any[]>([])
const loading = ref(false)
const searched = ref(false)
let debounce: ReturnType<typeof setTimeout>

function onInput() {
  clearTimeout(debounce)
  if (searchQuery.value.trim().length < 2) {
    results.value = []
    searched.value = false
    return
  }
  loading.value = true
  debounce = setTimeout(async () => {
    try {
      results.value = await $fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.value.trim())}`)
    } catch {
      results.value = []
    } finally {
      loading.value = false
      searched.value = true
    }
  }, 300)
}
</script>

<template>
  <div class="explore">
    <div class="explore-header">
      <h1><Users :size="28" /> Explorar Usuários</h1>
      <p class="subtitle">Encontre criadores e suas apresentações públicas</p>
    </div>

    <div class="search-box">
      <Search :size="18" class="search-icon" />
      <input
        v-model="searchQuery"
        @input="onInput"
        type="text"
        placeholder="Buscar por nome ou username..."
        class="search-input"
        autofocus
      />
      <Loader2 v-if="loading" :size="18" class="spin search-loader" />
    </div>

    <div class="results" v-if="results.length">
      <NuxtLink
        v-for="user in results"
        :key="user.id"
        :to="`/u/${user.username}`"
        class="user-card"
      >
        <img :src="user.avatar_url" :alt="user.name" class="avatar" />
        <div class="user-info">
          <strong>{{ user.name || user.username }}</strong>
          <span class="username">@{{ user.username }}</span>
        </div>
      </NuxtLink>
    </div>

    <div class="empty" v-else-if="searched && !loading">
      <p>Nenhum usuário encontrado para "{{ searchQuery }}"</p>
    </div>

    <div class="hint" v-else-if="!searched">
      <p>Digite pelo menos 2 caracteres para buscar</p>
    </div>
  </div>
</template>

<style scoped>
.explore { max-width: 700px; margin: 0 auto; padding: 40px 20px; }
.explore-header { text-align: center; margin-bottom: 32px; }
.explore-header h1 { font-size: 28px; display: flex; align-items: center; justify-content: center; gap: 10px; }
.subtitle { color: #8b949e; margin-top: 8px; font-size: 15px; }
.search-box { position: relative; margin-bottom: 24px; }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #484f58; }
.search-loader { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: #8b949e; }
.search-input { width: 100%; padding: 14px 44px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; color: #e6edf3; font-size: 16px; outline: none; transition: border-color 0.2s; }
.search-input:focus { border-color: #58a6ff; }
.search-input::placeholder { color: #484f58; }
.results { display: flex; flex-direction: column; gap: 8px; }
.user-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; transition: border-color 0.2s, background 0.2s; }
.user-card:hover { border-color: #58a6ff; background: #1c2128; }
.avatar { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #30363d; }
.user-info { display: flex; flex-direction: column; }
.user-info strong { font-size: 15px; }
.username { font-size: 13px; color: #8b949e; }
.empty, .hint { text-align: center; padding: 40px 0; color: #484f58; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
