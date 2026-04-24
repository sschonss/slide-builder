export function useCachedPresentation(presentationId: string) {
  const presentation = ref<any>(null)
  const loading = ref(true)
  const syncing = ref(false)
  const { get, set } = useLocalCache()
  const cacheKey = `presentation:${presentationId}`

  async function loadFromCache() {
    if (import.meta.server) return
    const cached = await get<any>(cacheKey)
    if (cached) {
      presentation.value = cached
      loading.value = false
    }
  }

  async function fetchFromServer() {
    try {
      syncing.value = true
      const data = await $fetch(`/api/presentations/${presentationId}`)
      presentation.value = data
      loading.value = false
      await set(cacheKey, data)
    } catch (err) {
      if (!presentation.value) {
        loading.value = false
      }
    } finally {
      syncing.value = false
    }
  }

  async function init() {
    await loadFromCache()
    fetchFromServer()
  }

  async function forceSync() {
    await fetchFromServer()
  }

  return { presentation, loading, syncing, init, forceSync }
}
