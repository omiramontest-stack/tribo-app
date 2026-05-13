<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/app/stores/auth/AuthStore'

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()

const token = computed(() => (route.query.token as string) || '')

const newPassword = ref('')
const loading     = ref(false)
const success     = ref(false)
const errorCode   = ref<'INVALID_OR_EXPIRED_TOKEN' | ''>('')

const passwordStrength = computed(() => {
  const p = newPassword.value
  if (!p) return 0
  let score = 0
  if (p.length >= 8)          score++
  if (p.length >= 12)         score++
  if (/[A-Z]/.test(p))        score++
  if (/[0-9]/.test(p))        score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  const s = passwordStrength.value
  if (s <= 1) return { text: 'Débil',  color: '#DC2626' }
  if (s <= 3) return { text: 'Media',  color: '#D97706' }
  return             { text: 'Fuerte', color: '#16A34A' }
})

async function handleSubmit() {
  if (newPassword.value.length < 8) return
  loading.value   = true
  errorCode.value = ''
  try {
    await authStore.resetPassword(token.value, newPassword.value)
    success.value = true
  } catch (e: unknown) {
    const code = ((e as { body?: { error?: string } })?.body?.error) ?? ''
    errorCode.value = code === 'INVALID_OR_EXPIRED_TOKEN' ? 'INVALID_OR_EXPIRED_TOKEN' : ''
  } finally {
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
            Nueva<br>contraseña
          </h1>
          <p style="font-size:14px;line-height:1.65;color:rgba(255,255,255,0.8);max-width:320px;">
            Elige una contraseña segura de al menos 8 caracteres. No podrás reutilizar el enlace una vez usado.
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

        <!-- ── No token in URL ── -->
        <template v-if="!token">
          <div class="state-icon state-icon--error">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 class="card-title">Enlace no válido</h2>
          <p class="card-sub">Este enlace de restablecimiento no es válido. Solicita uno nuevo desde la pantalla de recuperación.</p>
          <button class="btn-primary" @click="router.push({ name: 'ForgotPassword' })">
            Solicitar nuevo enlace
          </button>
          <button class="btn-back" @click="router.push({ name: 'Login' })">
            ← Volver al inicio de sesión
          </button>
        </template>

        <!-- ── Success state ── -->
        <template v-else-if="success">
          <div class="state-icon state-icon--success">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12l5 5L20 7"/>
            </svg>
          </div>
          <h2 class="card-title">¡Contraseña actualizada!</h2>
          <p class="card-sub">Tu nueva contraseña está lista. Ya puedes iniciar sesión con ella.</p>
          <button class="btn-primary" @click="router.push({ name: 'Login' })">
            Ir al inicio de sesión
          </button>
        </template>

        <!-- ── Expired/invalid token error ── -->
        <template v-else-if="errorCode === 'INVALID_OR_EXPIRED_TOKEN'">
          <div class="state-icon state-icon--error">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 class="card-title">Enlace expirado</h2>
          <p class="card-sub">El enlace expiró o ya fue usado. Los enlaces son válidos por 1 hora y de un solo uso.</p>
          <button class="btn-primary" @click="router.push({ name: 'ForgotPassword' })">
            Solicitar nuevo enlace
          </button>
          <button class="btn-back" @click="router.push({ name: 'Login' })">
            ← Volver al inicio de sesión
          </button>
        </template>

        <!-- ── Password form ── -->
        <template v-else>
          <h2 class="card-title">Nueva contraseña</h2>
          <p class="card-sub">Elige una contraseña segura de al menos 8 caracteres.</p>

          <form class="auth-form" @submit.prevent="handleSubmit">
            <div>
              <label class="field-label">Nueva contraseña</label>
              <input
                v-model="newPassword"
                type="password"
                required
                minlength="8"
                placeholder="Mínimo 8 caracteres"
                autocomplete="new-password"
                class="field-input"
              />

              <!-- Strength bar -->
              <div v-if="newPassword" class="strength-bar">
                <div class="strength-bar__track">
                  <div
                    v-for="i in 5"
                    :key="i"
                    class="strength-bar__seg"
                    :style="{ background: i <= passwordStrength ? strengthLabel.color : '#ECEFEB' }"
                  />
                </div>
                <span class="strength-bar__label" :style="{ color: strengthLabel.color }">
                  {{ strengthLabel.text }}
                </span>
              </div>
            </div>

            <button
              type="submit"
              class="btn-primary"
              :disabled="loading || newPassword.length < 8"
            >
              {{ loading ? 'Guardando…' : 'Guardar contraseña' }}
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

.state-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
}
.state-icon--success { background: #D1FAE5; }
.state-icon--error   { background: #FEE2E2; }

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

/* ── Strength bar ── */
.strength-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.strength-bar__track { flex: 1; display: flex; gap: 3px; }
.strength-bar__seg {
  height: 4px;
  flex: 1;
  border-radius: 2px;
  transition: background 0.2s;
}
.strength-bar__label { font-size: 11.5px; font-weight: 600; white-space: nowrap; }

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
