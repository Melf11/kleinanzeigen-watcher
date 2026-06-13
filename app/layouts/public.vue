<script setup lang="ts">
const { loggedIn } = useUserSession()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="pt-safe border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
      <div class="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4 sm:gap-6">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white text-sm">KA</span>
          <span class="hidden sm:inline">Preis-Watcher</span>
        </NuxtLink>
        <nav class="hidden items-center gap-4 text-sm text-slate-300 sm:flex">
          <NuxtLink to="/explore" class="hover:text-white" active-class="text-white">Öffentliche Suchen</NuxtLink>
        </nav>
        <div class="ml-auto flex items-center gap-2 text-sm">
          <template v-if="loggedIn">
            <NuxtLink to="/dashboard" class="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700">Dashboard</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800">Anmelden</NuxtLink>
            <NuxtLink to="/register" class="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700">Registrieren</NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="pb-safe border-t border-slate-800 py-6 text-center text-xs text-slate-500">
      <div class="flex items-center justify-center gap-3">
        <span>Kleinanzeigen Preis-Watcher</span>
        <span class="text-slate-700">·</span>
        <a href="https://github.com/Melf11/kleinanzeigen-watcher" target="_blank" rel="noopener"
          class="inline-flex items-center gap-1.5 hover:text-slate-300">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.2c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.08-.74.08-.74 1.21.09 1.85 1.25 1.85 1.25 1.08 1.84 2.83 1.31 3.52 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
          </svg>
          GitHub
        </a>
      </div>
    </footer>
  </div>
</template>
