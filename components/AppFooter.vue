<script setup lang="ts">
import { Github, Heart } from 'lucide-vue-next'
</script>

<template>
  <footer class="app-footer">
    <div class="footer-content">
      <span class="made-with">
        Feito com <Heart :size="12" class="heart" /> por
        <a href="https://github.com/sschonss" target="_blank" rel="noopener">@sschonss</a>
      </span>
      <a href="https://github.com/sschonss/slide-builder" target="_blank" rel="noopener" class="gh-link">
        <Github :size="14" /> Contribua no GitHub
      </a>
    </div>
  </footer>
</template>

<style scoped>
.app-footer { padding: 16px 24px; border-top: 1px solid #21262d; background: #010409; }
.footer-content { max-width: 900px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #484f58; }
.made-with { display: flex; align-items: center; gap: 4px; }
.heart { color: #e94560; }
.made-with a { color: #58a6ff; }
.made-with a:hover { text-decoration: underline; }
.gh-link { display: flex; align-items: center; gap: 6px; color: #8b949e; transition: color 0.2s; }
.gh-link:hover { color: #e6edf3; }
</style>
