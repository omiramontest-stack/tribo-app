<script setup lang="ts">
import { reactive, ref } from 'vue'
import { usePassStore } from '@/app/stores/pass/PassStore'

const props = defineProps<{ walletId: string; modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  generated: []
}>()

const passStore = usePassStore()
const loading = ref(false)
const error = ref('')

const form = reactive({ firstName: '', lastName: '', phone: '' })

function close() {
  form.firstName = ''
  form.lastName = ''
  form.phone = ''
  error.value = ''
  emit('update:modelValue', false)
}

async function handleGenerate() {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    error.value = 'Nombre y apellido son requeridos'
    return
  }
  try {
    loading.value = true
    error.value = ''
    await passStore.generatePass({
      walletId: props.walletId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
    })
    emit('generated')
    close()
  } catch {
    error.value = 'Error al generar el pase'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="close"
    >
      <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-neutral-800 dark:text-white">Generar Pase</h3>
          <button class="text-neutral-400 hover:text-neutral-600 text-lg leading-none" @click="close">×</button>
        </div>

        <div class="space-y-3">
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Nombre *</label>
              <input
                v-model="form.firstName"
                type="text"
                placeholder="Juan"
                class="w-full border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-400"
                @keyup.enter="handleGenerate"
              />
            </div>
            <div class="flex-1">
              <label class="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Apellido *</label>
              <input
                v-model="form.lastName"
                type="text"
                placeholder="Pérez"
                class="w-full border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-400"
                @keyup.enter="handleGenerate"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Teléfono</label>
            <input
              v-model="form.phone"
              type="tel"
              placeholder="+52 33 1234 5678"
              class="w-full border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-400"
              @keyup.enter="handleGenerate"
            />
          </div>
        </div>

        <p v-if="error" class="text-red-400 text-xs">{{ error }}</p>

        <div class="flex gap-3 pt-1">
          <button
            class="flex-1 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 py-2 rounded-lg text-sm"
            @click="close"
          >
            Cancelar
          </button>
          <button
            :disabled="loading"
            class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
            @click="handleGenerate"
          >
            {{ loading ? 'Generando...' : 'Generar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
