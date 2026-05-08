const API_BASE = 'https://tribo-api-production.up.railway.app'

export async function proxyToApi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const target = `${API_BASE}${url.pathname}${url.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')

  return fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  })
}
