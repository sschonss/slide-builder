<script setup lang="ts">
const route = useRoute()
const username = route.params.username as string

const { data: user, error: userError } = useFetch(`/api/users/${username}`)
const { data: presentations } = useFetch(`/api/users/${username}/presentations`)
</script>

<template>
  <div class="container" v-if="user">
    <div class="profile">
      <img :src="user.avatar_url" :alt="user.name" class="profile-avatar" />
      <div>
        <h1 class="profile-name">{{ user.name }}</h1>
        <p class="profile-username">@{{ user.username }}</p>
      </div>
    </div>

    <h2 class="section-title">Apresentações</h2>

    <div class="grid" v-if="presentations?.length">
      <NuxtLink v-for="p in presentations" :key="p.id" :to="`/present/${p.id}`" class="card">
        <h3>{{ p.title }}</h3>
        <p class="meta">{{ p.slide_count || 0 }} slides · {{ new Date(p.updated_at).toLocaleDateString('pt-BR') }}</p>
      </NuxtLink>
    </div>

    <p v-else class="empty">Nenhuma apresentação pública.</p>
  </div>

  <div class="container" v-else-if="userError">
    <div class="not-found">
      <h1>Usuário não encontrado</h1>
      <NuxtLink to="/" class="back-link">Voltar</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
.profile { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; }
.profile-avatar { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #30363d; }
.profile-name { font-size: 24px; font-weight: 700; }
.profile-username { font-size: 14px; color: #8b949e; }
.section-title { font-size: 18px; margin-bottom: 20px; color: #8b949e; font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; transition: border-color 0.2s; }
.card:hover { border-color: #e94560; }
.card h3 { font-size: 16px; margin-bottom: 4px; }
.meta { font-size: 12px; color: #8b949e; }
.empty { color: #8b949e; text-align: center; padding: 40px 0; }
.not-found { text-align: center; padding: 80px 0; }
.back-link { color: #e94560; margin-top: 16px; display: inline-block; }
</style>
