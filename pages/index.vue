<script setup lang="ts">
import { LogIn } from 'lucide-vue-next'

const { isLoggedIn, login } = useAuth()

watch(isLoggedIn, (value) => {
  if (value) navigateTo('/dashboard')
}, { immediate: true })
</script>

<template>
  <div class="landing">
    <div class="hero">
      <h1>Slide Builder</h1>
      <p class="subtitle">Crie apresentações profissionais com facilidade.</p>
      <button v-if="!isLoggedIn" class="btn-login" @click="login">
        <LogIn :size="16" /> Entrar com GitHub
      </button>
      <NuxtLink v-else to="/dashboard" class="btn-login">Ir para Dashboard</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.landing { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 52px); }
.hero { text-align: center; }
.hero h1 { font-size: 48px; font-weight: 700; margin-bottom: 12px; }
.subtitle { font-size: 18px; color: #8b949e; margin-bottom: 32px; }
.btn-login { background: #238636; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; display: inline-flex; align-items: center; gap: 8px; }
.btn-login:hover { background: #2ea043; }
</style>
