export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`)
    this.name = 'ApiError'
  }
}

class ApiClient {
  private readonly baseUrl: string

  constructor() {
    this.baseUrl = ''
  }

  private async request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })

    if (res.status === 401 && !isRetry) {
      const refreshed = await this._tryRefresh()
      if (refreshed) return this.request<T>(path, init, true)
      throw new ApiError(401, { error: 'UNAUTHORIZED' })
    }

    if (res.status === 204) return undefined as T

    const data = await res.json().catch(() => null)

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
}

export const apiClient = new ApiClient()
