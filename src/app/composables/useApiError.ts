import { ApiError } from '@/infrastructure/http/ApiClient'

/**
 * Traduce un error de la API a un mensaje legible para el usuario.
 *
 * @example
 * catch (e) { errorMsg.value = parseApiError(e) }
 */
export function parseApiError(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as { error?: string; message?: string } | null

    switch (e.status) {
      case 403: return 'No tienes permiso para realizar esta acción.'
      case 404: return 'El recurso solicitado no fue encontrado.'
      case 400: return body?.message ?? body?.error ?? 'Datos inválidos. Revisa los campos.'
      default:  return `Error inesperado (${e.status}). Intenta de nuevo.`
    }
  }
  return 'Error de conexión. Verifica tu red e intenta de nuevo.'
}
