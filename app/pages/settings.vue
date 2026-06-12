<script setup lang="ts">
interface Me {
  id: string
  username: string
  email: string | null
  emailVerified: boolean
  pendingEmail: string | null
  hasToken: boolean
  tokenMasked: string | null
  telegram: { configured: boolean; botTokenMasked: string | null; chatId: string | null }
  whatsapp: { configured: boolean; phone: string | null; apiKeyMasked: string | null }
}

const { data: me, refresh } = await useFetch<Me>('/api/me')

// --- Account: password & email ---
const curPw = ref('')
const newPw = ref('')
const pwMsg = ref('')
const pwErr = ref('')
const pwBusy = ref(false)

async function changePassword() {
  pwBusy.value = true
  pwMsg.value = ''
  pwErr.value = ''
  try {
    await $fetch('/api/me/change-password', {
      method: 'POST',
      body: { currentPassword: curPw.value, newPassword: newPw.value },
    })
    curPw.value = ''
    newPw.value = ''
    pwMsg.value = 'Passwort geändert.'
  } catch (e: any) {
    pwErr.value = e?.data?.statusMessage || 'Fehler'
  } finally {
    pwBusy.value = false
  }
}

const newEmail = ref('')
const emailPw = ref('')
const emailMsg = ref('')
const emailErr = ref('')
const emailBusy = ref(false)

async function changeEmail() {
  emailBusy.value = true
  emailMsg.value = ''
  emailErr.value = ''
  try {
    const r = await $fetch<{ message?: string }>('/api/me/change-email', {
      method: 'POST',
      body: { email: newEmail.value, password: emailPw.value },
    })
    newEmail.value = ''
    emailPw.value = ''
    await refresh()
    emailMsg.value = r.message || 'Bestätigungs-Mail gesendet.'
  } catch (e: any) {
    emailErr.value = e?.data?.statusMessage || 'Fehler'
  } finally {
    emailBusy.value = false
  }
}

async function resendVerification() {
  emailMsg.value = ''
  emailErr.value = ''
  try {
    await $fetch('/api/auth/resend-verification', { method: 'POST', body: { email: me.value?.email } })
    emailMsg.value = 'Bestätigungs-E-Mail erneut gesendet.'
  } catch (e: any) {
    emailErr.value = e?.data?.statusMessage || 'Fehler'
  }
}

const apiKey = ref('')
const saving = ref(false)
const message = ref('')
const error = ref('')

// Notification config inputs
const tgBotToken = ref('')
const tgChatId = ref('')
const waPhone = ref('')
const waApikey = ref('')
const notifySaving = ref(false)
const notifyMsg = ref('')
const notifyErr = ref('')
const testing = ref('')

// Prefill the non-secret fields (chat id, phone) once loaded.
watchEffect(() => {
  if (me.value) {
    if (tgChatId.value === '') tgChatId.value = me.value.telegram.chatId ?? ''
    if (waPhone.value === '') waPhone.value = me.value.whatsapp.phone ?? ''
  }
})

async function saveNotify() {
  notifySaving.value = true
  notifyMsg.value = ''
  notifyErr.value = ''
  try {
    const body: any = { tgChatId: tgChatId.value, waPhone: waPhone.value }
    if (tgBotToken.value) body.tgBotToken = tgBotToken.value
    if (waApikey.value) body.waApikey = waApikey.value
    await $fetch('/api/me', { method: 'PUT', body })
    tgBotToken.value = ''
    waApikey.value = ''
    await refresh()
    notifyMsg.value = 'Benachrichtigungen gespeichert.'
  } catch (e: any) {
    notifyErr.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen'
  } finally {
    notifySaving.value = false
  }
}

async function sendTest(channel: 'telegram' | 'whatsapp') {
  testing.value = channel
  notifyMsg.value = ''
  notifyErr.value = ''
  try {
    await $fetch('/api/notify/test', { method: 'POST', body: { channel } })
    notifyMsg.value = `Testnachricht an ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'} gesendet.`
  } catch (e: any) {
    notifyErr.value = e?.data?.statusMessage || 'Test fehlgeschlagen'
  } finally {
    testing.value = ''
  }
}

// Build/version info (baked in at image build time; empty locally).
const { formatDate } = useFormat()
const rc = useRuntimeConfig()
const appVersion = computed(() => (rc.public.appVersion as string) || 'dev')
const gitShaShort = computed(() => {
  const s = rc.public.gitSha as string
  return s ? s.slice(0, 7) : null
})
const buildTime = computed(() => (rc.public.buildTime as string) || null)
const isLocal = computed(() => !rc.public.gitSha)

async function save() {
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    await $fetch('/api/me', { method: 'PUT', body: { apiKey: apiKey.value } })
    apiKey.value = ''
    await refresh()
    message.value = 'Gespeichert.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Speichern fehlgeschlagen'
  } finally {
    saving.value = false
  }
}

async function clearToken() {
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    await $fetch('/api/me', { method: 'PUT', body: { apiKey: '' } })
    apiKey.value = ''
    await refresh()
    message.value = 'Token entfernt.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Fehler'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <div>
      <h1 class="text-xl font-semibold">Einstellungen</h1>
      <p class="text-sm text-slate-400">Angemeldet als {{ me?.username }}</p>
    </div>

    <!-- Konto -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
      <h2 class="font-medium">Konto</h2>

      <div class="text-sm">
        <span class="text-slate-400">E-Mail:</span>
        <span v-if="me?.email" class="ml-2">{{ me.email }}</span>
        <span v-else class="ml-2 text-slate-500">keine hinterlegt</span>
        <span v-if="me?.email && me?.emailVerified" class="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">verifiziert</span>
        <span v-else-if="me?.email" class="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
          nicht verifiziert
          <button type="button" class="ml-1 underline" @click="resendVerification">erneut senden</button>
        </span>
      </div>
      <p v-if="me?.pendingEmail" class="text-xs text-amber-400">
        Ausstehende Änderung auf {{ me.pendingEmail }} – bitte über den Link in der E-Mail bestätigen.
      </p>

      <div v-if="emailMsg" class="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">{{ emailMsg }}</div>
      <div v-if="emailErr" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{{ emailErr }}</div>

      <!-- E-Mail ändern -->
      <div class="rounded-lg border border-slate-800 p-4 space-y-3">
        <h3 class="text-sm font-medium">E-Mail ändern</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-sm">
            <span class="text-slate-400">Neue E-Mail</span>
            <input v-model="newEmail" type="email" class="input" />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">Passwort zur Bestätigung</span>
            <input v-model="emailPw" type="password" autocomplete="current-password" class="input" />
          </label>
        </div>
        <button :disabled="emailBusy || !newEmail || !emailPw" @click="changeEmail"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {{ emailBusy ? 'Senden…' : 'Bestätigungs-Mail senden' }}
        </button>
      </div>

      <!-- Passwort ändern -->
      <div class="rounded-lg border border-slate-800 p-4 space-y-3">
        <h3 class="text-sm font-medium">Passwort ändern</h3>
        <div v-if="pwMsg" class="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">{{ pwMsg }}</div>
        <div v-if="pwErr" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{{ pwErr }}</div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-sm">
            <span class="text-slate-400">Aktuelles Passwort</span>
            <input v-model="curPw" type="password" autocomplete="current-password" class="input" />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">Neues Passwort</span>
            <input v-model="newPw" type="password" autocomplete="new-password" class="input" />
          </label>
        </div>
        <button :disabled="pwBusy || !curPw || newPw.length < 8" @click="changePassword"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {{ pwBusy ? 'Speichern…' : 'Passwort ändern' }}
        </button>
      </div>
    </section>

    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
      <div>
        <h2 class="font-medium">kleinanzeigen-agent API-Token</h2>
        <p class="text-sm text-slate-400 mt-1">
          Dein persönlicher API-Schlüssel von
          <a href="https://kleinanzeigen-agent.de" target="_blank" class="text-brand-400 hover:underline">kleinanzeigen-agent.de</a>.
          Wird serverseitig gespeichert und für deine Suchläufe verwendet. Jeder Suchlauf
          kostet 1 Credit pro abgefragter Seite.
        </p>
      </div>

      <div class="text-sm">
        <span class="text-slate-400">Aktueller Token:</span>
        <span v-if="me?.hasToken" class="ml-2 font-mono text-emerald-400">{{ me?.tokenMasked }}</span>
        <span v-else class="ml-2 text-amber-400">noch nicht hinterlegt</span>
      </div>

      <div v-if="message" class="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">{{ message }}</div>
      <div v-if="error" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{{ error }}</div>

      <label class="block text-sm">
        <span class="text-slate-400">Neuer Token</span>
        <input v-model="apiKey" type="password" placeholder="klaz_live_…"
          class="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono outline-none focus:border-brand-500" />
      </label>

      <div class="flex gap-3">
        <button :disabled="saving || !apiKey" @click="save"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          Speichern
        </button>
        <button v-if="me?.hasToken" :disabled="saving" @click="clearToken"
          class="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">
          Token entfernen
        </button>
      </div>
    </section>

    <!-- Benachrichtigungen -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
      <div>
        <h2 class="font-medium">Benachrichtigungen</h2>
        <p class="mt-1 text-sm text-slate-400">
          Zusammenfassungen werden pro Suche im jeweiligen Überwachungsintervall verschickt.
          Hier hinterlegst du die Kanäle; aktivieren tust du sie pro Suche.
        </p>
      </div>

      <div v-if="notifyMsg" class="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">{{ notifyMsg }}</div>
      <div v-if="notifyErr" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{{ notifyErr }}</div>

      <!-- Telegram -->
      <div class="rounded-lg border border-slate-800 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium">Telegram
            <span v-if="me?.telegram.configured" class="ml-1 text-xs text-emerald-400">eingerichtet</span>
            <span v-else class="ml-1 text-xs text-slate-500">nicht eingerichtet</span>
          </h3>
          <button v-if="me?.telegram.configured" :disabled="testing === 'telegram'" @click="sendTest('telegram')"
            class="btn-secondary">{{ testing === 'telegram' ? 'sende…' : 'Test senden' }}</button>
        </div>
        <p class="text-xs text-slate-500">
          Bot bei <span class="font-mono">@BotFather</span> anlegen → Bot-Token. Dann dem Bot eine Nachricht
          schicken und deine Chat-ID (z. B. über <span class="font-mono">@userinfobot</span>) eintragen.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-sm">
            <span class="text-slate-400">Bot-Token {{ me?.telegram.botTokenMasked ? `(${me.telegram.botTokenMasked})` : '' }}</span>
            <input v-model="tgBotToken" type="password" placeholder="123456:ABC-…" class="input font-mono" />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">Chat-ID</span>
            <input v-model="tgChatId" type="text" placeholder="z. B. 123456789" class="input font-mono" />
          </label>
        </div>
      </div>

      <!-- WhatsApp -->
      <div class="rounded-lg border border-slate-800 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium">WhatsApp <span class="text-xs text-slate-500">(via CallMeBot)</span>
            <span v-if="me?.whatsapp.configured" class="ml-1 text-xs text-emerald-400">eingerichtet</span>
            <span v-else class="ml-1 text-xs text-slate-500">nicht eingerichtet</span>
          </h3>
          <button v-if="me?.whatsapp.configured" :disabled="testing === 'whatsapp'" @click="sendTest('whatsapp')"
            class="btn-secondary">{{ testing === 'whatsapp' ? 'sende…' : 'Test senden' }}</button>
        </div>
        <p class="text-xs text-slate-500">
          Einmalig einrichten: <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" class="text-brand-400 hover:underline">CallMeBot</a>-Nummer
          speichern, „I allow callmebot to send me messages" schicken → du erhältst einen apikey.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-sm">
            <span class="text-slate-400">Telefonnummer (mit Ländervorwahl)</span>
            <input v-model="waPhone" type="text" placeholder="+4915123456789" class="input font-mono" />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">CallMeBot apikey {{ me?.whatsapp.apiKeyMasked ? `(${me.whatsapp.apiKeyMasked})` : '' }}</span>
            <input v-model="waApikey" type="password" placeholder="123456" class="input font-mono" />
          </label>
        </div>
      </div>

      <button :disabled="notifySaving" @click="saveNotify"
        class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
        {{ notifySaving ? 'Speichern…' : 'Benachrichtigungen speichern' }}
      </button>
    </section>

    <!-- Version / Build -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 class="font-medium">Version</h2>
      <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt class="text-slate-500">Version</dt>
        <dd class="font-mono">
          {{ appVersion }}<span v-if="isLocal" class="text-slate-500"> (lokal)</span>
        </dd>
        <template v-if="gitShaShort">
          <dt class="text-slate-500">Commit</dt>
          <dd class="font-mono">{{ gitShaShort }}</dd>
        </template>
        <template v-if="buildTime">
          <dt class="text-slate-500">Gebaut</dt>
          <dd class="font-mono">{{ formatDate(buildTime) }}</dd>
        </template>
      </dl>
    </section>
  </div>
</template>
