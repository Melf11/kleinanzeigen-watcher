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

const { data: me } = await useFetch<{ id: string; isAdmin?: boolean }>('/api/me')
// Client-side guard (the API also enforces admin on every call).
if (!me.value?.isAdmin) {
  await router.replace('/')
}

const { data: users, refresh, pending } = await useFetch<AdminUser[]>('/api/admin/users')
const error = ref('')

// Create form
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
    <div>
      <h1 class="text-xl font-semibold">Nutzerverwaltung</h1>
      <p class="text-sm text-slate-400">Konten anlegen, Rollen/Verifizierung verwalten, Passwörter zurücksetzen.</p>
    </div>

    <div v-if="error" class="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{{ error }}</div>

    <!-- Liste -->
    <section class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
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
    </section>

    <!-- Anlegen -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
      <h2 class="font-medium">Neuen Benutzer anlegen</h2>
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
    </section>
  </div>
</template>
