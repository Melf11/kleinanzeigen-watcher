<script setup lang="ts">
definePageMeta({ layout: 'public' })
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
      <div class="grid gap-5 sm:grid-cols-3">
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
  </div>
</template>
