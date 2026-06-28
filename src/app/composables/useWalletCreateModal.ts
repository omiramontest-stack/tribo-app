import { ref } from 'vue'

// Module-level singleton — any component can open/close the modal
const isOpen = ref(false)

export function useWalletCreateModal() {
  function open()  { isOpen.value = true  }
  function close() { isOpen.value = false }
  return { isOpen, open, close }
}
