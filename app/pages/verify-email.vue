<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const router = useRouter()
const { fetch: refreshSession } = useUserSession()

const state = ref<'working' | 'ok' | 'error'>('working')
const message = ref('')

onMounted(async () => {
  const token = route.query.token as string
  const isChange = route.query.change === '1'
  if (!token) {
    state.value = 'error'
    message.value = 'Kein Token angegeben.'
    return
  }
  try {
    const endpoint = isChange ? '/api/auth/verify-email-change' : '/api/auth/verify-email'
    await $fetch(endpoint, { method: 'POST', body: { token } })
    await refreshSession()
    state.value = 'ok'
    message.value = isChange ? 'E-Mail-Adresse bestätigt.' : 'E-Mail bestätigt – du bist eingeloggt.'
  } catch (e: any) {
    state.value = 'error'
    message.value = e?.data?.statusMessage || 'Bestätigung fehlgeschlagen.'
  }
})
</script>

<template>
  <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center space-y-3">
    <template v-if="state === 'working'">
      <div class="text-3xl">⏳</div>
      <p class="text-sm text-slate-400">E-Mail wird bestätigt…</p>
    </template>
    <template v-else-if="state === 'ok'">
      <div class="text-3xl">✅</div>
      <h1 class="text-lg font-semibold">{{ message }}</h1>
      <button class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        @click="router.push('/')">Zum Dashboard</button>
    </template>
    <template v-else>
      <div class="text-3xl">⚠️</div>
      <h1 class="text-lg font-semibold">Bestätigung fehlgeschlagen</h1>
      <p class="text-sm text-slate-400">{{ message }}</p>
      <NuxtLink to="/login" class="inline-block text-sm text-brand-400 hover:underline">Zum Login</NuxtLink>
    </template>
  </div>
</template>
