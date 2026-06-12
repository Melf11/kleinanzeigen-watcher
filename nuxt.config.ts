import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: ['nuxt-auth-utils', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Server-only
    databaseUrl: '', // NUXT_DATABASE_URL
    authUsername: 'admin', // NUXT_AUTH_USERNAME
    authPassword: 'admin', // NUXT_AUTH_PASSWORD
    klazApiKey: '', // NUXT_KLAZ_API_KEY (optional seed for dev admin)
    tz: 'Europe/Berlin', // NUXT_TZ — timezone for the "run at HH:MM" anchor
    // nuxt-auth-utils session: secure cookie in production (needs HTTPS).
    // Override with NUXT_SESSION_COOKIE_SECURE=false for a plain-HTTP/IP setup.
    session: {
      cookie: {
        secure: process.env.NODE_ENV === 'production',
      },
    },
    public: {
      appName: 'Kleinanzeigen Preis-Watcher',
    },
  },

  nitro: {
    // Run schema migration + seed before the server starts handling requests.
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Kleinanzeigen Preis-Watcher',
      short_name: 'KA-Watcher',
      description: 'Preisentwicklungen von Kleinanzeigen automatisiert überwachen',
      lang: 'de',
      theme_color: '#0f766e',
      background_color: '#0b1220',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },
})
