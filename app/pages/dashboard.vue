<script setup lang="ts">
const { formatPriceShort, fromNow } = useFormat()
const { data: searches, refresh, pending } = await useFetch<any[]>('/api/searches')
const { data: me } = await useFetch<{ hasToken: boolean }>('/api/me')

const running = ref<Record<string, boolean>>({})

async function runNow(id: string) {
  running.value[id] = true
  try {
    await $fetch(`/api/searches/${id}/run`, { method: 'POST' })
    await refresh()
  } finally {
    running.value[id] = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">Überwachte Suchen</h1>
        <p class="text-sm text-slate-400">Preisentwicklung deiner Kleinanzeigen-Suchen</p>
      </div>
      <NuxtLink to="/searches/new" class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        + Neue Suche
      </NuxtLink>
    </div>

    <div v-if="me && !me.hasToken" class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      Du hast noch keinen API-Token hinterlegt. Trage ihn unter
      <NuxtLink to="/settings" class="underline font-medium">Einstellungen</NuxtLink> ein, damit Suchläufe funktionieren.
    </div>

    <div v-if="pending" class="text-slate-400">Lädt…</div>

    <div v-else-if="!searches?.length" class="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
      Noch keine Suchen angelegt.
      <NuxtLink to="/searches/new" class="text-brand-400 hover:underline">Lege deine erste Suche an.</NuxtLink>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="s in searches" :key="s.id"
        class="group rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition">
        <div class="flex items-start justify-between gap-2">
          <NuxtLink :to="`/searches/${s.id}`" class="font-medium hover:text-brand-400">
            {{ s.name }}
          </NuxtLink>
          <span :class="['rounded-full px-2 py-0.5 text-xs',
            s.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/40 text-slate-400']">
            {{ s.enabled ? 'aktiv' : 'pausiert' }}
          </span>
        </div>
        <p class="mt-0.5 text-xs text-slate-500">„{{ s.query }}"</p>

        <div class="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div class="text-lg font-semibold">{{ s.active_count ?? 0 }}</div>
            <div class="text-xs text-slate-500">Anzeigen</div>
          </div>
          <div>
            <div class="text-lg font-semibold text-brand-400">{{ formatPriceShort(s.price_median) }}</div>
            <div class="text-xs text-slate-500">Median</div>
          </div>
          <div>
            <div class="text-sm font-medium text-slate-300">{{ formatPriceShort(s.price_min) }}</div>
            <div class="text-xs text-slate-500">ab</div>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            <span v-if="s.last_run_status === 'error'" class="text-red-400">Fehler</span>
            <span v-else>Lauf {{ fromNow(s.last_run_at) }}</span>
          </span>
          <button :disabled="running[s.id]" class="text-brand-400 hover:underline disabled:opacity-50" @click="runNow(s.id)">
            {{ running[s.id] ? 'läuft…' : 'Aktualisieren' }}
          </button>
        </div>
        <p v-if="s.last_run_status === 'error' && s.last_error" class="mt-1 break-words text-xs text-red-400/80">
          {{ s.last_error }}
        </p>
      </div>
    </div>
  </div>
</template>
