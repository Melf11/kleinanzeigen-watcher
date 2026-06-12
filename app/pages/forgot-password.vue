<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const loading = ref(false)
const done = ref(false)

async function submit() {
  loading.value = true
  try {
    await $fetch('/api/auth/forgot-password', { method: 'POST', body: { email: email.value } })
  } finally {
    loading.value = false
    done.value = true // always show the same generic confirmation
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
    <div v-if="done" class="space-y-3 text-center">
      <div class="text-3xl">📧</div>
      <h1 class="text-lg font-semibold">Prüfe dein Postfach</h1>
      <p class="text-sm text-slate-400">
        Falls ein Konto mit dieser Adresse existiert, haben wir einen Link zum Zurücksetzen gesendet.
      </p>
      <NuxtLink to="/login" class="inline-block text-sm text-brand-400 hover:underline">Zurück zum Login</NuxtLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <h1 class="text-lg font-semibold">Passwort vergessen</h1>
      <p class="text-sm text-slate-400">Gib deine E-Mail-Adresse ein – wir senden dir einen Reset-Link.</p>
      <label class="block text-sm">
        <span class="text-slate-400">E-Mail</span>
        <input v-model="email" type="email" autocomplete="email" required class="input" />
      </label>
      <button type="submit" :disabled="loading"
        class="w-full rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
        {{ loading ? 'Senden…' : 'Reset-Link senden' }}
      </button>
      <NuxtLink to="/login" class="block text-center text-sm text-slate-400 hover:underline">Zurück zum Login</NuxtLink>
    </form>
  </div>
</template>
