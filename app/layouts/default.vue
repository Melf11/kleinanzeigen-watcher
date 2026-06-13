<script setup lang="ts">
const { user, clear } = useUserSession()
const router = useRouter()

// Admin link visibility (server enforces admin on every call anyway).
const { data: me } = await useFetch<{ isAdmin?: boolean }>('/api/me')

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await router.push('/login')
}

// Bottom tab bar items (mobile). Admin appended only for admins.
const tabs = computed(() => {
  const base = [
    { to: '/dashboard', label: 'Suchen', icon: 'search' },
    { to: '/explore', label: 'Öffentlich', icon: 'globe' },
    { to: '/searches/new', label: 'Neu', icon: 'plus' },
    { to: '/settings', label: 'Konto', icon: 'user' },
  ]
  if (me.value?.isAdmin) base.push({ to: '/admin', label: 'Admin', icon: 'shield' })
  return base
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- Top header -->
    <header class="pt-safe sticky top-0 z-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <NuxtLink to="/dashboard" class="flex items-center gap-2 font-semibold">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-sm text-white">KA</span>
          <span class="hidden sm:inline">Preis-Watcher</span>
        </NuxtLink>

        <!-- Desktop nav -->
        <nav class="hidden items-center gap-4 text-sm text-slate-300 sm:flex">
          <NuxtLink to="/dashboard" class="hover:text-white" active-class="text-white">Suchen</NuxtLink>
          <NuxtLink to="/explore" class="hover:text-white" active-class="text-white">Öffentlich</NuxtLink>
          <NuxtLink to="/settings" class="hover:text-white" active-class="text-white">Einstellungen</NuxtLink>
          <NuxtLink v-if="me?.isAdmin" to="/admin"
            class="flex items-center gap-1 rounded-md bg-brand-700/20 px-2 py-0.5 text-brand-300 hover:bg-brand-700/30 hover:text-brand-200"
            active-class="!bg-brand-600/30 text-white">
            <span>🛡️</span> Admin
          </NuxtLink>
        </nav>

        <div class="ml-auto flex items-center gap-3 text-sm">
          <span class="hidden text-slate-400 sm:inline">{{ user?.username }}</span>
          <button class="rounded-md border border-slate-700 px-3 py-1.5 hover:bg-slate-800" @click="logout">
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Content (extra bottom padding on mobile to clear the tab bar) -->
    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-28 sm:pb-8">
      <slot />
    </main>

    <!-- Mobile bottom tab bar -->
    <nav class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur sm:hidden">
      <div class="mx-auto grid max-w-md" :style="{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }">
        <NuxtLink v-for="t in tabs" :key="t.to" :to="t.to"
          class="flex flex-col items-center gap-0.5 px-1 pt-2.5 pb-1 text-[11px] text-slate-400"
          active-class="text-brand-300">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <template v-if="t.icon === 'search'"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></template>
            <template v-else-if="t.icon === 'globe'"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></template>
            <template v-else-if="t.icon === 'plus'"><path d="M12 5v14M5 12h14" /></template>
            <template v-else-if="t.icon === 'user'"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></template>
            <template v-else-if="t.icon === 'shield'"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /></template>
          </svg>
          <span>{{ t.label }}</span>
        </NuxtLink>
      </div>
      <div class="pb-safe" />
    </nav>
  </div>
</template>
