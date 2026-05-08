import { proxyToApi } from '../_proxy'
export const onRequest = (ctx: { request: Request }) => proxyToApi(ctx.request)
