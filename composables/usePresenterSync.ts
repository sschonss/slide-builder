type Message =
  | { type: 'navigate'; index: number }
  | { type: 'zoom'; level: number }
  | { type: 'sync-request' }

type SyncRole = 'presenter' | 'audience'

export function usePresenterSync(presentationId: string, role: SyncRole = 'audience') {
  const channelName = `presenter-${presentationId}`
  const channel = ref<BroadcastChannel | null>(null)
  const remoteIndex = ref(-1)
  const remoteZoom = ref(1)
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let lastUpdatedAt: string | null = null

  function init() {
    if (import.meta.server) return

    channel.value = new BroadcastChannel(channelName)
    channel.value.onmessage = (ev: MessageEvent<Message>) => {
      if (ev.data.type === 'navigate') {
        remoteIndex.value = ev.data.index
      }
      if (ev.data.type === 'zoom') {
        remoteZoom.value = ev.data.level
      }
      if (ev.data.type === 'sync-request' && role === 'presenter') {
        if (remoteIndex.value >= 0) {
          channel.value?.postMessage({ type: 'navigate', index: remoteIndex.value })
        }
      }
    }

    if (role === 'audience') {
      pollTimer = setInterval(pollSync, 1000)
      pollSync()
    }
  }

  async function pollSync() {
    try {
      const data = await $fetch<{ slideIndex: number; zoomLevel: number; updatedAt: string | null }>(
        `/api/sync/${presentationId}`
      )
      if (data.updatedAt && data.updatedAt !== lastUpdatedAt) {
        lastUpdatedAt = data.updatedAt
        remoteIndex.value = data.slideIndex
        remoteZoom.value = data.zoomLevel
      }
    } catch {}
  }

  async function sendIndex(index: number) {
    channel.value?.postMessage({ type: 'navigate', index })

    if (role === 'presenter') {
      try {
        await $fetch(`/api/sync/${presentationId}`, {
          method: 'POST',
          body: { slideIndex: index },
        })
      } catch {}
    }
  }

  async function sendZoom(level: number) {
    remoteZoom.value = level
    channel.value?.postMessage({ type: 'zoom', level })

    if (role === 'presenter') {
      try {
        await $fetch(`/api/sync/${presentationId}`, {
          method: 'POST',
          body: { zoomLevel: level },
        })
      } catch {}
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

  return { remoteIndex, remoteZoom, init, sendIndex, sendZoom, requestSync, destroy }
}
