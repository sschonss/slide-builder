type Message =
  | { type: 'navigate'; index: number }
  | { type: 'sync-request' }

export function usePresenterSync(presentationId: string) {
  const channelName = `presenter-${presentationId}`
  const channel = ref<BroadcastChannel | null>(null)
  const remoteIndex = ref(-1)

  function init() {
    if (import.meta.server) return
    channel.value = new BroadcastChannel(channelName)
    channel.value.onmessage = (ev: MessageEvent<Message>) => {
      if (ev.data.type === 'navigate') {
        remoteIndex.value = ev.data.index
      }
      if (ev.data.type === 'sync-request') {
        if (remoteIndex.value >= 0) {
          send({ type: 'navigate', index: remoteIndex.value })
        }
      }
    }
  }

  function send(msg: Message) {
    channel.value?.postMessage(msg)
  }

  function sendIndex(index: number) {
    send({ type: 'navigate', index })
  }

  function requestSync() {
    send({ type: 'sync-request' })
  }

  function destroy() {
    channel.value?.close()
    channel.value = null
  }

  return { remoteIndex, init, sendIndex, requestSync, destroy }
}
