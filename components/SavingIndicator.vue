<script setup lang="ts">
const { isSaving } = useSaving()
</script>

<template>
  <Transition name="saving">
    <div v-if="isSaving" class="saving-bar">
      <div class="saving-progress" />
    </div>
  </Transition>
</template>

<style scoped>
.saving-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 9999;
  overflow: hidden;
}

.saving-progress {
  height: 100%;
  background: linear-gradient(90deg, #e94560, #533483, #e94560);
  background-size: 200% 100%;
  animation: progress 1.2s ease-in-out infinite;
}

@keyframes progress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.saving-enter-active { transition: opacity 0.15s; }
.saving-leave-active { transition: opacity 0.3s 0.2s; }
.saving-enter-from, .saving-leave-to { opacity: 0; }
</style>
