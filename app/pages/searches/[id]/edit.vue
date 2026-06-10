<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { data } = await useFetch<{ search: any }>(`/api/searches/${id}`)
const busy = ref(false)
const error = ref('')

async function save(payload: any) {
  busy.value = true
  error.value = ''
  try {
    await $fetch(`/api/searches/${id}`, { method: 'PUT', body: payload })
    await router.push(`/searches/${id}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen'
    busy.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl space-y-4">
    <h1 class="text-xl font-semibold">Suche bearbeiten</h1>
    <div v-if="error" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{{ error }}</div>
    <SearchForm v-if="data?.search" :initial="data.search" submit-label="Änderungen speichern" :busy="busy" @submit="save" />
  </div>
</template>
