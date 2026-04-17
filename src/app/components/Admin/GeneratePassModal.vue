<script setup lang="ts">
import { ref } from 'vue'
import { usePassStore } from '@/app/stores/pass/PassStore'

const props = defineProps<{ walletId: string; modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  generated: []
}>()

const passStore = usePassStore()
const customerName = ref('')
const loading = ref(false)
const error = ref('')

function close() {
  customerName.value = ''
  error.value = ''
  emit('update:modelValue', false)
}

async function handleGenerate() {
  if (!customerName.value.trim()) {
    error.value = 'El nombre es requerido'
    return
  }
  try {
    loading.value = true
    error.value = ''
    await passStore.generatePass({ walletId: props.walletId, customerName: customerName.value.trim() })
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

        <div>
          <label class="block text-sm text-neutral-600 dark:text-neutral-300 mb-1">
            Nombre del cliente *
          </label>
          <input
            v-model="customerName"
            type="text"
            placeholder="Ej. Juan Pérez"
            class="w-full border border-neutral-200 dark:border-neutral-600 bg-transparent dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="handleGenerate"
          />
          <p v-if="error" class="text-red-400 text-xs mt-1">{{ error }}</p>
        </div>

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
