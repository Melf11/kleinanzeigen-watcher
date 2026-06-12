<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { formatPrice, formatPriceShort, formatDate, fromNow } = useFormat()

const { data: detail, refresh: refreshDetail } = await useFetch<any>(`/api/searches/${id}`)
const { data: history, refresh: refreshHistory } = await useFetch<any[]>(`/api/searches/${id}/history`)
const { data: ads, refresh: refreshAds } = await useFetch<any[]>(`/api/searches/${id}/ads`)

const running = ref(false)
const runMessage = ref('')

async function runNow() {
  running.value = true
  runMessage.value = ''
  try {
    const res = await $fetch<any>(`/api/searches/${id}/run`, { method: 'POST' })
    if (res.status === 'error') runMessage.value = `Fehler: ${res.error}`
    else runMessage.value = `${res.matched} Treffer · ${res.newCount} neu · ${res.removedCount} entfernt · ${res.pagesFetched} Credit(s)`
    await Promise.all([refreshDetail(), refreshHistory(), refreshAds()])
  } catch (e: any) {
    runMessage.value = e?.data?.statusMessage || 'Lauf fehlgeschlagen'
  } finally {
    running.value = false
  }
}

async function remove() {
  if (!confirm('Diese Suche und alle gespeicherten Daten löschen?')) return
  await $fetch(`/api/searches/${id}`, { method: 'DELETE' })
  await router.push('/')
}

const search = computed(() => detail.value?.search)
const latest = computed(() => detail.value?.latestRun)
const previous = computed(() => detail.value?.previousRun)

// Statistic basis: "available" (active only) or "all" (incl. removed/sold).
const basis = ref<'available' | 'all'>('available')
const stats = computed(() =>
  basis.value === 'all' ? detail.value?.liveStatsAll : detail.value?.liveStats,
)
const statMedian = computed(() =>
  stats.value?.price_median != null ? Math.round(stats.value.price_median) : null,
)
const adCount = computed(() =>
  basis.value === 'all'
    ? (detail.value?.counts.active ?? 0) + (detail.value?.counts.removed ?? 0)
    : detail.value?.counts.active ?? 0,
)

const medianDelta = computed(() => {
  // Delta vs previous run only makes sense for the current-market view.
  if (basis.value !== 'available') return null
  if (statMedian.value == null || previous.value?.price_median == null) return null
  return statMedian.value - previous.value.price_median
})

async function toggleExclude(ad: any) {
  await $fetch(`/api/searches/${id}/ads`, {
    method: 'PATCH',
    body: { adRowId: ad.id, excluded: !ad.excluded },
  })
  // Refresh ads (struck styling) and detail (live KPIs update instantly).
  await Promise.all([refreshAds(), refreshDetail()])
}

const sortKey = ref<'price' | 'seen' | 'posted'>('seen')
const sortedAds = computed(() => {
  const list = [...(ads.value ?? [])]
  if (sortKey.value === 'price') {
    list.sort((a, b) => (a.current_price ?? Infinity) - (b.current_price ?? Infinity))
  } else if (sortKey.value === 'posted') {
    list.sort((a, b) => new Date(b.posted_at ?? 0).getTime() - new Date(a.posted_at ?? 0).getTime())
  }
  return list
})

const activeAds = computed(() => sortedAds.value.filter((a) => !a.excluded))
const excludedAds = computed(() => sortedAds.value.filter((a) => a.excluded))

const showExcluded = ref(false)
</script>

<template>
  <div v-if="search" class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <NuxtLink to="/" class="text-sm text-slate-500 hover:text-slate-300">← Alle Suchen</NuxtLink>
        <h1 class="mt-1 text-xl font-semibold">{{ search.name }}</h1>
        <p class="text-sm text-slate-400">
          „{{ search.query }}"
          <span v-if="search.include_keywords"> · Schlagwörter ({{ search.include_mode === 'all' ? 'UND' : 'ODER' }}): {{ search.include_keywords }}</span>
          <span v-if="search.exclude_keywords"> · ohne: {{ search.exclude_keywords }}</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink :to="`/searches/${id}/edit`" class="btn-secondary">Bearbeiten</NuxtLink>
        <button class="btn-secondary text-red-300 hover:bg-red-500/10" @click="remove">Löschen</button>
        <button :disabled="running"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          @click="runNow">
          {{ running ? 'Läuft…' : 'Jetzt aktualisieren' }}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
      <span :class="['rounded-full px-2 py-0.5', search.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/40 text-slate-400']">
        {{ search.enabled ? 'aktiv' : 'pausiert' }}
      </span>
      <span>Intervall: {{ Math.round(search.interval_minutes / 60) }}h</span>
      <span v-if="search.run_time">um {{ search.run_time }} Uhr</span>
      <span>{{ search.max_pages }} Credit(s)/Lauf</span>
      <span v-if="search.notify && search.notify !== 'off'" class="text-brand-400">🔔 {{ search.notify === 'both' ? 'Telegram + WhatsApp' : search.notify === 'telegram' ? 'Telegram' : 'WhatsApp' }}</span>
      <span>Letzter Lauf: {{ fromNow(search.last_run_at) }}</span>
      <span>Nächster: {{ formatDate(search.next_run_at) }}</span>
      <span v-if="runMessage" class="text-brand-400">{{ runMessage }}</span>
    </div>

    <p v-if="search.last_run_status === 'error' && search.last_error"
      class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
      Letzter Lauf fehlgeschlagen: {{ search.last_error }}
    </p>

    <!-- Statistik-Basis-Umschalter -->
    <div class="flex items-center gap-3">
      <span class="text-xs text-slate-500">Statistik-Basis:</span>
      <div class="inline-flex rounded-lg border border-slate-700 p-0.5 text-xs">
        <button :class="['rounded-md px-3 py-1', basis === 'available' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800']"
          @click="basis = 'available'">Aktuell verfügbar</button>
        <button :class="['rounded-md px-3 py-1', basis === 'all' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800']"
          @click="basis = 'all'">Gesamt (inkl. entfernte)</button>
      </div>
    </div>

    <!-- KPIs (live über die gewählte Basis, ausgeschlossene Anzeigen immer raus) -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">{{ basis === 'all' ? 'Anzeigen gesamt' : 'Aktive Anzeigen' }}</div>
        <div class="mt-1 text-2xl font-semibold">{{ adCount }}</div>
        <div v-if="basis === 'all'" class="text-xs text-slate-500">{{ detail.counts.active }} aktiv · {{ detail.counts.removed }} entfernt</div>
        <div v-else-if="detail.counts.excluded" class="text-xs text-slate-500">+{{ detail.counts.excluded }} ausgeschlossen</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">Median-Preis</div>
        <div class="mt-1 text-2xl font-semibold text-brand-400">{{ formatPriceShort(statMedian) }}</div>
        <div v-if="medianDelta != null" :class="['text-xs', medianDelta < 0 ? 'text-emerald-400' : medianDelta > 0 ? 'text-red-400' : 'text-slate-500']">
          {{ medianDelta > 0 ? '+' : '' }}{{ medianDelta }} € ggü. Vorlauf
        </div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">Ø Preis</div>
        <div class="mt-1 text-2xl font-semibold">{{ stats?.price_avg ? formatPriceShort(Math.round(stats.price_avg)) : '–' }}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">Min / Max</div>
        <div class="mt-1 text-base font-semibold">{{ formatPriceShort(stats?.price_min) }} <span class="text-slate-600">/</span> {{ formatPriceShort(stats?.price_max) }}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">Neu (letzter Lauf)</div>
        <div class="mt-1 text-2xl font-semibold text-sky-400">{{ latest?.new_count ?? 0 }}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">Entfernt</div>
        <div class="mt-1 text-2xl font-semibold text-slate-400">{{ detail.counts.removed }}</div>
      </div>
    </div>

    <!-- Chart -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 class="font-medium">Markt-Preisentwicklung</h2>
      <p class="mb-3 text-xs text-slate-500">
        Dauerhafte Historie – jeder Punkt bleibt erhalten. Anzeigen flossen ein, solange sie verfügbar waren
        (auch heute entfernte zählen zu ihrer Zeit).
      </p>
      <ClientOnly>
        <PriceTrendChart :history="history ?? []" />
        <template #fallback><div class="h-64" /></template>
      </ClientOnly>
    </section>

    <!-- Ads table -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60">
      <div class="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <h2 class="font-medium">Anzeigen <span class="text-sm text-slate-500">({{ activeAds.length }})</span></h2>
        <label class="text-sm text-slate-400">
          Sortieren:
          <select v-model="sortKey" class="ml-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm">
            <option value="seen">Zuletzt gesehen</option>
            <option value="price">Preis aufsteigend</option>
            <option value="posted">Eingestellt (neu)</option>
          </select>
        </label>
      </div>

      <div v-if="!ads?.length" class="px-5 py-10 text-center text-slate-500">
        Noch keine Anzeigen erfasst. Klicke auf „Jetzt aktualisieren".
      </div>

      <div v-else class="divide-y divide-slate-800">
        <AdRow v-for="ad in activeAds" :key="ad.id" :ad="ad" @toggle="toggleExclude" />
        <div v-if="!activeAds.length" class="px-5 py-8 text-center text-sm text-slate-500">
          Alle Anzeigen sind aus der Statistik gestrichen.
        </div>
      </div>

      <!-- Accordion: gestrichene Anzeigen -->
      <div v-if="excludedAds.length" class="border-t border-slate-800">
        <button
          class="flex w-full items-center justify-between px-5 py-3 text-sm text-slate-300 hover:bg-slate-800/40"
          @click="showExcluded = !showExcluded">
          <span class="flex items-center gap-2">
            <svg :class="['h-4 w-4 transition-transform', showExcluded ? 'rotate-90' : '']" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clip-rule="evenodd" />
            </svg>
            Gestrichene Anzeigen
            <span class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">{{ excludedAds.length }}</span>
          </span>
          <span class="text-xs text-slate-500">{{ showExcluded ? 'zuklappen' : 'aufklappen' }}</span>
        </button>
        <div v-show="showExcluded" class="divide-y divide-slate-800 border-t border-slate-800">
          <AdRow v-for="ad in excludedAds" :key="ad.id" :ad="ad" @toggle="toggleExclude" />
        </div>
      </div>

      <p class="border-t border-slate-800 px-5 py-2 text-xs text-slate-500">
        Gestrichene Anzeigen zählen nicht zu Median/Ø/Min/Max und werden in künftigen Läufen ignoriert.
      </p>
    </section>
  </div>

  <div v-else class="text-slate-400">Lädt…</div>
</template>
