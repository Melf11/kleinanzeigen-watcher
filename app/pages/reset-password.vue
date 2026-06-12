<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const router = useRouter()

const password = ref('')
const error = ref('')
const loading = ref(false)
const done = ref(false)
const token = computed(() => route.query.token as string | undefined)

async function submit() {
  error.value = ''
  if (!token.value) {
    error.value = 'Kein Token angegeben.'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    done.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Zurücksetzen fehlgeschlagen'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
    <div v-if="done" class="space-y-3 text-center">
      <div class="text-3xl">✅</div>
      <h1 class="text-lg font-semibold">Passwort geändert</h1>
      <button class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        @click="router.push('/login')">Zum Login</button>
    </div>

    <form v-else class="space-y-4" @submit.prevent="submit">
      <h1 class="text-lg font-semibold">Neues Passwort setzen</h1>
      <div v-if="error" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{{ error }}</div>
      <label class="block text-sm">
        <span class="text-slate-400">Neues Passwort</span>
        <input v-model="password" type="password" autocomplete="new-password" required minlength="8" class="input" />
        <span class="text-xs text-slate-500">Mindestens 8 Zeichen.</span>
      </label>
      <button type="submit" :disabled="loading"
        class="w-full rounded-md bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
        {{ loading ? 'Speichern…' : 'Passwort setzen' }}
      </button>
    </form>
  </div>
</template>
