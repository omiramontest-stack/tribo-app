export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`)
    this.name = 'ApiError'
  }
}

export type PlanGateCode = 'SUBSCRIPTION_REQUIRED' | 'PLAN_UPGRADE_REQUIRED' | 'WALLET_LIMIT_REACHED' | 'PASS_LIMIT_REACHED'

const PLAN_GATE_CODES = new Set<string>(['SUBSCRIPTION_REQUIRED', 'PLAN_UPGRADE_REQUIRED', 'WALLET_LIMIT_REACHED', 'PASS_LIMIT_REACHED'])

class ApiClient {
  private readonly baseUrl: string
  onNoOrgContext?: () => void
  onPlanError?: (code: PlanGateCode, message: string) => void

  constructor() {
    this.baseUrl = ''
  }

  private async request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
    const hasBody = init?.body !== undefined
    const isFormData = init?.body instanceof FormData
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: { ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}), 'ngrok-skip-browser-warning': 'true', ...init?.headers },
    })

    if (res.status === 401 && !isRetry) {
      const refreshed = await this._tryRefresh()
      if (refreshed) return this.request<T>(path, init, true)
      throw new ApiError(401, { error: 'UNAUTHORIZED' })
    }

    if (res.status === 204) return undefined as T

    const data = await res.json().catch(() => null)

    if (res.status === 403) {
      const errorCode = (data as { error?: string })?.error ?? ''
      if (errorCode.includes('switch-org')) {
        this.onNoOrgContext?.()
        throw new ApiError(403, data)
      }
      if (PLAN_GATE_CODES.has(errorCode)) {
        this.onPlanError?.(errorCode as PlanGateCode, (data as { message?: string })?.message ?? '')
        throw new ApiError(403, data)
      }
    }

    if (!res.ok) throw new ApiError(res.status, data)

    return data as T
  }

  private async _tryRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      return res.ok
    } catch {
      return false
    }
  }

  get<T>(path: string) {
    return this.request<T>(path)
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  delete(path: string) {
    return this.request<void>(path, { method: 'DELETE' })
  }

  postFile<T>(path: string, formData: FormData) {
    return this.request<T>(path, { method: 'POST', body: formData })
  }
}

export const apiClient = new ApiClient()
