const savingCount = ref(0)
const lastSaved = ref<Date | null>(null)

export function useSaving() {
  const isSaving = computed(() => savingCount.value > 0)

  async function withSaving<T>(fn: () => Promise<T>): Promise<T> {
    savingCount.value++
    try {
      const result = await fn()
      lastSaved.value = new Date()
      return result
    } finally {
      savingCount.value--
    }
  }

  return { isSaving, lastSaved, withSaving }
}
