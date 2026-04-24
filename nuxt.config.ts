import { execSync } from 'child_process'

const gitHash = (() => {
  try { return execSync('git rev-parse --short=4 HEAD').toString().trim() }
  catch { return 'dev' }
})()

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(gitHash),
    },
  },
  devtools: { enabled: true },
  ssr: false,
  modules: ['nuxt-auth-utils', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Slide Builder',
      short_name: 'SlideBuilder',
      description: 'Crie apresentações profissionais no browser',
      theme_color: '#0d1117',
      background_color: '#0d1117',
      display: 'standalone',
      orientation: 'any',
      start_url: '/',
      scope: '/',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /^\/excalidraw-editor\//],
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },
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
    prerender: {
      routes: ['/', '/200.html'],
    },
  },
  app: {
    head: {
      title: 'Slide Builder',
      meta: [
        { name: 'description', content: 'Crie apresentações profissionais no browser com temas customizáveis, export PDF e apresentação em tempo real.' },
        { name: 'theme-color', content: '#0d1117' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },
})