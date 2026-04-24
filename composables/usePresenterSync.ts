type Message =
  | { type: 'navigate'; index: number }
  | { type: 'sync-request' }

type SyncRole = 'presenter' | 'audience'

export function usePresenterSync(presentationId: string, role: SyncRole = 'audience') {
  const channelName = `presenter-${presentationId}`
  const channel = ref<BroadcastChannel | null>(null)
  const remoteIndex = ref(-1)
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let lastUpdatedAt: string | null = null

  function init() {
    if (import.meta.server) return

    // BroadcastChannel for same-device instant sync
    channel.value = new BroadcastChannel(channelName)
    channel.value.onmessage = (ev: MessageEvent<Message>) => {
      if (ev.data.type === 'navigate') {
        remoteIndex.value = ev.data.index
      }
      if (ev.data.type === 'sync-request' && role === 'presenter') {
        if (remoteIndex.value >= 0) {
          channel.value?.postMessage({ type: 'navigate', index: remoteIndex.value })
        }
      }
    }

    // Server-side polling for cross-device sync (audience only)
    if (role === 'audience') {
      pollTimer = setInterval(pollSync, 1000)
      pollSync() // immediate first poll
    }
  }

  async function pollSync() {
    try {
      const data = await $fetch<{ slideIndex: number; updatedAt: string | null }>(
        `/api/sync/${presentationId}`
      )
      if (data.updatedAt && data.updatedAt !== lastUpdatedAt) {
        lastUpdatedAt = data.updatedAt
        remoteIndex.value = data.slideIndex
      }
    } catch {
      // Silently ignore poll errors — will retry on next interval
    }
  }

  async function sendIndex(index: number) {
    // Local BroadcastChannel (instant, same-device)
    channel.value?.postMessage({ type: 'navigate', index })

    // Server sync (cross-device, presenter only)
    if (role === 'presenter') {
      try {
        await $fetch(`/api/sync/${presentationId}`, {
          method: 'POST',
          body: { slideIndex: index },
        })
      } catch {
        // Non-critical — BroadcastChannel still works locally
      }
    }
  }

  function requestSync() {
    channel.value?.postMessage({ type: 'sync-request' })
    if (role === 'audience') {
      pollSync()
    }
  }

  function destroy() {
    channel.value?.close()
    channel.value = null
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  return { remoteIndex, init, sendIndex, requestSync, destroy }
}
