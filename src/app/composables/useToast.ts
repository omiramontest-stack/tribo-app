import { ref } from 'vue'

type ToastType = 'success' | 'error'

const message = ref('')
const type = ref<ToastType>('success')
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  function show(msg: string, t: ToastType = 'success', duration = 3000) {
    if (timer) clearTimeout(timer)
    message.value = msg
    type.value = t
    visible.value = true
    timer = setTimeout(() => { visible.value = false }, duration)
  }

  return { message, type, visible, show }
}
