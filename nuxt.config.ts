export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  ssr: false,
  modules: ['nuxt-auth-utils'],
  runtimeConfig: {
    tursoUrl: '',
    tursoToken: '',
    session: {
      maxAge: 60 * 60 * 24 * 7,
    },
    oauth: {
      github: {
        clientId: '',
        clientSecret: '',
      },
    },
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
      meta: [
        { name: 'description', content: 'Crie apresentações profissionais no browser com temas customizáveis, export PDF e apresentação em tempo real.' },
        { name: 'theme-color', content: '#0d1117' },
      ],
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.svg' },
      ],
    },
  },
})