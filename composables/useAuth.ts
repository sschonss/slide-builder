export function useAuth() {
  const { user, session, clear, fetch: fetchSession } = useUserSession()

  const isLoggedIn = computed(() => !!user.value)

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    navigateTo('/')
  }

  async function login() {
    if (import.meta.dev) {
      await $fetch('/api/auth/dev-login', { method: 'POST' })
      await fetchSession()
      navigateTo('/dashboard')
      return
    }
    // Use direct location change to keep within PWA context
    // navigateTo with external: true opens Safari on iOS
    window.location.href = '/auth/github'
  }

  return {
    user,
    session,
    loggedIn: isLoggedIn,
    isLoggedIn,
    login,
    logout,
    fetchSession,
  }
}
