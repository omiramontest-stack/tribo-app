<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route  = useRoute()
const router = useRouter()

const path = computed(() => {
  const p = route.fullPath
  if (!p || p === '/') return '/ruta-desconocida'
  return p.length > 38 ? p.slice(0, 35) + '…' : p
})

const now = new Date()
const ts  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`

const copied = ref(false)
function copyUrl() {
  navigator.clipboard?.writeText(window.location.href).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1400)
  })
}

const quickLinks = [
  {
    name: 'Dashboard',
    sub: 'Resumen del día',
    to: '/admin/dashboard',
    icon: `<rect x="3" y="3" width="7" height="9" rx="1.5"/>
           <rect x="14" y="3" width="7" height="5" rx="1.5"/>
           <rect x="14" y="12" width="7" height="9" rx="1.5"/>
           <rect x="3" y="16" width="7" height="5" rx="1.5"/>`,
  },
  {
    name: 'Wallets',
    sub: 'Tarjetas de fidelidad',
    to: '/admin/wallets',
    icon: `<rect x="2" y="6" width="20" height="14" rx="2"/>
           <path d="M2 10h20"/>
           <circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>`,
  },
  {
    name: 'Campañas',
    sub: 'Envíos y promos',
    to: '/admin/campaigns',
    icon: `<path d="M3 11l18-7v16L3 13z"/>
           <path d="M7 13v5l4 1v-4"/>`,
  },
  {
    name: 'Ajustes',
    sub: 'Cuenta y organización',
    to: '/admin/settings',
    icon: `<circle cx="12" cy="12" r="3"/>
           <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>`,
  },
]
</script>

<template>
  <div class="page">
    <!-- Background decoration -->
    <div class="bg-decor" aria-hidden="true" />
    <div class="bg-grid"  aria-hidden="true" />

    <!-- Nav -->
    <nav class="nav">
      <div class="nav-inner">
        <RouterLink to="/admin/dashboard" class="logo" aria-label="Tribo — Inicio">
          <svg width="32" height="32" viewBox="0 0 40 40" aria-hidden="true">
            <line x1="10" y1="28" x2="30" y2="28" stroke="#7C5E3C" stroke-width="1.6"/>
            <line x1="10" y1="28" x2="20" y2="10" stroke="#7C5E3C" stroke-width="1.6"/>
            <line x1="20" y1="10" x2="30" y2="28" stroke="#7C5E3C" stroke-width="1.6"/>
            <circle cx="20" cy="10" r="3.4" fill="#F5A623"/>
            <circle cx="10" cy="28" r="3.4" fill="#F5A623"/>
            <circle cx="30" cy="28" r="3.4" fill="#F5A623"/>
          </svg>
          <span>trib<span class="logo-o">o</span></span>
        </RouterLink>
        <div class="nav-badge">
          <span class="pulse-dot" aria-hidden="true" />
          <span>ERROR 404 · ruta perdida</span>
        </div>
      </div>
    </nav>

    <!-- Main grid -->
    <main class="main">

      <!-- ── COPY COLUMN ── -->
      <section class="copy">

        <span class="eyebrow">
          <span class="eyebrow-glyph">!</span>
          Página fuera de la red
        </span>

        <h1 class="heading">
          Este nodo se
          <span class="accent">desconectó</span>
          de la tribu.
        </h1>

        <p class="lede">
          La página que buscabas no aparece en nuestra red. Puede que el enlace
          haya caducado, que la URL tenga un error, o que ese nodo nunca existió.
          Tranquilo — te ayudamos a volver al centro.
        </p>

        <!-- Terminal -->
        <div class="console" role="status" aria-live="polite">
          <div class="console-bar">
            <span class="traffic" aria-hidden="true">
              <i /><i /><i />
            </span>
            <span>tribo · network log</span>
          </div>
          <div class="console-body">
            <div class="log-row">
              <span class="log-ts">{{ ts }}</span>
              <span class="log-info">GET&nbsp;</span>
              <span class="log-path">{{ path }}</span>
            </div>
            <div class="log-row">
              <span class="log-ts">{{ ts }}</span>
              <span class="log-warn">WARN</span>
              <span class="log-muted">node not found in mesh</span>
            </div>
            <div class="log-row">
              <span class="log-ts">{{ ts }}</span>
              <span class="log-err">ERR&nbsp;</span>
              <span class="log-muted">status 404 · </span>
              <span class="log-err-val">route_unreachable</span>
            </div>
            <div class="log-row">
              <span class="log-ts">{{ ts }}</span>
              <span class="log-info">HINT</span>
              <span class="log-muted">try: panel · wallets · campañas</span>
              <span class="caret" aria-hidden="true" />
            </div>
          </div>
        </div>

        <!-- CTAs -->
        <div class="ctas">
          <button class="action-btn action-ghost" @click="router.back()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Volver atrás
          </button>
          <button class="action-btn action-primary" @click="router.push('/admin/dashboard')">
            Ir al panel
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <!-- Quick links -->
        <div class="qlinks">
          <p class="qlinks-label">A dónde ir</p>
          <div class="qlinks-grid">
            <RouterLink
              v-for="link in quickLinks"
              :key="link.name"
              :to="link.to"
              class="qlink"
            >
              <span class="qlink-ico" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="link.icon" />
              </span>
              <span class="qlink-text">
                <span class="qlink-name">{{ link.name }}</span>
                <span class="qlink-sub">{{ link.sub }}</span>
              </span>
              <span class="qlink-arrow" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 6l6 6-6 6"/>
                </svg>
              </span>
            </RouterLink>
          </div>
        </div>
      </section>

      <!-- ── VISUAL COLUMN ── -->
      <section class="visual" aria-hidden="true">
        <svg class="visual-svg" viewBox="0 0 560 560" overflow="visible">
          <!-- Rings -->
          <circle class="ring" cx="280" cy="280" r="252"/>
          <circle class="ring" cx="280" cy="280" r="200"/>
          <circle class="ring" cx="280" cy="280" r="150"/>

          <!-- Background mesh -->
          <g class="edge-bg">
            <line x1="80"  y1="120" x2="190" y2="200"/>
            <line x1="80"  y1="120" x2="120" y2="380"/>
            <line x1="120" y1="380" x2="280" y2="490"/>
            <line x1="280" y1="490" x2="470" y2="430"/>
            <line x1="470" y1="430" x2="500" y2="200"/>
            <line x1="500" y1="200" x2="370" y2="150"/>
            <line x1="370" y1="150" x2="190" y2="200"/>
            <line x1="190" y1="200" x2="280" y2="280"/>
            <line x1="370" y1="150" x2="280" y2="280"/>
            <line x1="120" y1="380" x2="280" y2="280"/>
            <line x1="470" y1="430" x2="280" y2="280"/>
          </g>

          <!-- Dim nodes -->
          <g fill="#2D5A4F" opacity=".32">
            <circle cx="80"  cy="120" r="5"/>
            <circle cx="190" cy="200" r="4"/>
            <circle cx="370" cy="150" r="5"/>
            <circle cx="500" cy="200" r="4"/>
            <circle cx="120" cy="380" r="5"/>
            <circle cx="280" cy="490" r="5"/>
            <circle cx="470" cy="430" r="4"/>
          </g>

          <!-- 404 -->
          <text class="num404" x="50%" y="56%" text-anchor="middle">
            4<tspan fill="#E8920A">0</tspan>4
          </text>

          <!-- Triangle: bottom edge solid -->
          <line class="edge-solid" x1="170" y1="430" x2="390" y2="430"/>
          <!-- left edge solid -->
          <line class="edge-solid" x1="170" y1="430" x2="280" y2="130"/>
          <!-- right edge broken -->
          <line class="edge-broken" x1="305" y1="200" x2="390" y2="430"/>

          <!-- Anchored nodes -->
          <circle fill="#F5A623" cx="170" cy="430" r="14"/>
          <circle fill="#F5A623" cx="390" cy="430" r="14"/>

          <!-- Floating lost node -->
          <g class="float-node">
            <circle fill="#F5A623" cx="426" cy="96" r="0" opacity="0">
              <animate attributeName="r"       values="10;38"   dur="2.2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.8;0"   dur="2.2s" repeatCount="indefinite"/>
            </circle>
            <circle fill="#F5A623" stroke="#E8920A" stroke-width="1.4" cx="426" cy="96" r="13"/>
            <text x="426" y="101" text-anchor="middle"
                  font-family="'Plus Jakarta Sans', system-ui"
                  font-weight="800" font-size="15" fill="#102619">?</text>
          </g>

          <!-- Leader line + label -->
          <path class="leader" d="M 295 135 Q 360 90 414 95"/>
          <text class="small-label" x="432" y="78">nodo perdido</text>
          <text class="small-label" x="280" y="475" text-anchor="middle">tribo · network/triangle</text>
        </svg>
      </section>
    </main>

    <!-- Footer -->
    <footer class="foot">
      <div class="foot-inner">
        <div class="foot-left">
          <span>© 2026 Tribo</span>
          <span class="foot-req">
            <span class="foot-code">404</span>
            <span>{{ path }}</span>
          </span>
        </div>
        <div class="foot-right">
          <RouterLink to="/admin/dashboard">Panel</RouterLink>
          <RouterLink to="/admin/wallets">Wallets</RouterLink>
          <RouterLink to="/admin/campaigns">Campañas</RouterLink>
          <button @click="copyUrl">{{ copied ? '¡Copiado!' : 'Copiar URL' }}</button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ── Reset & base ── */
* { box-sizing: border-box; margin: 0; padding: 0; }
a  { color: inherit; text-decoration: none; }

.page {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  background: #F5F0E8;
  color: #0F1B14;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* ── Background ── */
.bg-decor, .bg-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.bg-decor {
  background:
    radial-gradient(55% 45% at 85% 8%,  rgba(245,166,35,.16), transparent 70%),
    radial-gradient(45% 40% at 8%  90%, rgba(45,90,79,.14),   transparent 70%);
}
.bg-grid {
  background-image:
    linear-gradient(to right,  rgba(45,90,79,.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(45,90,79,.06) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 40%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 40%, transparent 100%);
}

/* ── Nav ── */
.nav        { position: relative; z-index: 10; }
.nav-inner  {
  max-width: 1280px; margin: 0 auto; padding: 22px 32px;
  display: flex; align-items: center; justify-content: space-between;
}
.logo {
  display: inline-flex; align-items: center; gap: 10px;
  font-weight: 800; font-size: 22px; letter-spacing: -0.02em; color: #102619;
}
.logo-o { color: #E8920A; }

.nav-badge {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 7px 14px;
  background: #fff;
  border: 1px solid #D8DDD7;
  border-radius: 999px;
  font-size: 12px; font-weight: 600; color: #3A4A41;
  letter-spacing: 0.02em;
}
.pulse-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #DC2626;
  box-shadow: 0 0 0 3px rgba(220,38,38,.18);
  animation: pulse 1.8s infinite;
  display: block;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(220,38,38,.18); }
  50%       { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
}

/* ── Main grid ── */
.main {
  position: relative; z-index: 1;
  flex: 1;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 56px;
  align-items: center;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 32px 80px;
}

/* ── Copy ── */
.copy    { max-width: 560px; }

.eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 14px 8px 10px;
  background: #fff;
  border: 1px solid #D8DDD7;
  border-radius: 999px;
  font-size: 12px; font-weight: 700; color: #3A4A41;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.eyebrow-glyph {
  width: 18px; height: 18px; border-radius: 50%;
  background: #F5A623;
  display: inline-grid; place-items: center;
  color: #102619; font-size: 10px; font-weight: 800;
}

.heading {
  margin-top: 22px;
  font-size: clamp(40px, 5.5vw, 80px);
  line-height: 0.98;
  letter-spacing: -0.04em;
  font-weight: 800;
  color: #102619;
  text-wrap: balance;
}
.accent {
  color: #E8920A;
  position: relative;
  white-space: nowrap;
}
.accent::after {
  content: '';
  position: absolute; left: 0; right: 0; bottom: 2px; height: 10px;
  background: #F5A623; opacity: .22;
  border-radius: 4px; z-index: -1;
}

.lede {
  margin-top: 20px;
  font-size: 17px; line-height: 1.55; color: #6B7A72;
  text-wrap: pretty; max-width: 480px;
}

/* ── Console ── */
.console {
  margin-top: 28px;
  background: #102619;
  color: #D5E2D8;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 12px 30px -16px rgba(16,38,25,.45), 0 1px 0 rgba(255,255,255,.04) inset;
  max-width: 480px;
}
.console-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: rgba(255,255,255,.04);
  border-bottom: 1px solid rgba(255,255,255,.06);
  font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
  color: rgba(255,255,255,.55);
}
.traffic       { display: inline-flex; gap: 6px; margin-right: 4px; }
.traffic i     { width: 9px; height: 9px; border-radius: 50%; display: block; }
.traffic i:nth-child(1) { background: #FF5F57; }
.traffic i:nth-child(2) { background: #FEBC2E; }
.traffic i:nth-child(3) { background: #28C840; }

.console-body  { padding: 14px 18px 18px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 13px; line-height: 1.7; }
.log-row       { display: flex; gap: 10px; }
.log-ts        { color: rgba(255,255,255,.35); flex-shrink: 0; }
.log-info      { color: #3D8B65; font-weight: 600; }
.log-warn      { color: #F5A623; font-weight: 600; }
.log-err       { color: #FF8A8A; font-weight: 600; }
.log-path      { color: #FCEBC4; }
.log-muted     { color: rgba(255,255,255,.5); }
.log-err-val   { color: #FF8A8A; }
.caret {
  display: inline-block; width: 7px; height: 14px;
  background: #F5A623; vertical-align: -2px; margin-left: 2px;
  animation: blink 1s steps(1) infinite;
}
@keyframes blink { 50% { opacity: 0; } }

/* ── CTAs ── */
.ctas { margin-top: 28px; display: flex; gap: 12px; flex-wrap: wrap; }
.action-btn {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: inherit; font-weight: 700; font-size: 15px;
  padding: 13px 22px; border-radius: 10px; border: none; cursor: pointer;
  transition: transform .12s ease, box-shadow .15s, background .15s, color .15s;
}
.action-btn svg { transition: transform .15s; }

.action-primary {
  background: #F5A623; color: #102619;
  box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 6px 16px -4px rgba(232,146,10,.4);
}
.action-primary:hover { background: #E8920A; transform: translateY(-1px); box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 10px 24px -6px rgba(232,146,10,.55); }
.action-primary:hover svg { transform: translateX(2px); }

.action-ghost {
  background: #fff; color: #102619;
  border: 1px solid #D8DDD7;
}
.action-ghost:hover { border-color: #3D8B65; color: #1B3A2D; }
.action-ghost:hover svg { transform: translateX(-2px); }

/* ── Quick links ── */
.qlinks       { margin-top: 36px; padding-top: 24px; border-top: 1px dashed #D8DDD7; max-width: 480px; }
.qlinks-label { font-size: 11px; font-weight: 700; color: #6B7A72; letter-spacing: 0.12em; text-transform: uppercase; }
.qlinks-grid  { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.qlink {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  color: #102619;
  border: 1px solid transparent;
  transition: background .15s, border-color .15s;
}
.qlink:hover { background: #fff; border-color: #D8DDD7; }
.qlink-ico {
  width: 30px; height: 30px; border-radius: 8px;
  display: grid; place-items: center;
  background: #E6EFE9; color: #1B3A2D;
  flex-shrink: 0;
}
.qlink-text   { display: flex; flex-direction: column; }
.qlink-name   { font-size: 13px; font-weight: 700; line-height: 1.1; }
.qlink-sub    { font-size: 11px; color: #6B7A72; font-weight: 500; margin-top: 2px; }
.qlink-arrow  { margin-left: auto; color: #A8B3AC; transition: transform .15s, color .15s; }
.qlink:hover .qlink-arrow { color: #E8920A; transform: translateX(3px); }

/* ── Visual ── */
.visual     { position: relative; aspect-ratio: 1/1; max-width: 560px; width: 100%; margin-left: auto; }
.visual-svg { width: 100%; height: 100%; overflow: visible; }

.ring        { fill: none; stroke: #2D5A4F; stroke-opacity: .18; stroke-dasharray: 3 6; }
.edge-bg     { stroke: #3D8B65; stroke-opacity: .22; stroke-width: 1.2; fill: none; }
.edge-solid  { stroke: #1B3A2D; stroke-width: 2.2; fill: none; stroke-linecap: round; }
.edge-broken { stroke: #1B3A2D; stroke-width: 2.2; fill: none; stroke-linecap: round; stroke-dasharray: 6 8; opacity: .55; }
.num404      { font-family: 'Plus Jakarta Sans', system-ui; font-weight: 800; font-size: 168px; letter-spacing: -0.06em; fill: #102619; }
.leader      { stroke: #A8B3AC; stroke-width: 1.2; fill: none; stroke-dasharray: 2 3; }
.small-label { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.16em; fill: #6B7A72; text-transform: uppercase; }

.float-node {
  transform-origin: 426px 96px;
  animation: drift 6s ease-in-out infinite;
}
@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  50%       { transform: translate(8px, -12px); }
}

/* ── Footer ── */
.foot       { position: relative; z-index: 1; border-top: 1px solid #D8DDD7; background: rgba(245,240,232,.55); }
.foot-inner {
  max-width: 1280px; margin: 0 auto; padding: 18px 32px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 20px; flex-wrap: wrap;
  font-size: 12px; color: #6B7A72;
}
.foot-left  { display: flex; align-items: center; gap: 14px; }
.foot-req   {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 7px;
  background: #fff; border: 1px solid #D8DDD7;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px; color: #3A4A41;
}
.foot-code  { color: #DC2626; font-weight: 700; }
.foot-right { display: flex; gap: 22px; align-items: center; }
.foot-right a, .foot-right button {
  color: inherit; background: none; border: none; cursor: pointer;
  font-size: 12px; font-family: inherit; transition: color .15s;
}
.foot-right a:hover, .foot-right button:hover { color: #1B3A2D; }

/* ── Responsive ── */
@media (max-width: 980px) {
  .main { grid-template-columns: 1fr; gap: 24px; padding: 12px 24px 48px; }
  .visual { max-width: 400px; margin: 0 auto; order: -1; }
}
@media (max-width: 520px) {
  .nav-inner  { padding: 18px 20px; }
  .main       { padding: 8px 20px 40px; }
  .qlinks-grid { grid-template-columns: 1fr; }
  .console-body { font-size: 12px; }
  .foot-inner { padding: 14px 20px; flex-direction: column; align-items: flex-start; gap: 10px; }
  .foot-right { gap: 16px; }
}
</style>
