<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const done = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { username: username.value, email: email.value, password: password.value },
    })
    done.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Registrierung fehlgeschlagen'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
    <div v-if="done" class="space-y-3 text-center">
      <div class="text-3xl">📧</div>
      <h1 class="text-lg font-semibold">Fast geschafft</h1>
      <p class="text-sm text-slate-400">
        Wir haben dir eine Bestätigungs-E-Mail an <span class="text-slate-200">{{ email }}</span> geschickt.
        Klicke den Link darin, um dein Konto zu aktivieren.
      </p>
      <NuxtLink to="/login" class="inline-block text-sm text-brand-400 hover:underline">Zurück zum Login</NuxtLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <h1 class="text-lg font-semibold">Registrieren</h1>

      <div v-if="error" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
        {{ error }}
      </div>

      <label class="block text-sm">
        <span class="text-slate-400">Benutzername</span>
        <input v-model="username" type="text" autocomplete="username" required minlength="3" class="input" />
      </label>
      <label class="block text-sm">
        <span class="text-slate-400">E-Mail</span>
        <input v-model="email" type="email" autocomplete="email" required class="input" />
      </label>
      <label class="block text-sm">
        <span class="text-slate-400">Passwort</span>
        <input v-model="password" type="password" autocomplete="new-password" required minlength="8" class="input" />
        <span class="text-xs text-slate-500">Mindestens 8 Zeichen.</span>
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
  </div>
</template>
