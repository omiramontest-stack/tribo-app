<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

const router    = useRouter()
const authStore = useAuthStore()

const email   = ref('')
const loading = ref(false)
const sent    = ref(false)

async function handleSubmit() {
  if (!email.value.trim() || !email.value.includes('@')) return
  loading.value = true
  try {
    await authStore.forgotPassword(email.value.trim())
  } finally {
    // Always show success — backend never reveals if email exists
    sent.value    = true
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-root">

    <!-- ── Hero ── -->
    <div class="auth-hero">
      <div class="hero-dots" />
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;height:100%;">

        <div style="display:flex;align-items:center;gap:8px;margin-bottom:52px;">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <line x1="10" y1="28" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
            <line x1="10" y1="28" x2="20" y2="10" stroke="#E8920A" stroke-width="2"/>
            <line x1="20" y1="10" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
            <circle cx="20" cy="10" r="3.5" fill="#E8920A"/>
            <circle cx="10" cy="28" r="3.5" fill="#E8920A"/>
            <circle cx="30" cy="28" r="3.5" fill="#E8920A"/>
          </svg>
          <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#fff;">
            trib<span style="color:#E8920A;">o</span>
          </span>
        </div>

        <div style="flex:1;">
          <h1 style="font-size:32px;font-weight:800;line-height:1.2;margin-bottom:14px;letter-spacing:-0.01em;color:#fff;">
            Recupera tu<br>acceso
          </h1>
          <p style="font-size:14px;line-height:1.65;color:rgba(255,255,255,0.8);max-width:320px;">
            Te enviaremos un enlace seguro para crear una nueva contraseña. El enlace expira en 1 hora.
          </p>
        </div>

        <p style="font-size:12px;color:rgba(255,255,255,0.5);">
          ¿Recuerdas tu contraseña?
          <button
            style="background:none;border:none;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.8);font-weight:600;padding:0;font-family:inherit;text-decoration:underline;"
            @click="router.push({ name: 'Login' })"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>

    <!-- ── Form side ── -->
    <div class="auth-form-side">

      <!-- Mobile logo -->
      <div class="mobile-logo">
        <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
          <line x1="10" y1="28" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <line x1="10" y1="28" x2="20" y2="10" stroke="#E8920A" stroke-width="2"/>
          <line x1="20" y1="10" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <circle cx="20" cy="10" r="3.5" fill="#E8920A"/>
          <circle cx="10" cy="28" r="3.5" fill="#E8920A"/>
          <circle cx="30" cy="28" r="3.5" fill="#E8920A"/>
        </svg>
        <span style="font-size:17px;font-weight:800;letter-spacing:-0.02em;color:#0F1B14;">
          trib<span style="color:#E8920A;">o</span>
        </span>
      </div>

      <div class="auth-card">

        <!-- ── Sent state ── -->
        <template v-if="sent">
          <div class="success-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h2 class="card-title">Revisa tu correo</h2>
          <p class="card-sub">
            Si existe una cuenta con ese correo, recibirás un enlace en los próximos minutos.<br><br>
            <span style="color:#A8B3AC;">El enlace expirará en 1 hora. Revisa también tu carpeta de spam.</span>
          </p>
          <button class="btn-back" @click="router.push({ name: 'Login' })">
            ← Volver al inicio de sesión
          </button>
        </template>

        <!-- ── Form state ── -->
        <template v-else>
          <h2 class="card-title">¿Olvidaste tu contraseña?</h2>
          <p class="card-sub">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>

          <form class="auth-form" @submit.prevent="handleSubmit">
            <div>
              <label class="field-label">Correo electrónico</label>
              <input
                v-model="email"
                type="email"
                required
                placeholder="admin@negocio.com"
                autocomplete="email"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                class="field-input"
              />
            </div>

            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Enviando…' : 'Enviar enlace' }}
            </button>
          </form>

          <button class="btn-back" @click="router.push({ name: 'Login' })">
            ← Volver al inicio de sesión
          </button>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-root {
  display: flex;
  min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background: #fff;
}

/* ── Hero ── */
.auth-hero {
  flex: 1;
  background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
  padding: 40px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.hero-dots {
  position: absolute;
  inset: 0;
  opacity: 0.07;
  background-image: radial-gradient(circle, #fff 1px, transparent 1px);
  background-size: 64px 64px;
  pointer-events: none;
}

/* ── Form side ── */
.auth-form-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  background: #F7F4EF;
}
.mobile-logo {
  display: none;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
}

/* ── Card ── */
.auth-card {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.success-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #D1FAE5;
  display: grid;
  place-items: center;
}

.card-title {
  font-size: 22px;
  font-weight: 800;
  color: #0F1B14;
  letter-spacing: -0.02em;
  margin: 0;
}
.card-sub {
  font-size: 13.5px;
  color: #6B7A72;
  line-height: 1.6;
  margin: 0;
}

/* ── Form ── */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A72;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 7px;
}
.field-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1.5px solid #ECEFEB;
  background: #fff;
  font-size: 13px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: #0F1B14;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.field-input:focus {
  border-color: #E8920A;
  box-shadow: 0 0 0 3px #FCEBC4;
}
.field-input::placeholder { color: #A8B3AC; }

/* ── Buttons ── */
.btn-primary {
  width: 100%;
  padding: 13px 16px;
  border-radius: 10px;
  background: #1B4332;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  border: none;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}
.btn-primary:hover:not(:disabled) { background: #2D6A4F; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-back {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #6B7A72;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  padding: 0;
  text-align: left;
  transition: color 0.15s;
}
.btn-back:hover { color: #1B4332; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .auth-hero { display: none; }
  .auth-form-side {
    justify-content: flex-start;
    padding: 0;
    background: #F7F4EF;
  }
  .mobile-logo { display: flex; }
  .auth-card {
    width: 100%;
    max-width: 100%;
    padding: 28px 20px 40px;
    background: #F7F4EF;
    min-height: 100vh;
  }
}
</style>
