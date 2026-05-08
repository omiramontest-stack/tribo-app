interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> }
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const response = await context.env.ASSETS.fetch(context.request)
  if (response.status === 404) {
    const indexUrl = new URL('/index.html', context.request.url)
    return context.env.ASSETS.fetch(new Request(indexUrl.toString()))
  }
  return response
}
