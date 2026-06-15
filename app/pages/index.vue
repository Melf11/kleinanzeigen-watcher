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

const { data: publicSearches } = await useFetch<PublicSearch[]>('/api/public/searches')
const featured = computed(() => (publicSearches.value ?? []).slice(0, 6))
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
      <span class="inline-block rounded-full border border-brand-700/40 bg-brand-700/10 px-3 py-1 text-xs text-brand-300">
        Kleinanzeigen-Preise im Blick
      </span>
      <h1 class="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
        Preisentwicklungen<br class="hidden sm:block" /> automatisch überwachen
      </h1>
      <p class="mx-auto mt-5 max-w-xl text-lg text-slate-400">
        Lege Suchen an, lass sie regelmäßig laufen und verfolge, wie sich Preise über Tage,
        Wochen und Jahre entwickeln – mit Median, Min/Max und Verlaufskurve.
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <NuxtLink to="/register" class="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">
          Kostenlos starten
        </NuxtLink>
        <NuxtLink to="/explore" class="rounded-md border border-slate-700 px-5 py-2.5 hover:bg-slate-800">
          Öffentliche Suchen ansehen
        </NuxtLink>
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-5xl px-4 pb-24">
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div class="text-2xl">📈</div>
          <h3 class="mt-3 font-semibold">Preis-Historie</h3>
          <p class="mt-1 text-sm text-slate-400">
            Jeder Lauf wird gespeichert – auch verkaufte Anzeigen bleiben für die Langzeit-Auswertung erhalten.
          </p>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div class="text-2xl">🔎</div>
          <h3 class="mt-3 font-semibold">Präzise Filter</h3>
          <p class="mt-1 text-sm text-slate-400">
            Suchbegriff plus Schlagwörter (UND/ODER/Ausschluss), Kategorie, Standort und Preis.
          </p>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div class="text-2xl">🔔</div>
          <h3 class="mt-3 font-semibold">Benachrichtigungen</h3>
          <p class="mt-1 text-sm text-slate-400">
            Zusammenfassungen per Telegram oder WhatsApp im gewählten Intervall.
          </p>
        </div>
      </div>
    </section>

    <!-- Öffentliche Suchen -->
    <section v-if="featured.length" class="mx-auto max-w-5xl px-4 pb-24">
      <div class="mb-5 flex items-end justify-between">
        <div>
          <h2 class="text-xl font-semibold">Öffentliche Suchen</h2>
          <p class="text-sm text-slate-400">Von Nutzern geteilte Auswertungen – ohne Login einsehbar.</p>
        </div>
        <NuxtLink to="/explore" class="shrink-0 text-sm text-brand-400 hover:underline">Alle ansehen →</NuxtLink>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink v-for="s in featured" :key="s.public_slug" :to="`/p/${s.public_slug}`"
          class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition">
          <div class="font-medium">{{ s.name }}</div>
          <p class="mt-0.5 truncate text-xs text-slate-500">„{{ s.query }}"<span v-if="s.include_keywords"> · {{ s.include_keywords }}</span></p>
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
    </section>
  </div>
</template>
