<script setup lang="ts">
definePageMeta({ layout: 'public' })

const { formatPriceShort, fromNow } = useFormat()

interface PublicSearch {
  public_slug: string
  name: string
  query: string
  include_keywords: string
  active_count: number
  price_median: number | null
  price_min: number | null
  last_ok_run: string | null
}

const q = ref('')
const { data: searches, refresh, pending } = await useFetch<PublicSearch[]>('/api/public/searches', {
  query: { q },
})

// Debounced refetch as the user types.
let t: any
watch(q, () => {
  clearTimeout(t)
  t = setTimeout(() => refresh(), 250)
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold">Öffentliche Suchen</h1>
      <p class="mt-1 text-sm text-slate-400">Von Nutzern geteilte Preis-Auswertungen – ohne Login einsehbar.</p>
    </div>

    <div class="relative mb-6 max-w-md">
      <input v-model="q" type="search" placeholder="Suchen nach Name, Begriff oder Schlagwort…"
        class="w-full rounded-md border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none focus:border-brand-500" />
    </div>

    <div v-if="pending" class="text-slate-400">Lädt…</div>

    <div v-else-if="!searches?.length" class="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
      Keine öffentlichen Suchen gefunden.
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="s in searches" :key="s.public_slug" :to="`/p/${s.public_slug}`"
        class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition">
        <div class="font-medium">{{ s.name }}</div>
        <p class="mt-0.5 text-xs text-slate-500">„{{ s.query }}"<span v-if="s.include_keywords"> · {{ s.include_keywords }}</span></p>
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
        <div class="mt-4 text-xs text-slate-500">Aktualisiert {{ fromNow(s.last_ok_run) }}</div>
      </NuxtLink>
    </div>
  </div>
</template>
