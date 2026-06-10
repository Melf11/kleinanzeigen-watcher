<script setup lang="ts">
const router = useRouter()
const busy = ref(false)
const error = ref('')

async function create(payload: any) {
  busy.value = true
  error.value = ''
  try {
    const search = await $fetch<{ id: string }>('/api/searches', { method: 'POST', body: payload })
    await router.push(`/searches/${search.id}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Anlegen fehlgeschlagen'
    busy.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl space-y-4">
    <h1 class="text-xl font-semibold">Neue Suche</h1>
    <div v-if="error" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{{ error }}</div>
    <SearchForm submit-label="Suche anlegen" :busy="busy" @submit="create" />
  </div>
</template>
