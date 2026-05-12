<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'
import { ApiError } from '@/infrastructure/http/ApiClient'

const router = useRouter()
const authStore = useAuthStore()

type Tab = 'login' | 'register'
const tab = ref<Tab>('login')
const loading = ref(false)
const error = ref('')

const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ email: '', password: '' })

function switchTab(t: Tab) {
  tab.value = t
  error.value = ''
}

async function handleLogin() {
  try {
    loading.value = true
    error.value = ''
    error.value = `[debug] email="${loginForm.email}" pass="${loginForm.password}" api=${import.meta.env.VITE_API_URL}`
    await new Promise(r => setTimeout(r, 1500))
    await authStore.login(loginForm.email, loginForm.password)
    await router.push({ name: 'Dashboard' })
  } catch (e) {
    const debugPrefix = `email="${loginForm.email}" pass="${loginForm.password}" | `
    if (e instanceof ApiError) {
      const serverBody = (e.body as Record<string,unknown>)?._serverBody ?? e.body
      error.value = `${debugPrefix}[${e.status}] ${JSON.stringify(serverBody)}`
    } else {
      error.value = `${debugPrefix}[network] ${String(e)}`
    }
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  try {
    loading.value = true
    error.value = ''
    error.value = `[debug] email="${registerForm.email}" len=${registerForm.email.length} passLen=${registerForm.password.length} api=${import.meta.env.VITE_API_URL}`
    await new Promise(r => setTimeout(r, 1500))
    await authStore.register({ email: registerForm.email, password: registerForm.password })
    await router.push({ name: 'Onboarding' })
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      error.value = `[${e.status}] server=${JSON.stringify((e.body as Record<string,unknown>)?._serverBody ?? e.body)}`
    } else {
      error.value = `[network] ${String(e)}`
    }
  } finally {
    loading.value = false
  }
}

function handleGoogle() {
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
}

const features = [
  { label: 'Sellos & Membresía',        icon: 'M3 11a4 4 0 014-4h2a4 4 0 014 4M7 11V7m10 4V7M3 11h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { label: 'Wallets sin código',         icon: 'M12 1v6m0 6v4M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h4M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24' },
  { label: 'Análisis en tiempo real',    icon: 'M3 3v18h18M9 17V9m4 8v-5m4 5V5' },
  { label: 'QR instantáneo',             icon: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15v2M17 19h4M19 19v2' },
]
</script>

<template>
  <div class="login-root">

    <!-- ── Hero ────────────────────────────────────────────── -->
    <div class="login-hero">
      <!-- dot pattern -->
      <div class="hero-dots" />

      <div style="position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%;">

        <!-- Logo -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 52px;">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <line x1="10" y1="28" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
            <line x1="10" y1="28" x2="20" y2="10" stroke="#E8920A" stroke-width="2"/>
            <line x1="20" y1="10" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
            <circle cx="20" cy="10" r="3.5" fill="#E8920A"/>
            <circle cx="10" cy="28" r="3.5" fill="#E8920A"/>
            <circle cx="30" cy="28" r="3.5" fill="#E8920A"/>
          </svg>
          <span style="font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: #fff;">
            trib<span style="color: #E8920A;">o</span>
          </span>
        </div>

        <!-- Copy -->
        <div style="flex: 1;">
          <h1 style="font-size: 34px; font-weight: 800; line-height: 1.2; margin-bottom: 14px; letter-spacing: -0.01em; color: #fff;">
            Conecta con<br>tu negocio
          </h1>
          <p style="font-size: 14px; line-height: 1.65; color: rgba(255,255,255,0.85); max-width: 340px; margin-bottom: 36px;">
            Gestiona wallets, campañas y notificaciones push. Convierte escaneos en ventas reales.
          </p>

          <!-- Features -->
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div
              v-for="f in features"
              :key="f.label"
              style="display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 600; color: rgba(255,255,255,0.9);"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path :d="f.icon"/>
              </svg>
              {{ f.label }}
            </div>
          </div>
        </div>

        <!-- Testimonial -->
        <div style="font-size: 12px; color: rgba(255,255,255,0.8);">
          <div style="font-weight: 700; margin-bottom: 7px;">☕ Café Luna</div>
          <blockquote style="font-style: italic; border-left: 3px solid #E8920A; padding-left: 12px; line-height: 1.55; margin: 0;">
            "Pasamos de 100 a 312 clientes activos en 2 meses. El equipo Tribo es increíble."
          </blockquote>
        </div>
      </div>
    </div>

    <!-- ── Form side ──────────────────────────────────────── -->
    <div class="login-form-side">

      <!-- Mobile-only logo -->
      <div class="mobile-logo">
        <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
          <line x1="10" y1="28" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <line x1="10" y1="28" x2="20" y2="10" stroke="#E8920A" stroke-width="2"/>
          <line x1="20" y1="10" x2="30" y2="28" stroke="#E8920A" stroke-width="2"/>
          <circle cx="20" cy="10" r="3.5" fill="#E8920A"/>
          <circle cx="10" cy="28" r="3.5" fill="#E8920A"/>
          <circle cx="30" cy="28" r="3.5" fill="#E8920A"/>
        </svg>
        <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: #0F1B14;">
          trib<span style="color: #E8920A;">o</span>
        </span>
      </div>

      <div class="login-form-card">

        <!-- Tabs -->
        <div style="display: flex; gap: 2px; padding: 4px; background: #fff; border-radius: 10px; margin-bottom: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <button
            v-for="t in [{ id: 'login', label: 'Iniciar sesión' }, { id: 'register', label: 'Crear cuenta' }]"
            :key="t.id"
            class="tab-btn"
            :style="tab === t.id
              ? 'background: #1B4332; color: #fff;'
              : 'background: transparent; color: #6B7A72;'"
            @click="switchTab(t.id as Tab)"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- Login form -->
        <form v-if="tab === 'login'" class="auth-form" @submit.prevent="handleLogin">
          <div>
            <label class="field-label">Email</label>
            <input
              v-model="loginForm.email"
              type="email"
              required
              placeholder="admin@negocio.com"
              autocomplete="email"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              class="field-input"
              @focus="(e) => { (e.target as HTMLInputElement).style.borderColor = '#E8920A'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px #FCEBC4'; }"
              @blur="(e) => { (e.target as HTMLInputElement).style.borderColor = '#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }"
            />
          </div>
          <div>
            <label class="field-label">Contraseña</label>
            <input
              v-model="loginForm.password"
              type="password"
              required
              placeholder="••••••••"
              autocomplete="current-password"
              class="field-input"
              @focus="(e) => { (e.target as HTMLInputElement).style.borderColor = '#E8920A'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px #FCEBC4'; }"
              @blur="(e) => { (e.target as HTMLInputElement).style.borderColor = '#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }"
            />
          </div>

          <div v-if="error" style="font-size: 12px; color: #DC2626; padding: 8px 12px; background: #FEE2E2; border-radius: 8px;">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading" class="btn-primary" :class="{ 'btn-loading': loading }">
            {{ loading ? 'Entrando...' : 'Iniciar sesión' }}
          </button>
        </form>

        <!-- Register form -->
        <form v-else class="auth-form" @submit.prevent="handleRegister">
          <div>
            <label class="field-label">Email</label>
            <input
              v-model="registerForm.email"
              type="email"
              required
              placeholder="admin@negocio.com"
              autocomplete="email"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              class="field-input"
              @focus="(e) => { (e.target as HTMLInputElement).style.borderColor = '#E8920A'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px #FCEBC4'; }"
              @blur="(e) => { (e.target as HTMLInputElement).style.borderColor = '#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }"
            />
          </div>
          <div>
            <label class="field-label">Contraseña</label>
            <input
              v-model="registerForm.password"
              type="password"
              required
              minlength="8"
              placeholder="Mínimo 8 caracteres"
              autocomplete="new-password"
              class="field-input"
              @focus="(e) => { (e.target as HTMLInputElement).style.borderColor = '#E8920A'; (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px #FCEBC4'; }"
              @blur="(e) => { (e.target as HTMLInputElement).style.borderColor = '#ECEFEB'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }"
            />
          </div>

          <div v-if="error" style="font-size: 12px; color: #DC2626; padding: 8px 12px; background: #FEE2E2; border-radius: 8px;">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading" class="btn-primary" :class="{ 'btn-loading': loading }">
            {{ loading ? 'Creando cuenta...' : 'Crear cuenta' }}
          </button>
        </form>

        <!-- Divider -->
        <div style="display: flex; align-items: center; gap: 12px; margin: 24px 0; opacity: 0.5;">
          <div style="flex: 1; height: 1px; background: #ECEFEB;" />
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #6B7A72;">o continúa con</span>
          <div style="flex: 1; height: 1px; background: #ECEFEB;" />
        </div>

        <!-- Google -->
        <button type="button" class="btn-google" @click="handleGoogle">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <!-- Terms -->
        <p style="margin-top: 24px; font-size: 11px; color: #A8B3AC; text-align: center; line-height: 1.5;">
          Al continuar aceptas nuestros
          <a href="#" style="color: #1B4332; font-weight: 600; text-decoration: none;">Términos</a>
          y
          <a href="#" style="color: #1B4332; font-weight: 600; text-decoration: none;">Privacidad</a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-root {
  display: flex;
  min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background: #fff;
}

/* ── Hero ── */
.login-hero {
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
.login-form-side {
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

/* ── Tabs ── */
.tab-btn {
  flex: 1;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

/* ── Form ── */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 0;
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
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.field-input::placeholder {
  color: #A8B3AC;
}

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
.btn-primary:hover:not(:disabled) {
  background: #2D6A4F;
}
.btn-primary:disabled,
.btn-loading {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-google {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #fff;
  border: 1.5px solid #ECEFEB;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: #0F1B14;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn-google:hover {
  background: #F7F4EF;
  border-color: #E8920A;
}

/* ── Form card ── */
.login-form-card {
  width: 100%;
  max-width: 420px;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .login-hero {
    display: none;
  }
  .login-form-side {
    justify-content: flex-start;
    padding: 0;
    background: #F7F4EF;
  }
  .mobile-logo {
    display: flex;
  }
  .login-form-card {
    width: 100%;
    max-width: 100%;
    padding: 28px 20px 40px;
    background: #F7F4EF;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
}
</style>
