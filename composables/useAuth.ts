export function useAuth() {
  const { user, session, clear, fetch: fetchSession } = useUserSession()

  const isLoggedIn = computed(() => !!user.value)

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    navigateTo('/')
  }

  function login() {
    navigateTo('/auth/github', { external: true })
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
