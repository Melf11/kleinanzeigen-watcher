<script setup lang="ts">
const props = defineProps<{
  values: (number | null)[]
  width?: number
  height?: number
}>()

const w = computed(() => props.width ?? 80)
const h = computed(() => props.height ?? 24)

const points = computed(() => props.values.filter((v): v is number => v != null))

const path = computed(() => {
  const vals = points.value
  if (vals.length < 2) return ''
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const stepX = w.value / (vals.length - 1)
  return vals
    .map((v, i) => {
      const x = i * stepX
      const y = h.value - ((v - min) / range) * (h.value - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const trendColor = computed(() => {
  const vals = points.value
  if (vals.length < 2) return '#64748b'
  const last = vals[vals.length - 1]
  const first = vals[0]
  if (last < first) return '#34d399' // dropped → good
  if (last > first) return '#f87171'
  return '#64748b'
})
</script>

<template>
  <svg v-if="path" :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" class="overflow-visible">
    <path :d="path" fill="none" :stroke="trendColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <span v-else class="text-xs text-slate-600">–</span>
</template>
