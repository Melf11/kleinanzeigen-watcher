<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const router = useRouter()
const { fetch: refreshSession } = useUserSession()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    await refreshSession()
    await router.push('/settings')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Registrierung fehlgeschlagen'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6" @submit.prevent="submit">
    <h1 class="text-lg font-semibold">Registrieren</h1>

    <div v-if="error" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
      {{ error }}
    </div>

    <label class="block text-sm">
      <span class="text-slate-400">Benutzername</span>
      <input v-model="username" type="text" autocomplete="username" required minlength="3"
        class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-brand-500" />
    </label>

    <label class="block text-sm">
      <span class="text-slate-400">Passwort</span>
      <input v-model="password" type="password" autocomplete="new-password" required minlength="6"
        class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-brand-500" />
    </label>

    <button type="submit" :disabled="loading"
      class="w-full rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
      {{ loading ? 'Erstellen…' : 'Konto erstellen' }}
    </button>

    <p class="text-center text-sm text-slate-400">
      Schon registriert?
      <NuxtLink to="/login" class="text-brand-400 hover:underline">Anmelden</NuxtLink>
    </p>
  </form>
</template>
