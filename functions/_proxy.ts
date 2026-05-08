const API_BASE = 'https://tribo-api-production.up.railway.app'

const NO_BODY = new Set(['GET', 'HEAD'])

export async function proxyToApi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const target = `${API_BASE}${url.pathname}${url.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')

  const body = NO_BODY.has(request.method) ? undefined : await request.arrayBuffer()

  return fetch(target, { method: request.method, headers, body })
}
