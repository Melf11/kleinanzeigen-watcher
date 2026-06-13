<script setup lang="ts">
definePageMeta({ layout: 'public' })

const route = useRoute()
const slug = route.params.slug as string
const { formatPriceShort, formatPrice, fromNow } = useFormat()

const { data: detail, error } = await useFetch<any>(`/api/public/searches/${slug}`)
const { data: history } = await useFetch<any[]>(`/api/public/searches/${slug}/history`)
const { data: ads } = await useFetch<any[]>(`/api/public/searches/${slug}/ads`)

const search = computed(() => detail.value?.search)

const basis = ref<'available' | 'all'>('available')
const stats = computed(() => (basis.value === 'all' ? detail.value?.liveStatsAll : detail.value?.liveStats))
const statMedian = computed(() => (stats.value?.price_median != null ? Math.round(stats.value.price_median) : null))
const adCount = computed(() =>
  basis.value === 'all'
    ? (detail.value?.counts.active ?? 0) + (detail.value?.counts.removed ?? 0)
    : detail.value?.counts.active ?? 0,
)

// Read-only public list: active, non-excluded ads.
const visibleAds = computed(() => (ads.value ?? []).filter((a) => !a.excluded && a.status === 'active'))
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10">
    <div v-if="error" class="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-400">
      Diese öffentliche Suche existiert nicht (mehr).
      <NuxtLink to="/explore" class="text-brand-400 hover:underline">Zur Übersicht</NuxtLink>
    </div>

    <div v-else-if="search" class="space-y-6">
      <div>
        <NuxtLink to="/explore" class="text-sm text-slate-500 hover:text-slate-300">← Öffentliche Suchen</NuxtLink>
        <h1 class="mt-1 text-2xl font-semibold">{{ search.name }}</h1>
        <p class="text-sm text-slate-400">
          „{{ search.query }}"
          <span v-if="search.include_keywords"> · Schlagwörter ({{ search.include_mode === 'all' ? 'UND' : 'ODER' }}): {{ search.include_keywords }}</span>
        </p>
        <p class="mt-1 text-xs text-slate-500">Zuletzt aktualisiert {{ fromNow(search.last_run_at) }} · nur Ansicht</p>
      </div>

      <!-- Basis toggle -->
      <div class="flex items-center gap-3">
        <span class="text-xs text-slate-500">Statistik-Basis:</span>
        <div class="inline-flex rounded-lg border border-slate-700 p-0.5 text-xs">
          <button :class="['rounded-md px-3 py-1', basis === 'available' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800']" @click="basis = 'available'">Aktuell verfügbar</button>
          <button :class="['rounded-md px-3 py-1', basis === 'all' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800']" @click="basis = 'all'">Gesamt (inkl. entfernte)</button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div class="text-xs text-slate-500">{{ basis === 'all' ? 'Anzeigen gesamt' : 'Aktive Anzeigen' }}</div>
          <div class="mt-1 text-2xl font-semibold">{{ adCount }}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div class="text-xs text-slate-500">Median-Preis</div>
          <div class="mt-1 text-2xl font-semibold text-brand-400">{{ formatPriceShort(statMedian) }}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div class="text-xs text-slate-500">Ø Preis</div>
          <div class="mt-1 text-2xl font-semibold">{{ stats?.price_avg ? formatPriceShort(Math.round(stats.price_avg)) : '–' }}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div class="text-xs text-slate-500">Min / Max</div>
          <div class="mt-1 text-base font-semibold">{{ formatPriceShort(stats?.price_min) }} <span class="text-slate-600">/</span> {{ formatPriceShort(stats?.price_max) }}</div>
        </div>
      </div>

      <!-- Chart -->
      <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 class="mb-3 font-medium">Markt-Preisentwicklung</h2>
        <ClientOnly>
          <PriceTrendChart :history="history ?? []" />
          <template #fallback><div class="h-64" /></template>
        </ClientOnly>
      </section>

      <!-- Ads (read-only) -->
      <section class="rounded-xl border border-slate-800 bg-slate-900/60">
        <div class="border-b border-slate-800 px-5 py-3">
          <h2 class="font-medium">Anzeigen <span class="text-sm text-slate-500">({{ visibleAds.length }})</span></h2>
        </div>
        <div v-if="!visibleAds.length" class="px-5 py-10 text-center text-slate-500">Keine aktiven Anzeigen.</div>
        <div v-else class="divide-y divide-slate-800">
          <AdRow v-for="ad in visibleAds" :key="ad.id" :ad="ad" readonly />
        </div>
      </section>
    </div>
  </div>
</template>
