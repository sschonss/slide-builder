<script setup lang="ts">
import { LogIn, LogOut, LayoutDashboard, Search, BookOpen, RefreshCw } from 'lucide-vue-next'

const { user, isLoggedIn, login, logout } = useAuth()

const showMenu = ref(false)
const updating = ref(false)
const isPwa = ref(false)

function toggleMenu() { showMenu.value = !showMenu.value }

function handleClickOutside(e: Event) {
  const el = document.querySelector('.user-menu')
  if (el && !el.contains(e.target as Node)) showMenu.value = false
}

async function updateApp() {
  updating.value = true
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }
    }
    // Clear caches
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    window.location.reload()
  } catch {
    window.location.reload()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  isPwa.value = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <header class="app-header">
    <NuxtLink to="/" class="logo"><AppLogo :size="24" /> Slide Builder</NuxtLink>
    <nav class="nav">
      <NuxtLink to="/explore" class="nav-link"><Search :size="14" /> Explorar</NuxtLink>
      <NuxtLink to="/docs" class="nav-link"><BookOpen :size="14" /> Docs</NuxtLink>
      <button v-if="isPwa" @click="updateApp" class="btn-update" :class="{ spinning: updating }" title="Atualizar App">
        <RefreshCw :size="14" /> Atualizar
      </button>
      <template v-if="isLoggedIn && user">
        <NuxtLink to="/dashboard" class="nav-link"><LayoutDashboard :size="14" /> Dashboard</NuxtLink>
        <div class="user-menu">
          <button class="avatar-btn" @click.stop="toggleMenu">
            <img :src="user.avatarUrl" :alt="user.name" class="avatar" />
          </button>
          <div class="menu-dropdown" v-if="showMenu">
            <div class="menu-user">
              <strong>{{ user.name }}</strong>
              <span class="username">@{{ user.username }}</span>
            </div>
            <hr class="menu-divider" />
            <NuxtLink :to="`/u/${user.username}`" class="menu-item" @click="showMenu = false">Meu perfil público</NuxtLink>
            <button class="menu-item" @click="logout"><LogOut :size="14" /> Sair</button>
          </div>
        </div>
      </template>
      <template v-else>
        <button class="btn-login" @click="login"><LogIn :size="14" /> Entrar com GitHub</button>
      </template>
    </nav>
  </header>
</template>

<style scoped>
.app-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: #010409; border-bottom: 1px solid #21262d; }
.logo { font-size: 16px; font-weight: 700; color: #e6edf3; display: flex; align-items: center; gap: 8px; }
.nav { display: flex; align-items: center; gap: 12px; }
.nav-link { font-size: 13px; color: #8b949e; display: flex; align-items: center; gap: 5px; }
.nav-link:hover { color: #e6edf3; }
.avatar-btn { background: none; border: none; cursor: pointer; padding: 0; }
.avatar { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #30363d; }
.user-menu { position: relative; }
.menu-dropdown { position: absolute; top: 100%; right: 0; margin-top: 8px; background: #1c2128; border: 1px solid #30363d; border-radius: 8px; min-width: 200px; z-index: 200; box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden; }
.menu-user { padding: 12px 14px; }
.menu-user strong { display: block; font-size: 14px; color: #e6edf3; }
.username { font-size: 12px; color: #8b949e; }
.menu-divider { border: none; border-top: 1px solid #30363d; margin: 0; }
.menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: none; border: none; color: #e6edf3; font-size: 13px; cursor: pointer; text-align: left; }
.menu-item:hover { background: rgba(255,255,255,0.08); }
.btn-login { background: #238636; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; }
.btn-login:hover { background: #2ea043; }
.btn-update { background: none; border: 1px solid #30363d; color: #8b949e; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px; transition: all 0.15s; }
.btn-update:hover { color: #e6edf3; border-color: #58a6ff; }
.btn-update.spinning { color: #58a6ff; pointer-events: none; }
.btn-update.spinning :deep(svg) { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
