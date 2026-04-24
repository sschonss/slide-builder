<template>
  <svg :width="size" :height="size" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Screen/slide frame -->
    <rect x="4" y="6" width="40" height="28" rx="3" :stroke="color" stroke-width="2.5" fill="none" />
    <!-- Stand -->
    <line x1="24" y1="34" x2="24" y2="40" :stroke="color" stroke-width="2.5" stroke-linecap="round" />
    <line x1="16" y1="42" x2="32" y2="42" :stroke="color" stroke-width="2.5" stroke-linecap="round" />
    <!-- Slide content lines -->
    <rect x="10" y="12" width="18" height="3" rx="1.5" :fill="accent" />
    <rect x="10" y="18" width="28" height="2" rx="1" :fill="color" opacity="0.4" />
    <rect x="10" y="23" width="22" height="2" rx="1" :fill="color" opacity="0.3" />
    <rect x="10" y="28" width="16" height="2" rx="1" :fill="color" opacity="0.2" />
    <!-- Play triangle -->
    <polygon points="35,12 35,20 41,16" :fill="accent" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
  color?: string
  accent?: string
}>(), {
  size: 32,
  color: '#e6edf3',
  accent: '#e94560',
})
</script>
