<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Filler,
  CategoryScale,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, TimeScale, Filler, CategoryScale)

interface HistoryPoint {
  run_at: string
  price_min: number | null
  price_max: number | null
  price_avg: number | null
  price_median: number | null
  ads_total: number
}

const props = defineProps<{ history: HistoryPoint[] }>()

const labels = computed(() =>
  props.history.map((p) =>
    new Date(p.run_at).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
  ),
)

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Min',
      data: props.history.map((p) => p.price_min),
      borderColor: 'rgba(45,212,191,0.25)',
      backgroundColor: 'rgba(45,212,191,0.08)',
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      tension: 0.25,
    },
    {
      label: 'Max',
      data: props.history.map((p) => p.price_max),
      borderColor: 'rgba(45,212,191,0.25)',
      backgroundColor: 'rgba(45,212,191,0.10)',
      borderWidth: 1,
      pointRadius: 0,
      fill: '-1',
      tension: 0.25,
    },
    {
      label: 'Median',
      data: props.history.map((p) => p.price_median),
      borderColor: '#14b8a6',
      backgroundColor: '#14b8a6',
      borderWidth: 2,
      pointRadius: 2,
      fill: false,
      tension: 0.25,
    },
    {
      label: 'Ø',
      data: props.history.map((p) => p.price_avg),
      borderColor: '#818cf8',
      backgroundColor: '#818cf8',
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      fill: false,
      tension: 0.25,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { labels: { color: '#cbd5e1', boxWidth: 12 } },
    tooltip: {
      callbacks: {
        label: (ctx: any) =>
          `${ctx.dataset.label}: ${ctx.parsed.y == null ? '–' : ctx.parsed.y + ' €'}`,
      },
    },
  },
  scales: {
    x: { ticks: { color: '#64748b', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { color: 'rgba(148,163,184,0.08)' } },
    y: { ticks: { color: '#64748b', callback: (v: any) => `${v} €` }, grid: { color: 'rgba(148,163,184,0.08)' } },
  },
}
</script>

<template>
  <div class="h-64">
    <Line v-if="history.length" :data="chartData" :options="chartOptions" />
    <div v-else class="flex h-full items-center justify-center text-sm text-slate-500">
      Noch keine Verlaufsdaten – führe einen Suchlauf aus.
    </div>
  </div>
</template>
