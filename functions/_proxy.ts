const API_BASE = 'https://tribo-api-production.up.railway.app'

const STRIP_HEADERS = new Set(['host', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-proto', 'x-real-ip'])
const NO_BODY = new Set(['GET', 'HEAD'])

export async function proxyToApi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const target = `${API_BASE}${url.pathname}${url.search}`

  const headers = new Headers()
  for (const [key, value] of request.headers.entries()) {
    if (!STRIP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  }

  const init: RequestInit = { method: request.method, headers }
  if (!NO_BODY.has(request.method)) {
    init.body = request.body
    // @ts-ignore - duplex required for streaming body in Workers
    init.duplex = 'half'
  }

  return fetch(target, init)
}
