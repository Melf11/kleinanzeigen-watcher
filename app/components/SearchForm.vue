<script setup lang="ts">
interface SearchModel {
  name: string
  query: string
  include_keywords: string
  include_mode: string
  exclude_keywords: string
  location_id: string | null
  distance: string | null
  min_price: number | null
  max_price: number | null
  category_id: string | null
  poster_type: string | null
  ad_type: string | null
  picture_required: boolean
  shippable: boolean
  max_pages: number
  interval_minutes: number
  enabled: boolean
}

const props = defineProps<{
  initial?: Partial<SearchModel>
  submitLabel?: string
  busy?: boolean
}>()

const emit = defineEmits<{ submit: [SearchModel] }>()

const form = reactive<SearchModel>({
  name: props.initial?.name ?? '',
  query: props.initial?.query ?? '',
  include_keywords: props.initial?.include_keywords ?? '',
  include_mode: props.initial?.include_mode ?? 'all',
  exclude_keywords: props.initial?.exclude_keywords ?? '',
  location_id: props.initial?.location_id ?? null,
  distance: props.initial?.distance ?? null,
  min_price: props.initial?.min_price ?? null,
  max_price: props.initial?.max_price ?? null,
  category_id: props.initial?.category_id ?? null,
  poster_type: props.initial?.poster_type ?? null,
  ad_type: props.initial?.ad_type ?? 'OFFER',
  picture_required: props.initial?.picture_required ?? false,
  shippable: props.initial?.shippable ?? false,
  max_pages: props.initial?.max_pages ?? 1,
  interval_minutes: props.initial?.interval_minutes ?? 1440,
  enabled: props.initial?.enabled ?? true,
})

const intervalOptions = [
  { label: 'Alle 6 Stunden', value: 360 },
  { label: 'Alle 12 Stunden', value: 720 },
  { label: 'Täglich (24h)', value: 1440 },
  { label: 'Alle 2 Tage', value: 2880 },
  { label: 'Wöchentlich', value: 10080 },
]

// Location lookup
const locQuery = ref('')
const locResults = ref<any[]>([])
const locLoading = ref(false)
const locError = ref('')

async function searchLocation() {
  if (!locQuery.value.trim()) return
  locLoading.value = true
  locError.value = ''
  try {
    locResults.value = await $fetch('/api/locations', { query: { q: locQuery.value } })
  } catch (e: any) {
    locError.value = e?.data?.statusMessage || 'Standortsuche fehlgeschlagen'
  } finally {
    locLoading.value = false
  }
}

function pickLocation(loc: any) {
  form.location_id = String(loc.id ?? loc.location_id ?? '')
  locQuery.value = loc.name ?? loc.city ?? form.location_id
  locResults.value = []
}

// Categories (cascading selects: Hauptkategorie → Unterkategorie)
interface CategoryNode {
  id: string
  name: string
  children: { id: string; name: string }[]
}
const categories = ref<CategoryNode[]>([])
const mainCategory = ref('')
const subCategory = ref('')
let categoriesReady = false

const subOptions = computed(
  () => categories.value.find((c) => c.id === mainCategory.value)?.children ?? [],
)

function applyCategoryToForm() {
  form.category_id = subCategory.value || mainCategory.value || null
}

// When the user changes the main category, reset the sub and update the form.
watch(mainCategory, () => {
  if (!categoriesReady) return
  subCategory.value = ''
  applyCategoryToForm()
})
watch(subCategory, () => {
  if (!categoriesReady) return
  applyCategoryToForm()
})

// Resolve the stored category_id back into the two selects (for edit).
function preselectFromForm() {
  const id = form.category_id
  if (!id) return
  const top = categories.value.find((c) => c.id === id)
  if (top) {
    mainCategory.value = top.id
    return
  }
  for (const c of categories.value) {
    if (c.children.some((s) => s.id === id)) {
      mainCategory.value = c.id
      subCategory.value = id
      return
    }
  }
}

onMounted(async () => {
  try {
    categories.value = await $fetch<CategoryNode[]>('/api/categories')
    preselectFromForm()
  } catch {
    // Categories optional — form still works without them.
  } finally {
    categoriesReady = true
  }
})

function onSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="onSubmit">
    <!-- Basis -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <h2 class="font-medium">Suche</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block text-sm">
          <span class="text-slate-400">Name</span>
          <input v-model="form.name" type="text" placeholder="z.B. Trek Rennrad 28 Zoll"
            class="input" />
        </label>
        <label class="block text-sm">
          <span class="text-slate-400">Suchbegriff (Titel) *</span>
          <input v-model="form.query" type="text" required placeholder="fahrrad"
            class="input" />
        </label>
      </div>
    </section>

    <!-- Schlagwörter -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <h2 class="font-medium">Schlagwörter <span class="text-xs text-slate-500">(lokaler Filter, kostet keine Credits)</span></h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block text-sm">
          <span class="text-slate-400">Pflicht-Schlagwörter</span>
          <input v-model="form.include_keywords" type="text" placeholder="28 zoll, carbon"
            class="input" />
          <span class="text-xs text-slate-500">Komma-getrennt. Geprüft in Titel + Beschreibung.</span>
        </label>
        <label class="block text-sm">
          <span class="text-slate-400">Verknüpfung</span>
          <select v-model="form.include_mode" class="input">
            <option value="all">UND – alle müssen vorkommen</option>
            <option value="any">ODER – mindestens eins</option>
          </select>
        </label>
        <label class="block text-sm sm:col-span-2">
          <span class="text-slate-400">Ausschluss-Wörter</span>
          <input v-model="form.exclude_keywords" type="text" placeholder="defekt, bastler"
            class="input" />
          <span class="text-xs text-slate-500">Anzeige wird verworfen, wenn eines dieser Wörter vorkommt.</span>
        </label>
      </div>
    </section>

    <!-- API-Filter -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <h2 class="font-medium">Filter</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block text-sm">
          <span class="text-slate-400">Kategorie</span>
          <select v-model="mainCategory" class="input" :disabled="!categories.length">
            <option value="">{{ categories.length ? 'Alle Kategorien' : 'Lädt…' }}</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="block text-sm">
          <span class="text-slate-400">Unterkategorie</span>
          <select v-model="subCategory" class="input" :disabled="!subOptions.length">
            <option value="">{{ mainCategory ? 'Gesamte Kategorie' : '–' }}</option>
            <option v-for="s in subOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
        <div class="block text-sm">
          <span class="text-slate-400">Standort</span>
          <div class="mt-1 flex gap-2">
            <input v-model="locQuery" type="text" placeholder="Ort oder PLZ"
              class="input !mt-0 flex-1" @keydown.enter.prevent="searchLocation" />
            <button type="button" class="btn-secondary whitespace-nowrap" :disabled="locLoading" @click="searchLocation">
              {{ locLoading ? '…' : 'Suchen' }}
            </button>
          </div>
          <span v-if="form.location_id" class="text-xs text-emerald-400">location_id = {{ form.location_id }}
            <button type="button" class="ml-1 text-slate-500 hover:text-slate-300" @click="form.location_id = null; locQuery = ''">✕</button>
          </span>
          <span v-if="locError" class="text-xs text-red-400">{{ locError }}</span>
          <ul v-if="locResults.length" class="mt-1 rounded-md border border-slate-700 bg-slate-950 text-sm divide-y divide-slate-800">
            <li v-for="loc in locResults" :key="loc.id ?? loc.location_id">
              <button type="button" class="w-full px-3 py-1.5 text-left hover:bg-slate-800" @click="pickLocation(loc)">
                {{ loc.name ?? loc.city }} <span class="text-slate-500">#{{ loc.id ?? loc.location_id }}</span>
              </button>
            </li>
          </ul>
        </div>
        <label class="block text-sm">
          <span class="text-slate-400">Umkreis (km)</span>
          <input v-model="form.distance" type="number" min="0" placeholder="25" class="input" />
        </label>
        <label class="block text-sm">
          <span class="text-slate-400">Mindestpreis (€)</span>
          <input v-model.number="form.min_price" type="number" min="0" class="input" />
        </label>
        <label class="block text-sm">
          <span class="text-slate-400">Höchstpreis (€)</span>
          <input v-model.number="form.max_price" type="number" min="0" class="input" />
        </label>
        <label class="block text-sm">
          <span class="text-slate-400">Anbieter</span>
          <select v-model="form.poster_type" class="input">
            <option :value="null">Egal</option>
            <option value="PRIVATE">Privat</option>
            <option value="COMMERCIAL">Gewerblich</option>
          </select>
        </label>
        <label class="block text-sm">
          <span class="text-slate-400">Anzeigentyp</span>
          <select v-model="form.ad_type" class="input">
            <option value="OFFER">Angebote</option>
            <option value="WANTED">Gesuche</option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.picture_required" type="checkbox" class="checkbox" />
          <span class="text-slate-300">Nur mit Bild</span>
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.shippable" type="checkbox" class="checkbox" />
          <span class="text-slate-300">Nur mit Versand</span>
        </label>
      </div>
    </section>

    <!-- Monitoring -->
    <section class="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <h2 class="font-medium">Überwachung</h2>
      <div class="grid gap-4 sm:grid-cols-3">
        <label class="block text-sm">
          <span class="text-slate-400">Intervall</span>
          <select v-model.number="form.interval_minutes" class="input">
            <option v-for="opt in intervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </label>
        <label class="block text-sm">
          <span class="text-slate-400">Seiten pro Lauf</span>
          <input v-model.number="form.max_pages" type="number" min="1" max="10" class="input" />
          <span class="text-xs text-amber-400/80">= {{ form.max_pages }} Credit(s) pro Lauf (à 100 Anzeigen)</span>
        </label>
        <label class="flex items-end gap-2 text-sm pb-2">
          <input v-model="form.enabled" type="checkbox" class="checkbox" />
          <span class="text-slate-300">Automatisch überwachen</span>
        </label>
      </div>
    </section>

    <div class="flex items-center gap-3">
      <button type="submit" :disabled="busy"
        class="rounded-md bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
        {{ busy ? 'Speichern…' : (submitLabel || 'Speichern') }}
      </button>
      <NuxtLink to="/" class="text-sm text-slate-400 hover:text-slate-200">Abbrechen</NuxtLink>
    </div>
  </form>
</template>
