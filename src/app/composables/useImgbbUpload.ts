import { ref } from 'vue'

/**
 * Composable reutilizable para subir imágenes a ImgBB.
 *
 * @example
 * const { uploading, error, upload } = useImgbbUpload()
 * const url = await upload(file)   // null si falla
 */
export function useImgbbUpload() {
  const uploading = ref(false)
  const error     = ref('')

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function upload(file: File): Promise<string | null> {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY as string

    if (!file.type.startsWith('image/')) {
      error.value = 'Solo se permiten imágenes'
      return null
    }
    if (file.size > 4 * 1024 * 1024) {
      error.value = 'La imagen debe pesar menos de 4 MB'
      return null
    }

    error.value = ''
    uploading.value = true

    try {
      const base64 = await fileToBase64(file)
      const body   = new FormData()
      body.append('key',   apiKey)
      body.append('image', base64)

      const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body })
      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      return data.data.url as string
    } catch {
      error.value = 'No se pudo subir la imagen'
      return null
    } finally {
      uploading.value = false
    }
  }

  function clearError() {
    error.value = ''
  }

  return { uploading, error, upload, clearError }
}
