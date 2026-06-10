<script setup lang="ts">
const { user, clear } = useUserSession()
const router = useRouter()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
      <div class="mx-auto max-w-7xl px-4 h-14 flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white text-sm">KA</span>
          <span class="hidden sm:inline">Preis-Watcher</span>
        </NuxtLink>

        <nav class="flex items-center gap-4 text-sm text-slate-300">
          <NuxtLink to="/" class="hover:text-white" active-class="text-white">Suchen</NuxtLink>
          <NuxtLink to="/searches/new" class="hover:text-white" active-class="text-white">Neue Suche</NuxtLink>
          <NuxtLink to="/settings" class="hover:text-white" active-class="text-white">Einstellungen</NuxtLink>
        </nav>

        <div class="ml-auto flex items-center gap-3 text-sm">
          <span class="text-slate-400">{{ user?.username }}</span>
          <button
            class="rounded-md border border-slate-700 px-3 py-1 hover:bg-slate-800 transition"
            @click="logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      <slot />
    </main>
  </div>
</template>
