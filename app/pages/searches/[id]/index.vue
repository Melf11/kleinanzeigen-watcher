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

const medianDelta = computed(() => {
  if (!latest.value?.price_median || !previous.value?.price_median) return null
  return latest.value.price_median - previous.value.price_median
})

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

const badge: Record<string, { label: string; cls: string }> = {
  new: { label: 'Neu', cls: 'bg-sky-500/15 text-sky-300' },
  down: { label: 'Preis gesenkt', cls: 'bg-emerald-500/15 text-emerald-300' },
  up: { label: 'Preis erhöht', cls: 'bg-red-500/15 text-red-300' },
  same: { label: '', cls: '' },
}
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
      <span>{{ search.max_pages }} Credit(s)/Lauf</span>
      <span>Letzter Lauf: {{ fromNow(search.last_run_at) }}</span>
      <span>Nächster: {{ formatDate(search.next_run_at) }}</span>
      <span v-if="runMessage" class="text-brand-400">{{ runMessage }}</span>
    </div>

    <p v-if="search.last_run_status === 'error' && search.last_error"
      class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
      Letzter Lauf fehlgeschlagen: {{ search.last_error }}
    </p>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">Aktive Anzeigen</div>
        <div class="mt-1 text-2xl font-semibold">{{ detail.counts.active }}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">Median-Preis</div>
        <div class="mt-1 text-2xl font-semibold text-brand-400">{{ formatPriceShort(latest?.price_median) }}</div>
        <div v-if="medianDelta != null" :class="['text-xs', medianDelta < 0 ? 'text-emerald-400' : medianDelta > 0 ? 'text-red-400' : 'text-slate-500']">
          {{ medianDelta > 0 ? '+' : '' }}{{ medianDelta }} € ggü. Vorlauf
        </div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">Ø Preis</div>
        <div class="mt-1 text-2xl font-semibold">{{ latest?.price_avg ? formatPriceShort(Math.round(latest.price_avg)) : '–' }}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div class="text-xs text-slate-500">Min / Max</div>
        <div class="mt-1 text-base font-semibold">{{ formatPriceShort(latest?.price_min) }} <span class="text-slate-600">/</span> {{ formatPriceShort(latest?.price_max) }}</div>
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
      <h2 class="mb-3 font-medium">Markt-Preisentwicklung</h2>
      <ClientOnly>
        <PriceTrendChart :history="history ?? []" />
        <template #fallback><div class="h-64" /></template>
      </ClientOnly>
    </section>

    <!-- Ads table -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60">
      <div class="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <h2 class="font-medium">Anzeigen <span class="text-sm text-slate-500">({{ ads?.length ?? 0 }})</span></h2>
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
        <div v-for="ad in sortedAds" :key="ad.id"
          :class="['flex items-center gap-4 px-5 py-3', ad.status === 'removed' ? 'opacity-50' : '']">
          <img v-if="ad.image_url" :src="ad.image_url" alt="" class="h-12 w-12 shrink-0 rounded object-cover bg-slate-800" loading="lazy" />
          <div v-else class="h-12 w-12 shrink-0 rounded bg-slate-800" />

          <div class="min-w-0 flex-1">
            <a :href="ad.ad_url" target="_blank" rel="noopener"
              class="block truncate font-medium hover:text-brand-400">{{ ad.title }}</a>
            <div class="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span v-if="ad.location_city">{{ ad.location_zip }} {{ ad.location_city }}</span>
              <span v-if="ad.posted_at">· eingestellt {{ fromNow(ad.posted_at) }}</span>
              <span v-if="ad.status === 'removed'" class="text-slate-400">· entfernt</span>
            </div>
          </div>

          <PriceSparkline :values="ad.history.map((h: any) => h.price)" />

          <div class="w-28 shrink-0 text-right">
            <div class="font-semibold">{{ formatPrice(ad.current_price) }}</div>
            <span v-if="badge[ad.priceChange]?.label"
              :class="['mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px]', badge[ad.priceChange].cls]">
              {{ badge[ad.priceChange].label }}
              <template v-if="ad.priceChange !== 'new' && ad.lastChange"> {{ ad.lastChange > 0 ? '+' : '' }}{{ ad.lastChange }} €</template>
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div v-else class="text-slate-400">Lädt…</div>
</template>
