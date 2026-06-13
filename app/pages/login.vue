<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const router = useRouter()
const { fetch: refreshSession } = useUserSession()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

// Shown when login is blocked because the email isn't verified yet.
const unverifiedEmail = ref('')
const resendMsg = ref('')

async function submit() {
  error.value = ''
  resendMsg.value = ''
  unverifiedEmail.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    await refreshSession()
    await router.push((route.query.redirect as string) || '/dashboard')
  } catch (e: any) {
    if (e?.data?.data?.code === 'EMAIL_UNVERIFIED') {
      unverifiedEmail.value = e.data.data.email || ''
      error.value = 'Bitte bestätige zuerst deine E-Mail-Adresse.'
    } else {
      error.value = e?.data?.statusMessage || e?.statusMessage || 'Login fehlgeschlagen'
    }
  } finally {
    loading.value = false
  }
}

async function resend() {
  resendMsg.value = ''
  try {
    await $fetch('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: unverifiedEmail.value },
    })
    resendMsg.value = 'Bestätigungs-E-Mail erneut gesendet.'
  } catch (e: any) {
    resendMsg.value = e?.data?.statusMessage || 'Senden fehlgeschlagen'
  }
}
</script>

<template>
  <form class="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6" @submit.prevent="submit">
    <h1 class="text-lg font-semibold">Anmelden</h1>

    <div v-if="error" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
      {{ error }}
      <button v-if="unverifiedEmail" type="button" class="ml-1 underline" @click="resend">
        Erneut senden
      </button>
    </div>
    <div v-if="resendMsg" class="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">
      {{ resendMsg }}
    </div>

    <label class="block text-sm">
      <span class="text-slate-400">Benutzername</span>
      <input v-model="username" type="text" autocomplete="username" required class="input" />
    </label>

    <label class="block text-sm">
      <span class="text-slate-400">Passwort</span>
      <input v-model="password" type="password" autocomplete="current-password" required class="input" />
    </label>

    <button type="submit" :disabled="loading"
      class="w-full rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
      {{ loading ? 'Anmelden…' : 'Anmelden' }}
    </button>

    <div class="flex items-center justify-between text-sm text-slate-400">
      <NuxtLink to="/register" class="text-brand-400 hover:underline">Registrieren</NuxtLink>
      <NuxtLink to="/forgot-password" class="hover:underline">Passwort vergessen?</NuxtLink>
    </div>
  </form>
</template>
