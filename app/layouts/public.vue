<script setup lang="ts">
const { loggedIn } = useUserSession()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
      <div class="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white text-sm">KA</span>
          <span class="hidden sm:inline">Preis-Watcher</span>
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm text-slate-300">
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

    <footer class="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
      Kleinanzeigen Preis-Watcher
    </footer>
  </div>
</template>
