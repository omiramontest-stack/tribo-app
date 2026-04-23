<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

const router = useRouter()
const orgStore = useOrganizationStore()

const form = reactive({
  organizationName: '',
  industry: '',
  country: '',
  phone: '',
})
const loading = ref(false)
const error = ref('')

const industries = [
  'Retail',
  'Food & Beverage',
  'Health & Wellness',
  'Beauty',
  'Entertainment',
  'Sports',
  'Education',
  'Other',
]

async function handleSubmit() {
  if (!form.organizationName.trim()) {
    error.value = 'El nombre de la organización es requerido'
    return
  }
  try {
    loading.value = true
    error.value = ''
    await orgStore.onboarding({
      organizationName: form.organizationName.trim(),
      industry: form.industry || undefined,
      country: form.country || undefined,
      phone: form.phone || undefined,
    })
    router.push({ name: 'Dashboard' })
  } catch {
    error.value = 'Ocurrió un error al crear la organización'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <span class="text-2xl font-bold text-white">Wallet SaaS</span>
        <p class="text-neutral-400 text-sm mt-2">Configura tu organización para comenzar</p>
      </div>

      <div class="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 space-y-6">
        <div>
          <h1 class="text-lg font-semibold text-white">Crea tu organización</h1>
          <p class="text-neutral-400 text-sm mt-1">Podrás cambiar estos datos después en configuración.</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1.5">
              Nombre del negocio <span class="text-red-400">*</span>
            </label>
            <input
              v-model="form.organizationName"
              type="text"
              placeholder="Ej. Café La Estrella"
              class="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-500"
              @keyup.enter="handleSubmit"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1.5">Industria</label>
            <select
              v-model="form.industry"
              class="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar (opcional)</option>
              <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-neutral-300 mb-1.5">País</label>
              <input
                v-model="form.country"
                type="text"
                placeholder="México"
                class="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-300 mb-1.5">Teléfono</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="+52 55 0000 0000"
                class="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-500"
              />
            </div>
          </div>
        </div>

        <p v-if="error" class="text-red-400 text-sm">{{ error }}</p>

        <button
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          @click="handleSubmit"
        >
          {{ loading ? 'Creando organización...' : 'Continuar al dashboard →' }}
        </button>
      </div>
    </div>
  </div>
</template>
