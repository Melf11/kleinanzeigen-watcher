<script setup lang="ts">
const props = defineProps<{ ad: any; readonly?: boolean }>()
const emit = defineEmits<{ toggle: [any] }>()

const { formatPrice, fromNow } = useFormat()

const badge: Record<string, { label: string; cls: string }> = {
  new: { label: 'Neu', cls: 'bg-sky-500/15 text-sky-300' },
  down: { label: 'Preis gesenkt', cls: 'bg-emerald-500/15 text-emerald-300' },
  up: { label: 'Preis erhöht', cls: 'bg-red-500/15 text-red-300' },
  same: { label: '', cls: '' },
}
</script>

<template>
  <div :class="['flex items-center gap-4 px-5 py-3', ad.status === 'removed' ? 'opacity-50' : '', ad.excluded ? 'opacity-60' : '']">
    <img v-if="ad.image_url" :src="ad.image_url" alt="" class="h-12 w-12 shrink-0 rounded object-cover bg-slate-800" loading="lazy" />
    <div v-else class="h-12 w-12 shrink-0 rounded bg-slate-800" />

    <div class="min-w-0 flex-1">
      <a :href="ad.ad_url" target="_blank" rel="noopener"
        :class="['block truncate font-medium hover:text-brand-400', ad.excluded ? 'line-through text-slate-400' : '']">{{ ad.title }}</a>
      <div class="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
        <span v-if="ad.location_city">{{ ad.location_zip }} {{ ad.location_city }}</span>
        <span v-if="ad.posted_at">· eingestellt {{ fromNow(ad.posted_at) }}</span>
        <span v-if="ad.status === 'removed'" class="text-slate-400">· entfernt</span>
      </div>
    </div>

    <PriceSparkline :values="ad.history.map((h: any) => h.price)" />

    <div class="w-28 shrink-0 text-right">
      <div :class="['font-semibold', ad.excluded ? 'text-slate-400 line-through' : '']">{{ formatPrice(ad.current_price) }}</div>
      <span v-if="!ad.excluded && badge[ad.priceChange]?.label"
        :class="['mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px]', badge[ad.priceChange].cls]">
        {{ badge[ad.priceChange].label }}
        <template v-if="ad.priceChange !== 'new' && ad.lastChange"> {{ ad.lastChange > 0 ? '+' : '' }}{{ ad.lastChange }} €</template>
      </span>
    </div>

    <button v-if="!readonly"
      class="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
      :title="ad.excluded ? 'Wieder in die Statistik aufnehmen' : 'Aus der Statistik streichen'"
      @click="emit('toggle', ad)">
      {{ ad.excluded ? 'Zurückholen' : 'Streichen' }}
    </button>
  </div>
</template>
