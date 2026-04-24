<script setup lang="ts">
const props = defineProps<{
  scene?: string
  darkMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', payload: { scene: string; svg: string }): void
  (e: 'close'): void
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)

function onIframeLoad() {
  loaded.value = true
}

function sendScene() {
  if (!iframeRef.value?.contentWindow) return
  iframeRef.value.contentWindow.postMessage({
    type: 'load',
    scene: props.scene || null,
    darkMode: props.darkMode ?? true,
  }, '*')
}

function handleMessage(event: MessageEvent) {
  if (!event.data || typeof event.data.type !== 'string') return

  if (event.data.type === 'ready') {
    sendScene()
  } else if (event.data.type === 'save') {
    emit('save', { scene: event.data.scene, svg: event.data.svg })
  } else if (event.data.type === 'close') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div class="excalidraw-overlay" @click.self="emit('close')">
    <div class="excalidraw-modal">
      <iframe
        ref="iframeRef"
        src="/excalidraw-editor/index.html"
        class="excalidraw-iframe"
        @load="onIframeLoad"
      />
      <div v-if="!loaded" class="loading">Carregando editor...</div>
    </div>
  </div>
</template>

<style scoped>
.excalidraw-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
}
.excalidraw-modal {
  width: 92vw; height: 90vh;
  border-radius: 12px; overflow: hidden;
  background: #1a1a2e;
  position: relative;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}
.excalidraw-iframe {
  width: 100%; height: 100%; border: none;
}
.loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #8b949e; font-size: 14px; font-family: Inter, sans-serif;
}
</style>
