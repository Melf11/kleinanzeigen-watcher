<script setup lang="ts">
interface AdminUser {
  id: string
  username: string
  email: string | null
  email_verified: boolean
  is_admin: boolean
  created_at: string
  search_count: number
}

const { formatDate } = useFormat()
const router = useRouter()

const { data: me } = await useFetch<{ id: string; email: string | null; isAdmin?: boolean }>('/api/me')
// Client-side guard (the API also enforces admin on every call).
if (!me.value?.isAdmin) {
  await router.replace('/')
}

const { data: users, refresh, pending } = await useFetch<AdminUser[]>('/api/admin/users')
const error = ref('')

// --- Mailserver test ---
interface MailStatus {
  configured: boolean
  host: string | null
  port: number
  secure: boolean
  user: string | null
  from: string | null
}
const { data: mail } = await useFetch<MailStatus>('/api/admin/mail/status')
const mailTo = ref(me.value?.email ?? '')
const mailBusy = ref(false)
const mailMsg = ref('')
const mailErr = ref('')

async function sendMailTest() {
  mailBusy.value = true
  mailMsg.value = ''
  mailErr.value = ''
  try {
    const r = await $fetch<{ message?: string }>('/api/admin/mail/test', {
      method: 'POST',
      body: { to: mailTo.value },
    })
    mailMsg.value = r.message || 'Gesendet.'
  } catch (e: any) {
    mailErr.value = e?.data?.statusMessage || 'Test fehlgeschlagen'
  } finally {
    mailBusy.value = false
  }
}

// --- Create user ---
const nu = reactive({ username: '', email: '', password: '', isAdmin: false })
const creating = ref(false)
async function createUser() {
  creating.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: { ...nu } })
    nu.username = ''
    nu.email = ''
    nu.password = ''
    nu.isAdmin = false
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Anlegen fehlgeschlagen'
  } finally {
    creating.value = false
  }
}

async function patch(u: AdminUser, body: Record<string, unknown>) {
  error.value = ''
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body })
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Aktion fehlgeschlagen'
  }
}

async function resetPassword(u: AdminUser) {
  const pw = window.prompt(`Neues Passwort für „${u.username}" (mind. 8 Zeichen):`)
  if (!pw) return
  await patch(u, { password: pw })
  if (!error.value) window.alert('Passwort gesetzt.')
}

async function remove(u: AdminUser) {
  if (!window.confirm(`Benutzer „${u.username}" und alle seine Suchen/Daten löschen?`)) return
  error.value = ''
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Löschen fehlgeschlagen'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Admin header -->
    <div class="rounded-xl border border-brand-700/40 bg-brand-700/10 p-5">
      <div class="flex items-center gap-2">
        <span class="text-xl">🛡️</span>
        <h1 class="text-xl font-semibold">Administration</h1>
        <span class="rounded-full bg-brand-600/20 px-2 py-0.5 text-xs text-brand-300">nur für Admins</span>
      </div>
      <p class="mt-1 text-sm text-slate-400">
        Verwaltung für die ganze Instanz. Deine persönlichen Einstellungen findest du unter
        <NuxtLink to="/settings" class="text-brand-400 hover:underline">Einstellungen</NuxtLink>.
      </p>
    </div>

    <div v-if="error" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{{ error }}</div>

    <!-- Nutzerverwaltung -->
    <section class="space-y-4">
      <h2 class="text-lg font-medium">Nutzerverwaltung</h2>

      <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-800 text-left text-xs text-slate-500">
            <tr>
              <th class="px-4 py-3">Benutzer</th>
              <th class="px-4 py-3">E-Mail</th>
              <th class="px-4 py-3">Rolle</th>
              <th class="px-4 py-3">Suchen</th>
              <th class="px-4 py-3">Erstellt</th>
              <th class="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr v-if="pending"><td colspan="6" class="px-4 py-6 text-center text-slate-500">Lädt…</td></tr>
            <tr v-for="u in users" :key="u.id" class="hover:bg-slate-800/30">
              <td class="px-4 py-3 font-medium">
                {{ u.username }}
                <span v-if="u.id === me?.id" class="ml-1 text-xs text-slate-500">(du)</span>
              </td>
              <td class="px-4 py-3">
                <span v-if="u.email" class="text-slate-300">{{ u.email }}</span>
                <span v-else class="text-slate-600">–</span>
                <span v-if="u.email && u.email_verified" class="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">verifiziert</span>
                <button v-else-if="u.email" class="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-amber-500/25"
                  @click="patch(u, { emailVerified: true })">manuell verifizieren</button>
              </td>
              <td class="px-4 py-3">
                <span :class="['rounded-full px-2 py-0.5 text-xs', u.is_admin ? 'bg-brand-600/20 text-brand-300' : 'bg-slate-700/40 text-slate-400']">
                  {{ u.is_admin ? 'Admin' : 'Nutzer' }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-400">{{ u.search_count }}</td>
              <td class="px-4 py-3 text-slate-400">{{ formatDate(u.created_at) }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2 text-xs">
                  <button class="btn-secondary" @click="patch(u, { isAdmin: !u.is_admin })">
                    {{ u.is_admin ? 'Admin entziehen' : 'Zum Admin' }}
                  </button>
                  <button class="btn-secondary" @click="resetPassword(u)">Passwort</button>
                  <button v-if="u.id !== me?.id" class="btn-secondary text-red-300 hover:bg-red-500/10" @click="remove(u)">Löschen</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Anlegen -->
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 class="text-sm font-medium">Neuen Benutzer anlegen</h3>
        <p class="text-xs text-slate-500">Wird sofort aktiv (vor-verifiziert, kein E-Mail-Versand nötig).</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label class="block text-sm">
            <span class="text-slate-400">Benutzername</span>
            <input v-model="nu.username" type="text" class="input" />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">E-Mail (optional)</span>
            <input v-model="nu.email" type="email" class="input" />
          </label>
          <label class="block text-sm">
            <span class="text-slate-400">Passwort (min. 8)</span>
            <input v-model="nu.password" type="password" class="input" />
          </label>
          <label class="flex items-end gap-2 text-sm pb-2">
            <input v-model="nu.isAdmin" type="checkbox" class="checkbox" />
            <span class="text-slate-300">Als Admin</span>
          </label>
        </div>
        <button :disabled="creating || !nu.username || nu.password.length < 8" @click="createUser"
          class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {{ creating ? 'Anlegen…' : 'Benutzer anlegen' }}
        </button>
      </div>
    </section>

    <!-- Mailserver -->
    <section class="space-y-4">
      <h2 class="text-lg font-medium">Mailserver</h2>
      <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-400">SMTP-Versand (Verifizierung, Passwort-Reset)</span>
          <span v-if="mail?.configured" class="text-xs text-emerald-400">konfiguriert</span>
          <span v-else class="text-xs text-amber-400">kein SMTP – E-Mails werden nur geloggt</span>
        </div>

        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="text-slate-500">Host</dt>
          <dd class="font-mono">{{ mail?.host || '–' }}<span v-if="mail?.host">:{{ mail?.port }}</span></dd>
          <dt class="text-slate-500">Verschlüsselung</dt>
          <dd class="font-mono">{{ mail?.secure ? 'SSL/TLS (465)' : 'STARTTLS' }}</dd>
          <dt class="text-slate-500">Absender</dt>
          <dd class="font-mono">{{ mail?.from || '–' }}</dd>
          <dt class="text-slate-500">Login</dt>
          <dd class="font-mono">{{ mail?.user || '–' }}</dd>
        </dl>

        <div v-if="mailMsg" class="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">{{ mailMsg }}</div>
        <div v-if="mailErr" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300 break-words">{{ mailErr }}</div>

        <div class="flex flex-wrap items-end gap-2">
          <label class="block text-sm flex-1 min-w-56">
            <span class="text-slate-400">Test-E-Mail an</span>
            <input v-model="mailTo" type="email" placeholder="du@example.com" class="input" />
          </label>
          <button :disabled="mailBusy || !mailTo" @click="sendMailTest"
            class="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {{ mailBusy ? 'Sende…' : 'Test senden' }}
          </button>
        </div>
        <p class="text-xs text-slate-500">
          Fehler (z. B. <span class="font-mono">ECONNREFUSED</span>, Auth <span class="font-mono">535</span>) werden hier im Klartext angezeigt.
        </p>
      </div>
    </section>
  </div>
</template>
