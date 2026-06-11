<template>
  <div class="geo-page">
    <!-- ── Header ── -->
    <div class="page-header">
      <button class="btn-back-nav" @click="router.push({ name: 'WalletDetail', params: { id: walletId } })">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Volver
      </button>
      <div class="page-header-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        Notificaciones por ubicación
        <span v-if="walletStore.currentWallet" class="header-wallet-name">{{ walletStore.currentWallet.businessName }}</span>
      </div>
    </div>

    <!-- ── Plan upgrade gate ── -->
    <div v-if="planBlocked" class="plan-gate">
      <div class="plan-gate-inner">
        <div class="plan-gate-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <h3 class="plan-gate-title">Geofences no disponibles en tu plan</h3>
        <p class="plan-gate-body">
          Las notificaciones por ubicación requieren un plan superior. Cuando un cliente con el pase en Apple Wallet se acerque a tu negocio, recibirá un aviso automático en su pantalla de bloqueo.
        </p>
        <button class="btn-upgrade" @click="router.push({ name: 'Billing' })">
          Ver planes disponibles →
        </button>
      </div>
    </div>

    <!-- ── Main layout ── -->
    <div v-else class="geo-layout">

      <!-- LEFT — list -->
      <div class="geo-list-col">
        <!-- List header -->
        <div class="list-header">
          <div class="list-counters">
            <span class="counter-main">{{ geofenceStore.geofences.length }} / {{ planLimit ?? '∞' }} ubicaciones</span>
            <span v-if="activeCount >= APPLE_MAX" class="counter-warn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Límite Apple: 10 activas
            </span>
          </div>
          <button
            v-if="canEdit"
            class="btn-add"
            :class="{ 'btn-add--disabled': atPlanLimit }"
            :disabled="atPlanLimit"
            @click="openCreate"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar ubicación
          </button>
        </div>

        <!-- Loading skeleton -->
        <div v-if="geofenceStore.loading" class="skeleton-list">
          <div v-for="n in 3" :key="n" class="skeleton-card">
            <div class="sk-line sk-line--wide"></div>
            <div class="sk-line sk-line--narrow"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!geofenceStore.geofences.length" class="empty-state">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p class="empty-title">Sin ubicaciones configuradas</p>
          <p class="empty-body">Agrega una ubicación y tus clientes recibirán una notificación automática en su iPhone cuando se acerquen.</p>
          <button class="btn-add btn-add--cta" @click="openCreate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar primera ubicación
          </button>
        </div>

        <!-- Geofence cards -->
        <div v-else class="geo-cards">
          <div
            v-for="geo in geofenceStore.geofences"
            :key="geo.id"
            class="geo-card"
            :class="{ 'geo-card--selected': editingId === geo.id, 'geo-card--inactive': !geo.isActive }"
          >
            <div class="geo-card-body">
              <div class="geo-card-top">
                <span class="geo-label">{{ geo.label }}</span>
                <span class="geo-badge" :class="geo.isActive ? 'geo-badge--active' : 'geo-badge--paused'">
                  {{ geo.isActive ? 'Activa' : 'Pausada' }}
                </span>
              </div>
              <p class="geo-message">{{ geo.message }}</p>
              <div class="geo-meta">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Radio: {{ geo.radiusMeters }} m
                <span class="geo-coords">{{ geo.latitude.toFixed(4) }}, {{ geo.longitude.toFixed(4) }}</span>
              </div>
            </div>
            <div class="geo-card-actions">
              <!-- Toggle active — only owner/admin -->
              <button
                v-if="canEdit"
                class="geo-btn geo-btn--toggle"
                :class="{ 'geo-btn--toggle-on': geo.isActive, 'geo-btn--disabled': !geo.isActive && activeCount >= APPLE_MAX }"
                :title="!geo.isActive && activeCount >= APPLE_MAX ? 'Límite de 10 activas alcanzado' : (geo.isActive ? 'Pausar' : 'Activar')"
                @click.stop="!geo.isActive && activeCount >= APPLE_MAX ? showToast('Límite Apple: máximo 10 geofences activas', 'error') : toggleActive(geo)"
              >
                <svg v-if="geo.isActive" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
              <!-- Edit — only owner/admin -->
              <button v-if="canEdit" class="geo-btn" title="Editar" @click.stop="openEdit(geo)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <!-- Delete — only owner/admin -->
              <button v-if="canEdit" class="geo-btn geo-btn--danger" title="Eliminar" @click.stop="confirmDelete(geo)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT — form panel or idle hint (only for owner/admin) -->
      <div v-if="canEdit" class="geo-form-col">
        <!-- Idle hint -->
        <div v-if="!showForm" class="form-idle">
          <div class="form-idle-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p class="form-idle-text">Selecciona una ubicación para editarla o crea una nueva</p>
        </div>

        <!-- Form -->
        <div v-else class="form-panel">
          <div class="form-panel-header">
            <h3 class="form-title">{{ isEditing ? 'Editar ubicación' : 'Nueva ubicación' }}</h3>
            <button class="form-close" @click="closeForm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Map -->
          <div class="map-wrap">
            <div ref="mapEl" class="geo-map"></div>
            <div class="map-hint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
              Haz clic en el mapa para colocar el pin
            </div>
            <!-- Address search -->
            <div class="addr-search">
              <input
                v-model="addrQuery"
                class="addr-input"
                type="text"
                placeholder="Buscar dirección…"
                @keydown.enter.prevent="searchAddress"
                @keydown.esc="addrResults = []"
                @blur="dismissAddrResults"
              />
              <button class="addr-btn" :disabled="!addrQuery.trim() || addrLoading" @click="searchAddress">
                <svg v-if="!addrLoading" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span v-else class="addr-spinner"></span>
              </button>
            </div>
            <!-- Address results -->
            <ul v-if="addrResults.length" class="addr-results">
              <li
                v-for="r in addrResults"
                :key="r.place_id"
                class="addr-result-item"
                @mousedown.prevent="selectAddress(r)"
              >{{ r.display_name }}</li>
            </ul>
          </div>

          <!-- Form fields -->
          <div class="form-fields">
            <!-- Label -->
            <div class="field-group">
              <label class="field-label">Nombre interno <span class="field-required">*</span></label>
              <input
                v-model="form.label"
                class="field-input"
                :class="{ 'field-input--error': fieldErrors.label }"
                type="text"
                maxlength="100"
                placeholder="ej. Sucursal Centro"
              />
              <p v-if="fieldErrors.label" class="field-error">{{ fieldErrors.label }}</p>
            </div>

            <!-- Coordinates (read-only display) -->
            <div v-if="form.latitude && form.longitude" class="coords-row">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ form.latitude.toFixed(6) }}, {{ form.longitude.toFixed(6) }}
            </div>
            <p v-if="fieldErrors.latitude || fieldErrors.longitude" class="field-error">{{ fieldErrors.latitude || fieldErrors.longitude }}</p>

            <!-- Radius slider -->
            <div class="field-group">
              <label class="field-label">
                Radio de detección
                <span class="radius-value">{{ form.radiusMeters }} m</span>
                <span class="radius-desc">{{ radiusDescription }}</span>
              </label>
              <input
                v-model.number="form.radiusMeters"
                class="radius-slider"
                type="range"
                min="100"
                max="5000"
                step="50"
                @input="updateMapCircle"
              />
              <div class="radius-labels">
                <span>100 m</span>
                <span>5 000 m</span>
              </div>
              <p v-if="fieldErrors.radiusMeters" class="field-error">{{ fieldErrors.radiusMeters }}</p>
            </div>

            <!-- Message -->
            <div class="field-group">
              <label class="field-label">
                Mensaje de notificación <span class="field-required">*</span>
                <span class="char-counter" :class="{ 'char-counter--warn': form.message.length > 180, 'char-counter--over': form.message.length > 200 }">
                  {{ form.message.length }} / 200
                </span>
              </label>
              <textarea
                v-model="form.message"
                class="field-textarea"
                :class="{ 'field-input--error': fieldErrors.message }"
                rows="3"
                maxlength="200"
                placeholder="ej. Hace rato no te vemos. ¡Vuelve hoy y suma para tu premio!"
              ></textarea>
              <p v-if="fieldErrors.message" class="field-error">{{ fieldErrors.message }}</p>
            </div>

            <!-- iOS preview -->
            <div class="ios-preview-wrap">
              <p class="preview-label">Vista previa en iPhone</p>
              <div class="ios-screen">
                <div class="ios-notif">
                  <div class="ios-notif-left">
                    <div class="ios-wallet-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ios-notif-content">
                    <div class="ios-notif-header">
                      <span class="ios-app-name">Apple Wallet</span>
                      <span class="ios-time">ahora</span>
                    </div>
                    <div class="ios-notif-title">{{ walletStore.currentWallet?.businessName ?? 'Tu negocio' }}</div>
                    <div class="ios-notif-body">{{ form.message || 'El mensaje aparecerá aquí…' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Submit error -->
            <p v-if="submitError" class="submit-error">{{ submitError }}</p>

            <!-- Form actions -->
            <div class="form-actions">
              <button class="btn-cancel-form" @click="closeForm">Cancelar</button>
              <button
                class="btn-save"
                :class="{ 'btn-save--loading': saving }"
                :disabled="saving"
                @click="submit"
              >
                {{ saving ? 'Guardando…' : (isEditing ? 'Guardar cambios' : 'Crear ubicación') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Delete confirm modal ── -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null">
        <div class="modal-card modal-card--sm">
          <div class="modal-header">
            <div class="modal-icon modal-icon--danger">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h3 class="modal-title">Eliminar ubicación</h3>
          </div>
          <div class="modal-body">
            <p>¿Eliminar <strong>{{ deleteTarget.label }}</strong>? Esta acción no se puede deshacer.</p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="deleteTarget = null">Cancelar</button>
            <button class="btn-confirm-danger" :disabled="deleting" @click="executeDelete">
              {{ deleting ? 'Eliminando…' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Toast ── -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast" class="geo-toast" :class="'geo-toast--' + toast.type">
          <svg v-if="toast.type === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ toast.msg }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Map as LMap, Marker, Circle } from 'leaflet'

import { useGeofenceStore }      from '@/app/stores/geofence/GeofenceStore'
import { useWalletStore }        from '@/app/stores/wallet/WalletStore'
import { useBillingStore }       from '@/app/stores/billing/BillingStore'
import { useOrganizationStore }  from '@/app/stores/organization/OrganizationStore'
import { useAuthStore }          from '@/app/stores/auth/AuthStore'
import { ApiError }              from '@/infrastructure/http/ApiClient'
import type { Geofence }         from '@/domain/geofence/entities/Geofence'

const APPLE_MAX = 10

const route   = useRoute()
const router  = useRouter()
const walletId = route.params.id as string

const geofenceStore = useGeofenceStore()
const walletStore   = useWalletStore()
const billingStore  = useBillingStore()
const orgStore      = useOrganizationStore()
const authStore     = useAuthStore()

// ── Permission ─────────────────────────────────────────────────
const canEdit = computed(() => {
  const myMember = orgStore.members.find(m => m.adminId === authStore.admin?.id)
  return myMember?.role === 'owner' || myMember?.role === 'admin'
})

// ── Plan / limits ──────────────────────────────────────────────
const planBlocked = ref(false)
const planLimit   = computed<number | null>(() =>
  billingStore.status?.plan?.geofencesPerWallet ?? null
)
const activeCount = computed(() =>
  geofenceStore.geofences.filter(g => g.isActive).length
)
const atPlanLimit = computed(() =>
  planLimit.value !== null && geofenceStore.geofences.length >= planLimit.value
)

// ── Form state ─────────────────────────────────────────────────
const showForm  = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  label: '',
  latitude: 0,
  longitude: 0,
  radiusMeters: 100,
  message: '',
})
const pinPlaced = ref(false)

const fieldErrors = reactive<Record<string, string>>({})
const submitError = ref('')
const saving      = ref(false)

function clearForm() {
  form.label        = ''
  form.latitude     = 0
  form.longitude    = 0
  form.radiusMeters = 100
  form.message      = ''
  pinPlaced.value   = false
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
  submitError.value = ''
}

function openCreate() {
  clearForm()
  isEditing.value = false
  editingId.value = null
  showForm.value  = true
  initMapWhenReady()
}

function openEdit(geo: Geofence) {
  clearForm()
  form.label        = geo.label
  form.latitude     = geo.latitude
  form.longitude    = geo.longitude
  form.radiusMeters = geo.radiusMeters
  form.message      = geo.message
  pinPlaced.value   = true
  isEditing.value   = true
  editingId.value   = geo.id
  showForm.value    = true
  initMapWhenReady(geo.latitude, geo.longitude)
}

function closeForm() {
  showForm.value  = false
  editingId.value = null
  destroyMap()
}

// ── Radius description ─────────────────────────────────────────
const radiusDescription = computed(() => {
  const m = form.radiusMeters
  if (m <= 150)  return '~1 cuadra'
  if (m <= 300)  return '~2 cuadras'
  if (m <= 500)  return '~media colonia'
  if (m <= 1000) return '~1 km'
  if (m <= 2000) return '~2 km'
  return `~${(m / 1000).toFixed(1)} km`
})

// ── Map ────────────────────────────────────────────────────────
const mapEl      = ref<HTMLDivElement | null>(null)
let mapInstance: LMap   | null = null
let markerInst:  Marker | null = null
let circleInst:  Circle | null = null

async function initMapWhenReady(lat?: number, lng?: number) {
  await nextTick()
  if (!mapEl.value) return

  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')

  if (mapInstance) { mapInstance.remove(); mapInstance = null }

  const centerLat = lat ?? 20.6597
  const centerLng = lng ?? -103.3496

  mapInstance = L.map(mapEl.value, { zoomControl: true }).setView([centerLat, centerLng], 15)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(mapInstance)

  if (lat !== undefined && lng !== undefined) placeMapPin(L, lat, lng)

  mapInstance.on('click', (e: { latlng: { lat: number; lng: number } }) => {
    form.latitude  = +e.latlng.lat.toFixed(6)
    form.longitude = +e.latlng.lng.toFixed(6)
    pinPlaced.value = true
    placeMapPin(L, form.latitude, form.longitude)
  })
}

function placeMapPin(L: typeof import('leaflet').default, lat: number, lng: number) {
  if (!mapInstance) return

  const icon = L.divIcon({
    className: '',
    html: '<div class="geo-pin"></div>',
    iconSize:   [20, 20],
    iconAnchor: [10, 10],
  })

  if (markerInst) markerInst.remove()
  if (circleInst) circleInst.remove()

  markerInst = L.marker([lat, lng], { icon }).addTo(mapInstance)
  circleInst = L.circle([lat, lng], {
    radius: form.radiusMeters,
    color: '#1B3A2D',
    fillColor: '#1B3A2D',
    fillOpacity: 0.12,
    weight: 2,
  }).addTo(mapInstance)
}

function updateMapCircle() {
  if (!circleInst) return
  circleInst.setRadius(form.radiusMeters)
}

function destroyMap() {
  if (mapInstance) { mapInstance.remove(); mapInstance = null }
  markerInst = null
  circleInst = null
}

onBeforeUnmount(() => {
  destroyMap()
  clearTimeout(toastTimer)
})

// ── Address search (Nominatim) ─────────────────────────────────
interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

const addrQuery   = ref('')
const addrResults = ref<NominatimResult[]>([])
const addrLoading = ref(false)

function dismissAddrResults() {
  setTimeout(() => { addrResults.value = [] }, 150)
}

async function searchAddress() {
  const q = addrQuery.value.trim()
  if (!q) return
  addrLoading.value = true
  addrResults.value = []
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'es' } }
    )
    addrResults.value = await res.json()
  } finally {
    addrLoading.value = false
  }
}

async function selectAddress(r: NominatimResult) {
  form.latitude     = +parseFloat(r.lat).toFixed(6)
  form.longitude    = +parseFloat(r.lon).toFixed(6)
  pinPlaced.value   = true
  addrResults.value = []
  addrQuery.value   = ''

  const L = (await import('leaflet')).default
  if (mapInstance) {
    mapInstance.setView([form.latitude, form.longitude], 16)
    placeMapPin(L, form.latitude, form.longitude)
  }
}

// ── Toggle active ──────────────────────────────────────────────
async function toggleActive(geo: Geofence) {
  try {
    await geofenceStore.updateGeofence(walletId, geo.id, { isActive: !geo.isActive })
    showToast(geo.isActive ? 'Ubicación pausada' : 'Ubicación activada', 'success')
  } catch (e) {
    showToast(parseError(e), 'error')
  }
}

// ── Submit ─────────────────────────────────────────────────────
async function submit() {
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
  submitError.value = ''

  if (!form.label.trim()) { fieldErrors.label = 'Requerido'; return }
  if (!pinPlaced.value) { fieldErrors.latitude = 'Coloca un pin en el mapa'; return }
  if (form.message.length > 200) { fieldErrors.message = 'Máximo 200 caracteres'; return }
  if (!form.message.trim()) { fieldErrors.message = 'Requerido'; return }

  saving.value = true
  try {
    const dto = {
      label:        form.label.trim(),
      latitude:     form.latitude,
      longitude:    form.longitude,
      radiusMeters: form.radiusMeters,
      message:      form.message.trim(),
    }
    if (isEditing.value && editingId.value) {
      await geofenceStore.updateGeofence(walletId, editingId.value, dto)
      showToast('Ubicación actualizada', 'success')
    } else {
      await geofenceStore.createGeofence(walletId, dto)
      showToast('Ubicación creada', 'success')
    }
    closeForm()
  } catch (e) {
    if (e instanceof ApiError) {
      const body = e.body as Record<string, unknown> | null
      const code = body?.code as string | undefined
      if (code === 'PLAN_UPGRADE_REQUIRED') { planBlocked.value = true; return }
      if (code === 'GEOFENCE_LIMIT_REACHED') { submitError.value = 'Has alcanzado el límite de ubicaciones de tu plan.'; return }
      if (e.status === 400 && body?.details) {
        const details = body.details as Record<string, string>
        Object.assign(fieldErrors, details)
        return
      }
    }
    submitError.value = parseError(e)
  } finally {
    saving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────
const deleteTarget = ref<Geofence | null>(null)
const deleting     = ref(false)

function confirmDelete(geo: Geofence) {
  deleteTarget.value = geo
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await geofenceStore.deleteGeofence(walletId, deleteTarget.value.id)
    if (editingId.value === deleteTarget.value.id) closeForm()
    showToast('Ubicación eliminada', 'success')
    deleteTarget.value = null
  } catch (e) {
    showToast(parseError(e), 'error')
  } finally {
    deleting.value = false
  }
}

// ── Toast ──────────────────────────────────────────────────────
const toast = ref<{ msg: string; type: 'success' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout>

function showToast(msg: string, type: 'success' | 'error') {
  clearTimeout(toastTimer)
  toast.value = { msg, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

// ── Error parser ───────────────────────────────────────────────
function parseError(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as Record<string, unknown> | null
    const msg = body?.message ?? body?.error ?? body?.detail
    if (typeof msg === 'string' && msg) return msg
    return `Error del servidor (${e.status})`
  }
  return 'Error inesperado. Intenta de nuevo.'
}

// ── Init ───────────────────────────────────────────────────────
onMounted(async () => {
  if (!walletStore.currentWallet) await walletStore.fetchWalletById(walletId)
  try {
    await geofenceStore.fetchGeofences(walletId)
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      const body = e.body as Record<string, unknown> | null
      if (body?.code === 'PLAN_UPGRADE_REQUIRED') planBlocked.value = true
    }
  }
})
</script>

<style scoped>
/* ── Page layout ─────────────────────────────────────────────── */
.geo-page   { min-height: 100vh; background: var(--bg-page); padding: 0 0 60px; }

.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 28px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  position: sticky;
  top: 0;
  z-index: 10;
}
.btn-back-nav {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 500; color: var(--text-muted);
  background: none; border: none; cursor: pointer; padding: 0;
  transition: color 0.15s;
}
.btn-back-nav:hover { color: var(--text-ink); }
.page-header-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: var(--text-ink);
}
.header-wallet-name {
  font-weight: 400; color: var(--text-muted); font-size: 13px;
}

.geo-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 0;
  min-height: calc(100vh - 61px);
}
@media (max-width: 820px) {
  .geo-layout { grid-template-columns: 1fr; }
  .geo-form-col { border-left: none; border-top: 1px solid var(--border); }
}

/* ── Plan gate ───────────────────────────────────────────────── */
.plan-gate { padding: 60px 28px; display: flex; justify-content: center; }
.plan-gate-inner {
  max-width: 440px;
  text-align: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 32px;
}
.plan-gate-icon { color: var(--primary); margin-bottom: 16px; }
.plan-gate-title { font-size: 17px; font-weight: 700; color: var(--text-ink); margin: 0 0 10px; }
.plan-gate-body { font-size: 13.5px; color: var(--text-muted); line-height: 1.6; margin: 0 0 24px; }
.btn-upgrade {
  background: var(--primary); color: #fff;
  border: none; border-radius: 10px; padding: 11px 22px;
  font-size: 13.5px; font-weight: 600; cursor: pointer;
  transition: opacity 0.15s;
}
.btn-upgrade:hover { opacity: 0.88; }

/* ── Left column — list ──────────────────────────────────────── */
.geo-list-col {
  border-right: 1px solid var(--border);
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.list-header {
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.list-counters { display: flex; flex-direction: column; gap: 3px; }
.counter-main  { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.counter-warn  {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--warning); font-weight: 600;
}

.btn-add {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: var(--primary);
  background: var(--primary-light);
  border: 1.5px solid transparent;
  border-radius: 9px; padding: 7px 13px;
  cursor: pointer; white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.btn-add:hover          { background: #d6e8dc; }
.btn-add--disabled      { opacity: 0.45; cursor: not-allowed; }
.btn-add--cta           { margin-top: 16px; }

/* Skeleton */
.skeleton-list { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.skeleton-card {
  background: var(--bg-subtle); border-radius: 10px;
  padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;
  animation: pulse 1.4s ease-in-out infinite;
}
.sk-line { background: var(--border); border-radius: 4px; height: 11px; }
.sk-line--wide   { width: 70%; }
.sk-line--narrow { width: 45%; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

/* Empty state */
.empty-state {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 24px; text-align: center;
}
.empty-icon    { color: var(--text-faint); margin-bottom: 12px; }
.empty-title   { font-size: 14px; font-weight: 600; color: var(--text-ink); margin: 0 0 6px; }
.empty-body    { font-size: 13px; color: var(--text-muted); line-height: 1.5; max-width: 240px; margin: 0 auto; }

/* Cards */
.geo-cards { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.geo-card {
  background: var(--bg-page); border: 1.5px solid var(--border);
  border-radius: 12px; overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.geo-card--selected { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
.geo-card--inactive { opacity: 0.7; }

.geo-card-body    { padding: 12px 14px 10px; }
.geo-card-top     { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.geo-label        { font-size: 13px; font-weight: 600; color: var(--text-ink); }
.geo-badge        { font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
.geo-badge--active  { background: rgba(22,163,74,0.12); color: var(--success); }
.geo-badge--paused  { background: var(--bg-subtle); color: var(--text-muted); }
.geo-message      { font-size: 12px; color: var(--text-muted); margin: 0 0 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.geo-meta         { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-faint); }
.geo-coords       { margin-left: 6px; }

.geo-card-actions {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 14px 10px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}
.geo-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 7px;
  background: none; border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.geo-btn:hover            { background: var(--bg-subtle); color: var(--text-ink); }
.geo-btn--toggle          { color: var(--text-faint); }
.geo-btn--toggle-on       { color: var(--success); border-color: rgba(22,163,74,0.3); background: rgba(22,163,74,0.08); }
.geo-btn--toggle-on:hover { background: rgba(22,163,74,0.15); }
.geo-btn--disabled        { opacity: 0.35; cursor: not-allowed; }
.geo-btn--disabled:hover  { background: none; color: var(--text-faint); }
.geo-btn--danger          { margin-left: auto; }
.geo-btn--danger:hover    { background: var(--danger-bg); color: var(--danger); border-color: transparent; }
.geo-btn:disabled         { opacity: 0.35; cursor: not-allowed; }

/* ── Right column — form ─────────────────────────────────────── */
.geo-form-col {
  background: var(--bg-page);
  overflow-y: auto;
}
.form-idle {
  height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: var(--text-faint); padding: 40px;
  text-align: center;
}
.form-idle-icon  { color: var(--border); }
.form-idle-text  { font-size: 13px; color: var(--text-muted); max-width: 200px; line-height: 1.5; }

.form-panel { padding: 22px 24px; }
.form-panel-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
}
.form-title  { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0; }
.form-close {
  width: 28px; height: 28px; border-radius: 7px;
  background: none; border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.form-close:hover { background: var(--bg-subtle); }

/* ── Map ─────────────────────────────────────────────────────── */
.map-wrap { position: relative; margin-bottom: 16px; border-radius: 12px; border: 1px solid var(--border); }
.geo-map  { width: 100%; height: 260px; border-radius: 11px; overflow: hidden; }
.map-hint {
  position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.6); color: #fff;
  font-size: 11.5px; padding: 4px 10px; border-radius: 20px;
  display: flex; align-items: center; gap: 5px;
  pointer-events: none; white-space: nowrap; z-index: 500;
}

/* Address search */
.addr-search {
  position: absolute; top: 10px; left: 10px; right: 10px;
  display: flex; gap: 6px; z-index: 500;
}
.addr-input {
  flex: 1; height: 34px; background: var(--bg-surface);
  border: 1px solid var(--border); border-radius: 8px;
  padding: 0 12px; font-size: 13px; color: var(--text-ink);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.addr-btn {
  width: 34px; height: 34px; border-radius: 8px;
  background: var(--primary); border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.addr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.addr-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.7s linear infinite; display: block;
}
@keyframes spin { to { transform: rotate(360deg); } }
.addr-results {
  position: absolute; top: 50px; left: 0; right: 0;
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden;
  list-style: none; margin: 6px 10px 0; padding: 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15); z-index: 600;
  max-height: 180px; overflow-y: auto;
}
.addr-result-item {
  padding: 9px 12px; font-size: 12.5px; color: var(--text-ink);
  cursor: pointer; border-bottom: 1px solid var(--border);
  line-height: 1.4;
}
.addr-result-item:last-child { border-bottom: none; }
.addr-result-item:hover { background: var(--primary-light); }

/* Leaflet custom pin */
:deep(.geo-pin) {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--primary);
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
}

/* ── Form fields ─────────────────────────────────────────────── */
.form-fields    { display: flex; flex-direction: column; gap: 16px; }
.field-group    { display: flex; flex-direction: column; gap: 5px; }
.field-label    { font-size: 12px; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.field-required { color: var(--danger); }
.field-input, .field-textarea {
  background: var(--bg-surface); border: 1.5px solid var(--border);
  border-radius: 9px; padding: 9px 12px; font-size: 13.5px;
  color: var(--text-ink); width: 100%; box-sizing: border-box;
  transition: border-color 0.15s;
}
.field-input:focus, .field-textarea:focus { outline: none; border-color: var(--primary); }
.field-input--error { border-color: var(--danger) !important; }
.field-textarea { resize: vertical; }
.field-error    { font-size: 11.5px; color: var(--danger); margin: 0; }

.coords-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--text-muted); font-family: monospace;
  background: var(--bg-subtle); border-radius: 7px; padding: 6px 10px;
}

/* Radius slider */
.radius-value { color: var(--primary); font-weight: 700; }
.radius-desc  { color: var(--text-faint); font-weight: 400; font-size: 11px; }
.radius-slider {
  width: 100%;
  accent-color: var(--primary);
  cursor: pointer;
}
.radius-labels {
  display: flex; justify-content: space-between;
  font-size: 10.5px; color: var(--text-faint); margin-top: 2px;
}

/* Char counter */
.char-counter      { font-size: 11px; font-weight: 400; color: var(--text-faint); margin-left: auto; }
.char-counter--warn { color: var(--warning); }
.char-counter--over { color: var(--danger); font-weight: 600; }

/* ── iOS preview ─────────────────────────────────────────────── */
.ios-preview-wrap { display: flex; flex-direction: column; gap: 8px; }
.preview-label    { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.ios-screen {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px; padding: 16px; border: 1px solid #333;
}
.ios-notif {
  background: rgba(255,255,255,0.14);
  backdrop-filter: blur(10px);
  border-radius: 14px; padding: 12px 14px;
  display: flex; gap: 10px;
  border: 1px solid rgba(255,255,255,0.08);
}
.ios-notif-left { flex-shrink: 0; }
.ios-wallet-icon {
  width: 36px; height: 36px; border-radius: 9px;
  background: linear-gradient(135deg, #1a8a4a, #2ecc71);
  display: flex; align-items: center; justify-content: center;
}
.ios-notif-content   { flex: 1; min-width: 0; }
.ios-notif-header    { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
.ios-app-name        { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.65); letter-spacing: 0.02em; }
.ios-time            { font-size: 11px; color: rgba(255,255,255,0.4); }
.ios-notif-title     { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.92); margin-bottom: 2px; }
.ios-notif-body      { font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* ── Form actions ────────────────────────────────────────────── */
.submit-error { font-size: 12px; color: var(--danger); margin: 0; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
.btn-cancel-form {
  background: none; border: 1.5px solid var(--border); border-radius: 9px;
  padding: 9px 18px; font-size: 13px; font-weight: 500; color: var(--text-muted);
  cursor: pointer; transition: background 0.12s;
}
.btn-cancel-form:hover { background: var(--bg-subtle); }
.btn-save {
  background: var(--primary); color: #fff;
  border: none; border-radius: 9px; padding: 9px 20px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: opacity 0.15s;
}
.btn-save:hover           { opacity: 0.9; }
.btn-save:disabled        { opacity: 0.55; cursor: not-allowed; }

/* ── Delete modal ────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-card {
  background: var(--bg-surface); border-radius: 16px;
  width: 90%; max-width: 440px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.modal-card--sm { max-width: 380px; }
.modal-header {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 22px 0;
}
.modal-icon--danger {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--danger-bg); color: var(--danger);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.modal-title    { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0; }
.modal-body     { padding: 12px 22px 0; font-size: 13.5px; color: var(--text-muted); line-height: 1.6; }
.modal-footer   { display: flex; gap: 10px; justify-content: flex-end; padding: 20px 22px; }
.btn-cancel     { background: none; border: 1.5px solid var(--border); border-radius: 9px; padding: 8px 16px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; }
.btn-cancel:hover { background: var(--bg-subtle); }
.btn-confirm-danger {
  background: var(--danger); color: #fff;
  border: none; border-radius: 9px; padding: 8px 18px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: opacity 0.15s;
}
.btn-confirm-danger:hover    { opacity: 0.88; }
.btn-confirm-danger:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Toast ───────────────────────────────────────────────────── */
.geo-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 500;
  padding: 10px 18px; border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  z-index: 2000; pointer-events: none; white-space: nowrap;
}
.geo-toast--success { background: var(--success); color: #fff; }
.geo-toast--error   { background: var(--danger);  color: #fff; }

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>
