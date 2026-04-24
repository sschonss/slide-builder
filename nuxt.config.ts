export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  ssr: false,
  modules: [],
  runtimeConfig: {
    tursoUrl: '',
    tursoToken: '',
  },
  nitro: {
    preset: 'vercel',
    experimental: {
      asyncContext: true,
    },
  },
  app: {
    head: {
      title: 'Slide Builder',
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap' },
      ],
    },
  },
})
