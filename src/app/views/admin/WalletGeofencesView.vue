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

    <!-- ── Main layout ── -->
    <div class="geo-layout">

      <!-- LEFT — list -->
      <div class="geo-list-col">
        <!-- List header -->
        <div class="list-header">
          <div class="list-counters">
            <span class="counter-main">{{ geofenceStore.geofences.length }} / {{ MAX_GEOFENCES }} ubicaciones</span>
            <span v-if="activeCount >= MAX_GEOFENCES" class="counter-warn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Límite Apple: 10 activas
            </span>
          </div>
          <button
            v-if="canEdit"
            class="btn-add"
            :class="{ 'btn-add--disabled': atLimit }"
            :disabled="atLimit"
            :title="atLimit ? 'Límite de 10 ubicaciones alcanzado' : ''"
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
          <button v-if="canEdit" class="btn-add btn-add--cta" @click="openCreate">
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
              <!-- Schedule summary -->
              <div class="geo-schedule">
                <div
                  v-for="(line, li) in getScheduleLines(geo)"
                  :key="li"
                  class="schedule-line"
                  :class="{ 'schedule-line--first': li === 0 }"
                >
                  <svg v-if="li === 0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {{ line }}
                </div>
              </div>
              <!-- Meta: radius + coordinates -->
              <div class="geo-meta-row">
                <span class="geo-radius">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/></svg>
                  {{ geo.radiusMeters }} m
                </span>
                <span class="geo-coords-text">{{ geo.latitude.toFixed(4) }}, {{ geo.longitude.toFixed(4) }}</span>
              </div>
            </div>
            <div class="geo-card-actions">
              <!-- Toggle active -->
              <button
                v-if="canEdit"
                class="geo-btn geo-btn--toggle"
                :class="{ 'geo-btn--toggle-on': geo.isActive, 'geo-btn--disabled': !geo.isActive && activeCount >= MAX_GEOFENCES }"
                :title="!geo.isActive && activeCount >= MAX_GEOFENCES ? 'Límite Apple: 10 activas' : (geo.isActive ? 'Pausar' : 'Activar')"
                @click.stop="!geo.isActive && activeCount >= MAX_GEOFENCES ? showToast('Límite Apple: máximo 10 geofences activas', 'error') : toggleActive(geo)"
              >
                <svg v-if="geo.isActive" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
              <!-- Edit -->
              <button v-if="canEdit" class="geo-btn" title="Editar" @click.stop="openEdit(geo)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <!-- Delete -->
              <button v-if="canEdit" class="geo-btn geo-btn--danger" title="Eliminar" @click.stop="confirmDelete(geo)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT — form panel (only for owner/admin) -->
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

        <!-- Form panel -->
        <div v-else class="form-panel">
          <div class="form-panel-header">
            <h3 class="form-title">{{ isEditing ? 'Editar ubicación' : 'Nueva ubicación' }}</h3>
            <button class="form-close" @click="closeForm" title="Cerrar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="form-fields">
            <!-- NOMBRE INTERNO -->
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

            <!-- UBICACIÓN -->
            <div class="field-group">
              <label class="field-label">
                Ubicación en el mapa <span class="field-required">*</span>
              </label>

              <!-- Address search -->
              <div class="addr-search-wrap">
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
                <ul v-if="addrResults.length" class="addr-results">
                  <li
                    v-for="r in addrResults"
                    :key="r.place_id"
                    class="addr-result-item"
                    @mousedown.prevent="selectAddress(r)"
                  >{{ r.display_name }}</li>
                </ul>
              </div>

              <!-- Map -->
              <div class="map-wrap">
                <div ref="mapEl" class="geo-map"></div>
                <button
                  class="geo-locate-btn"
                  :class="{ 'geo-locate-btn--loading': locating }"
                  type="button"
                  title="Ver mi ubicación"
                  @click="geolocate"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  </svg>
                </button>
                <div v-if="!pinPlaced" class="map-hint">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                  Haz clic en el mapa para colocar el pin
                </div>
              </div>

              <!-- Coordinates display -->
              <div v-if="pinPlaced" class="coords-row">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ form.latitude.toFixed(6) }}, {{ form.longitude.toFixed(6) }}
              </div>
              <p v-if="fieldErrors.latitude" class="field-error">{{ fieldErrors.latitude }}</p>

              <!-- Radio slider -->
              <div class="radius-field">
                <div class="radius-header">
                  <span class="radius-label-text">Radio de detección</span>
                  <span class="radius-value">{{ form.radiusMeters }} m</span>
                  <span class="radius-desc">· {{ radiusDescription }}</span>
                </div>
                <input
                  v-model.number="form.radiusMeters"
                  class="radius-slider"
                  type="range"
                  :min="MIN_RADIUS"
                  :max="MAX_RADIUS"
                  step="5"
                  @input="updateMapCircle"
                />
                <div class="radius-labels">
                  <span>{{ MIN_RADIUS }} m</span>
                  <span>{{ MAX_RADIUS }} m</span>
                </div>
              </div>
            </div>

            <!-- MENSAJE DE NOTIFICACIÓN -->
            <div class="field-group">
              <label class="field-label">
                Mensaje de notificación <span class="field-required">*</span>
                <span class="char-counter" :class="{ 'char-counter--warn': form.message.length > 180, 'char-counter--over': form.message.length > MAX_MESSAGE_LEN }">
                  {{ form.message.length }} / {{ MAX_MESSAGE_LEN }}
                </span>
              </label>
              <textarea
                v-model="form.message"
                class="field-textarea"
                :class="{ 'field-input--error': fieldErrors.message }"
                rows="3"
                :maxlength="MAX_MESSAGE_LEN"
                placeholder="ej. Hace rato no te vemos. ¡Vuelve hoy y suma para tu premio!"
              ></textarea>
              <p v-if="fieldErrors.message" class="field-error">{{ fieldErrors.message }}</p>
            </div>

            <!-- iOS PREVIEW -->
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

            <!-- HORARIOS (collapsible) -->
            <div class="form-section">
              <button class="section-toggle" type="button" @click="scheduleOpen = !scheduleOpen">
                <span class="section-toggle-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Horarios de notificación
                </span>
                <span v-if="!scheduleOpen && form.scheduleEnabled" class="section-badge">Activo</span>
                <svg class="section-chevron" :class="{ 'section-chevron--open': scheduleOpen }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              <div v-if="scheduleOpen" class="section-body">
                <!-- Enable toggle -->
                <div class="toggle-row">
                  <div class="toggle-label-wrap">
                    <span class="toggle-label">Activar horarios</span>
                    <span class="toggle-desc">La notificación solo se enviará en los horarios configurados</span>
                  </div>
                  <button
                    type="button"
                    class="toggle-switch"
                    :class="{ 'toggle-switch--on': form.scheduleEnabled }"
                    @click="form.scheduleEnabled = !form.scheduleEnabled"
                  >
                    <span class="toggle-thumb"></span>
                  </button>
                </div>

                <!-- Window builder (visible when enabled) -->
                <div v-if="form.scheduleEnabled" class="windows-builder">
                  <div v-for="(win, idx) in form.schedule" :key="idx" class="window-row">
                    <!-- Day chips -->
                    <div class="window-days">
                      <button
                        v-for="day in DAY_DEFS"
                        :key="day.value"
                        type="button"
                        class="day-chip"
                        :class="{ 'day-chip--on': win.days.includes(day.value) }"
                        :title="day.title"
                        @click="toggleDay(win, day.value)"
                      >{{ day.label }}</button>
                    </div>
                    <!-- Times -->
                    <div class="window-times">
                      <span class="time-lbl">De</span>
                      <input type="time" v-model="win.startTime" class="time-in" />
                      <span class="time-lbl">a</span>
                      <input type="time" v-model="win.endTime" class="time-in" />
                      <button type="button" class="btn-remove-win" title="Eliminar ventana" @click="removeWindow(idx)">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <!-- Inline validation error -->
                    <p v-if="win.error" class="window-error">{{ win.error }}</p>
                  </div>

                  <!-- Add window -->
                  <button
                    v-if="form.schedule.length < MAX_WINDOWS"
                    type="button"
                    class="btn-add-win"
                    @click="addWindow"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Agregar ventana de horario
                  </button>

                  <!-- Timezone -->
                  <div class="field-group">
                    <label class="field-label">Zona horaria</label>
                    <select v-model="form.timezone" class="field-select">
                      <option v-for="tz in TIMEZONES" :key="tz.value" :value="tz.value">{{ tz.label }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Submit error -->
            <p v-if="submitError" class="submit-error">{{ submitError }}</p>

            <!-- Form actions -->
            <div class="form-actions">
              <button class="btn-cancel-form" type="button" @click="closeForm">Cancelar</button>
              <button
                class="btn-save"
                :class="{ 'btn-save--loading': saving }"
                :disabled="saving"
                type="button"
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
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Map as LMap, Marker, Circle } from 'leaflet'

import { useGeofenceStore }     from '@/app/stores/geofence/GeofenceStore'
import { useWalletStore }       from '@/app/stores/wallet/WalletStore'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import { useAuthStore }         from '@/app/stores/auth/AuthStore'
import { ApiError }             from '@/infrastructure/http/ApiClient'
import type { Geofence }        from '@/domain/geofence/entities/Geofence'

// ── Constants ──────────────────────────────────────────────────
const MAX_GEOFENCES   = 10
const MAX_WINDOWS     = 10
const MAX_MESSAGE_LEN = 200
const MIN_RADIUS      = 10
const MAX_RADIUS      = 100
const DEFAULT_LAT     = 20.6597
const DEFAULT_LNG     = -103.3496
const DEFAULT_TZ      = 'America/Mexico_City'

const TIMEZONES = [
  { label: 'Ciudad de México (CDT)', value: 'America/Mexico_City' },
  { label: 'Monterrey (CDT)',        value: 'America/Monterrey' },
  { label: 'Tijuana (PDT)',          value: 'America/Tijuana' },
  { label: 'Cancún (EST)',           value: 'America/Cancun' },
  { label: 'Bogotá (COT)',           value: 'America/Bogota' },
  { label: 'Buenos Aires (ART)',     value: 'America/Argentina/Buenos_Aires' },
  { label: 'Santiago (CLT)',         value: 'America/Santiago' },
] as const

const DAY_DEFS = [
  { label: 'L', value: 1, title: 'Lunes' },
  { label: 'M', value: 2, title: 'Martes' },
  { label: 'X', value: 3, title: 'Miércoles' },
  { label: 'J', value: 4, title: 'Jueves' },
  { label: 'V', value: 5, title: 'Viernes' },
  { label: 'S', value: 6, title: 'Sábado' },
  { label: 'D', value: 0, title: 'Domingo' },
] as const

const DAY_NAMES: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
}

// ── Window form type ───────────────────────────────────────────
interface WindowForm {
  days: number[]
  startTime: string
  endTime: string
  error: string
}

// ── Pure utilities ─────────────────────────────────────────────
function formatTime(t: string): string {
  return t.replace(/^0/, '')
}

function formatDays(days: number[]): string {
  if (!days.length) return ''
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
  const ordered = WEEK_ORDER.filter(d => days.includes(d))
  if (ordered.length === 7) return 'Todos los días'
  const indices = ordered.map(d => WEEK_ORDER.indexOf(d))
  const isConsecutive = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1)
  if (isConsecutive && ordered.length > 1) {
    return `${DAY_NAMES[ordered[0]]}–${DAY_NAMES[ordered[ordered.length - 1]]}`
  }
  return ordered.map(d => DAY_NAMES[d]).join(', ')
}

function getScheduleLines(geo: Geofence): string[] {
  if (!geo.scheduleEnabled || !geo.schedule?.length) return ['24/7']
  return geo.schedule.map(w =>
    `${formatDays(w.days)}  ${formatTime(w.startTime)}–${formatTime(w.endTime)}`
  )
}

function toWindowForms(windows: Geofence['schedule']): WindowForm[] {
  return (windows ?? []).map(w => ({ ...w, error: '' }))
}

function defaultWindow(): WindowForm {
  return { days: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '20:00', error: '' }
}

function validateWindows(windows: WindowForm[]): boolean {
  let valid = true
  for (const w of windows) {
    w.error = ''
    if (!w.days.length) {
      w.error = 'Selecciona al menos un día'
      valid = false
      continue
    }
    if (!w.startTime || !w.endTime) {
      w.error = 'Completa ambos horarios'
      valid = false
      continue
    }
    if (w.startTime >= w.endTime) {
      w.error = 'La hora de fin debe ser mayor que la de inicio'
      valid = false
    }
  }
  return valid
}

// ── Setup ──────────────────────────────────────────────────────
const route    = useRoute()
const router   = useRouter()
const walletId = route.params.id as string

const geofenceStore = useGeofenceStore()
const walletStore   = useWalletStore()
const orgStore      = useOrganizationStore()
const authStore     = useAuthStore()

// ── Permission ─────────────────────────────────────────────────
const canEdit = computed(() => {
  const myMember = orgStore.members.find(m => m.adminId === authStore.admin?.id)
  return myMember?.role === 'owner' || myMember?.role === 'admin'
})

// ── Limits ─────────────────────────────────────────────────────
const atLimit = computed(() =>
  geofenceStore.geofences.length >= MAX_GEOFENCES
)
const activeCount = computed(() =>
  geofenceStore.geofences.filter(g => g.isActive).length
)

// ── Form state ─────────────────────────────────────────────────
const showForm    = ref(false)
const isEditing   = ref(false)
const editingId   = ref<string | null>(null)
const pinPlaced   = ref(false)
const scheduleOpen = ref(false)

const form = reactive({
  label:           '',
  latitude:        0,
  longitude:       0,
  radiusMeters:    MAX_RADIUS,
  message:         '',
  scheduleEnabled: false,
  schedule:        [] as WindowForm[],
  timezone:        DEFAULT_TZ,
})

const radiusDescription = computed(() => {
  const m = form.radiusMeters
  if (m <= 20) return 'muy preciso'
  if (m <= 50) return 'preciso'
  if (m <= 75) return 'moderado'
  return 'amplio'
})

const fieldErrors = reactive<Record<string, string>>({})
const submitError = ref('')
const saving      = ref(false)

// ── Schedule management ────────────────────────────────────────
watch(() => form.scheduleEnabled, (enabled) => {
  if (enabled && form.schedule.length === 0) addWindow()
})

function addWindow() {
  if (form.schedule.length < MAX_WINDOWS) {
    form.schedule.push(defaultWindow())
  }
}

function removeWindow(index: number) {
  form.schedule.splice(index, 1)
}

function toggleDay(win: WindowForm, day: number) {
  const idx = win.days.indexOf(day)
  if (idx >= 0) {
    win.days.splice(idx, 1)
  } else {
    win.days.push(day)
  }
  win.error = ''
}

// ── Form lifecycle ─────────────────────────────────────────────
function clearForm() {
  form.label           = ''
  form.latitude        = 0
  form.longitude       = 0
  form.radiusMeters    = MAX_RADIUS
  form.message         = ''
  form.scheduleEnabled = false
  form.schedule        = []
  form.timezone        = DEFAULT_TZ
  pinPlaced.value      = false
  scheduleOpen.value   = false
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
  submitError.value    = ''
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
  form.label           = geo.label
  form.latitude        = geo.latitude
  form.longitude       = geo.longitude
  form.radiusMeters    = geo.radiusMeters ?? MAX_RADIUS
  form.message         = geo.message
  form.scheduleEnabled = geo.scheduleEnabled ?? false
  form.schedule        = toWindowForms(geo.schedule ?? [])
  form.timezone        = geo.timezone ?? DEFAULT_TZ
  pinPlaced.value      = true
  scheduleOpen.value   = geo.scheduleEnabled ?? false
  isEditing.value      = true
  editingId.value      = geo.id
  showForm.value       = true
  initMapWhenReady(geo.latitude, geo.longitude)
}

function closeForm() {
  showForm.value  = false
  editingId.value = null
  destroyMap()
}

// ── Leaflet loader (cached per instance) ──────────────────────
let _L: typeof import('leaflet').default | null = null

async function loadLeaflet() {
  if (_L) return _L
  _L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  return _L
}

// ── Map ────────────────────────────────────────────────────────
const mapEl    = ref<HTMLDivElement | null>(null)
const locating = ref(false)
let mapInstance: LMap   | null = null
let markerInst: Marker  | null = null
let circleInst: Circle  | null = null

async function initMapWhenReady(lat?: number, lng?: number) {
  await nextTick()
  if (!mapEl.value) return
  const L = await loadLeaflet()

  if (mapInstance) { mapInstance.remove(); mapInstance = null }

  const centerLat = lat ?? DEFAULT_LAT
  const centerLng = lng ?? DEFAULT_LNG

  mapInstance = L.map(mapEl.value, { zoomControl: true }).setView([centerLat, centerLng], 15)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(mapInstance)

  if (lat !== undefined && lng !== undefined) {
    placeMapPin(L, lat, lng)
  }

  mapInstance.on('click', (e: { latlng: { lat: number; lng: number } }) => {
    form.latitude   = +e.latlng.lat.toFixed(6)
    form.longitude  = +e.latlng.lng.toFixed(6)
    pinPlaced.value = true
    placeMapPin(L, form.latitude, form.longitude)
  })
}

function placeMapPin(L: typeof import('leaflet').default, lat: number, lng: number) {
  if (!mapInstance) return

  const icon = L.divIcon({
    className: '',
    html: '<div class="geo-pin"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })

  markerInst?.remove()
  circleInst?.remove()

  markerInst = L.marker([lat, lng], { icon }).addTo(mapInstance)
  circleInst = L.circle([lat, lng], {
    radius:      form.radiusMeters,
    color:       '#1B3A2D',
    fillColor:   '#1B3A2D',
    fillOpacity: 0.12,
    weight:      2,
  }).addTo(mapInstance)
}

function updateMapCircle() {
  circleInst?.setRadius(form.radiusMeters)
}

function geolocate() {
  if (!('geolocation' in navigator)) {
    showToast('Tu navegador no soporta geolocalización', 'error')
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      form.latitude   = +pos.coords.latitude.toFixed(6)
      form.longitude  = +pos.coords.longitude.toFixed(6)
      pinPlaced.value = true
      locating.value  = false
      const L = await loadLeaflet()
      if (mapInstance) {
        mapInstance.setView([form.latitude, form.longitude], 17)
        placeMapPin(L, form.latitude, form.longitude)
      }
    },
    () => {
      locating.value = false
      showToast('No se pudo obtener tu ubicación', 'error')
    },
    { timeout: 5000 }
  )
}

function destroyMap() {
  mapInstance?.remove()
  mapInstance = null
  markerInst  = null
  circleInst  = null
}

// ── Address search (Nominatim) ─────────────────────────────────
interface NominatimResult { place_id: number; display_name: string; lat: string; lon: string }

const addrQuery   = ref('')
const addrResults = ref<NominatimResult[]>([])
const addrLoading = ref(false)

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
  } catch {
    showToast('Error al buscar la dirección', 'error')
  } finally {
    addrLoading.value = false
  }
}

function dismissAddrResults() {
  setTimeout(() => { addrResults.value = [] }, 150)
}

async function selectAddress(r: NominatimResult) {
  form.latitude     = +parseFloat(r.lat).toFixed(6)
  form.longitude    = +parseFloat(r.lon).toFixed(6)
  pinPlaced.value   = true
  addrResults.value = []
  addrQuery.value   = ''
  const L = await loadLeaflet()
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

  if (!form.label.trim())   { fieldErrors.label   = 'Requerido'; return }
  if (!pinPlaced.value)     { fieldErrors.latitude = 'Coloca un pin en el mapa'; return }
  if (!form.message.trim()) { fieldErrors.message  = 'Requerido'; return }
  if (form.message.length > MAX_MESSAGE_LEN) { fieldErrors.message = `Máximo ${MAX_MESSAGE_LEN} caracteres`; return }

  if (form.scheduleEnabled) {
    if (!form.schedule.length) {
      scheduleOpen.value = true
      submitError.value  = 'Agrega al menos una ventana de horario o desactiva los horarios'
      return
    }
    if (!validateWindows(form.schedule)) {
      scheduleOpen.value = true
      return
    }
  }

  saving.value = true
  try {
    const dto = {
      label:           form.label.trim(),
      latitude:        form.latitude,
      longitude:       form.longitude,
      radiusMeters:    form.radiusMeters,
      message:         form.message.trim(),
      scheduleEnabled: form.scheduleEnabled,
      schedule:        form.scheduleEnabled
        ? form.schedule.map(({ days, startTime, endTime }) => ({ days, startTime, endTime }))
        : [],
      timezone: form.timezone,
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
    if (e instanceof ApiError && e.status === 400) {
      const body = e.body as Record<string, unknown> | null
      if (body?.details) { Object.assign(fieldErrors, body.details as Record<string, string>); return }
    }
    submitError.value = parseError(e)
  } finally {
    saving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────
const deleteTarget = ref<Geofence | null>(null)
const deleting     = ref(false)

function confirmDelete(geo: Geofence) { deleteTarget.value = geo }

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
  toastTimer  = setTimeout(() => { toast.value = null }, 3000)
}

// ── Error parser ───────────────────────────────────────────────
function parseError(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as Record<string, unknown> | null
    const msg  = body?.message ?? body?.error ?? body?.detail
    if (typeof msg === 'string' && msg) return msg
    return `Error del servidor (${e.status})`
  }
  return 'Error inesperado. Intenta de nuevo.'
}

// ── Lifecycle ──────────────────────────────────────────────────
onMounted(async () => {
  if (!walletStore.currentWallet) await walletStore.fetchWalletById(walletId)
  await geofenceStore.fetchGeofences(walletId)
})

onBeforeUnmount(() => {
  destroyMap()
  clearTimeout(toastTimer)
})
</script>

<style scoped>
/* ── Page layout ─────────────────────────────────────────────── */
.geo-page { min-height: 100vh; background: var(--bg-page); padding: 0 0 60px; }

.page-header {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 28px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
  position: sticky; top: 0; z-index: 10;
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
.header-wallet-name { font-weight: 400; color: var(--text-muted); font-size: 13px; }

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

/* ── Left column — list ──────────────────────────────────────── */
.geo-list-col {
  border-right: 1px solid var(--border);
  background: var(--bg-surface);
  display: flex; flex-direction: column;
  overflow-y: auto;
}
.list-header {
  padding: 16px 18px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
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
  background: var(--primary-light); border: 1.5px solid transparent;
  border-radius: 9px; padding: 7px 13px; cursor: pointer; white-space: nowrap;
  transition: background 0.15s;
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
.empty-icon  { color: var(--text-faint); margin-bottom: 12px; }
.empty-title { font-size: 14px; font-weight: 600; color: var(--text-ink); margin: 0 0 6px; }
.empty-body  { font-size: 13px; color: var(--text-muted); line-height: 1.5; max-width: 240px; margin: 0 auto; }

/* Geofence cards */
.geo-cards {
  flex: 1; overflow-y: auto;
  padding: 12px; display: flex; flex-direction: column; gap: 8px;
}
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
.geo-badge        { font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
.geo-badge--active  { background: rgba(22,163,74,0.12); color: var(--success); }
.geo-badge--paused  { background: var(--bg-subtle); color: var(--text-muted); }
.geo-message      {
  font-size: 12px; color: var(--text-muted); margin: 0 0 7px; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

/* Card schedule lines */
.geo-schedule    { display: flex; flex-direction: column; gap: 2px; margin-bottom: 5px; }
.schedule-line   {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}
.schedule-line:not(.schedule-line--first) { padding-left: 14px; }

/* Card coordinates */
.geo-coords-row  {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--text-faint); font-family: monospace;
}

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
.geo-btn:hover              { background: var(--bg-subtle); color: var(--text-ink); }
.geo-btn--toggle            { color: var(--text-faint); }
.geo-btn--toggle-on         { color: var(--success); border-color: rgba(22,163,74,0.3); background: rgba(22,163,74,0.08); }
.geo-btn--toggle-on:hover   { background: rgba(22,163,74,0.15); }
.geo-btn--disabled          { opacity: 0.35; cursor: not-allowed; }
.geo-btn--disabled:hover    { background: none; color: var(--text-faint); }
.geo-btn--danger            { margin-left: auto; }
.geo-btn--danger:hover      { background: var(--danger-bg); color: var(--danger); border-color: transparent; }
.geo-btn:disabled           { opacity: 0.35; cursor: not-allowed; }

/* ── Right column — form ─────────────────────────────────────── */
.geo-form-col { background: var(--bg-page); overflow-y: auto; }

.form-idle {
  height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 40px; text-align: center;
}
.form-idle-icon { color: var(--border); }
.form-idle-text { font-size: 13px; color: var(--text-muted); max-width: 200px; line-height: 1.5; }

.form-panel { padding: 22px 24px; }
.form-panel-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
}
.form-title  { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0; }
.form-close {
  width: 28px; height: 28px; border-radius: 7px;
  background: none; border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s;
}
.form-close:hover { background: var(--bg-subtle); }

/* ── Form fields ─────────────────────────────────────────────── */
.form-fields { display: flex; flex-direction: column; gap: 18px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.field-required { color: var(--danger); }
.field-input, .field-textarea, .field-select {
  background: var(--bg-surface); border: 1.5px solid var(--border);
  border-radius: 9px; padding: 9px 12px; font-size: 13.5px;
  color: var(--text-ink); width: 100%; box-sizing: border-box;
  transition: border-color 0.15s;
}
.field-input:focus, .field-textarea:focus, .field-select:focus {
  outline: none; border-color: var(--primary);
}
.field-input--error { border-color: var(--danger) !important; }
.field-textarea { resize: vertical; }
.field-select   { cursor: pointer; }
.field-error    { font-size: 11.5px; color: var(--danger); margin: 0; }

/* Radius slider */
.radius-field  { display: flex; flex-direction: column; gap: 4px; }
.radius-header { display: flex; align-items: center; gap: 5px; font-size: 12px; }
.radius-label-text { font-weight: 600; color: var(--text-muted); }
.radius-value  { color: var(--primary); font-weight: 700; }
.radius-desc   { color: var(--text-faint); }
.radius-slider { width: 100%; accent-color: var(--primary); cursor: pointer; }
.radius-labels { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-faint); }

/* Card meta */
.geo-meta-row {
  display: flex; align-items: center; gap: 10px;
  font-size: 11px; color: var(--text-faint);
}
.geo-radius { display: flex; align-items: center; gap: 3px; }
.geo-coords-text { font-family: monospace; }

/* Char counter */
.char-counter      { font-size: 11px; font-weight: 400; color: var(--text-faint); margin-left: auto; }
.char-counter--warn { color: var(--warning); }
.char-counter--over { color: var(--danger); font-weight: 600; }

/* Coordinates row */
.coords-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--text-muted); font-family: monospace;
  background: var(--bg-subtle); border-radius: 7px; padding: 6px 10px;
}

/* ── Address search ──────────────────────────────────────────── */
.addr-search-wrap { position: relative; }
.addr-search { display: flex; gap: 6px; }
.addr-input {
  flex: 1; height: 36px; background: var(--bg-surface);
  border: 1.5px solid var(--border); border-radius: 9px;
  padding: 0 12px; font-size: 13px; color: var(--text-ink);
  transition: border-color 0.15s;
}
.addr-input:focus { outline: none; border-color: var(--primary); }
.addr-btn {
  width: 36px; height: 36px; border-radius: 9px;
  background: var(--primary); border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
  transition: opacity 0.15s;
}
.addr-btn:hover   { opacity: 0.88; }
.addr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.addr-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.7s linear infinite; display: block;
}
@keyframes spin { to { transform: rotate(360deg); } }
.addr-results {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-surface); border: 1.5px solid var(--border);
  border-radius: 10px; overflow: hidden;
  list-style: none; margin: 0; padding: 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12); z-index: 20;
  max-height: 180px; overflow-y: auto;
}
.addr-result-item {
  padding: 9px 12px; font-size: 12.5px; color: var(--text-ink);
  cursor: pointer; border-bottom: 1px solid var(--border); line-height: 1.4;
}
.addr-result-item:last-child { border-bottom: none; }
.addr-result-item:hover { background: var(--primary-light); }

/* ── Map ─────────────────────────────────────────────────────── */
.map-wrap {
  position: relative; border-radius: 12px;
  border: 1px solid var(--border); overflow: hidden;
}
.geo-map { width: 100%; height: 340px; }

.geo-locate-btn {
  position: absolute; bottom: 10px; right: 10px; z-index: 500;
  width: 36px; height: 36px; border-radius: 8px;
  background: var(--bg-surface); border: 1px solid var(--border);
  color: var(--primary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: background 0.12s, color 0.12s;
}
.geo-locate-btn:hover { background: var(--primary-light); }
.geo-locate-btn--loading { animation: pulse 1s ease-in-out infinite; }

.map-hint {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.6); color: #fff;
  font-size: 11.5px; padding: 4px 10px; border-radius: 20px;
  display: flex; align-items: center; gap: 5px;
  pointer-events: none; white-space: nowrap; z-index: 500;
}

/* Leaflet custom pin */
:deep(.geo-pin) {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--primary); border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
}

/* ── iOS preview ─────────────────────────────────────────────── */
.ios-preview-wrap { display: flex; flex-direction: column; gap: 8px; }
.preview-label    { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.ios-screen {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px; padding: 16px; border: 1px solid #333;
}
.ios-notif {
  background: rgba(255,255,255,0.14); backdrop-filter: blur(10px);
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
.ios-notif-body      {
  font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

/* ── Schedule section (collapsible) ─────────────────────────── */
.form-section { border: 1.5px solid var(--border); border-radius: 12px; overflow: hidden; }

.section-toggle {
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 12px 14px; background: var(--bg-subtle); border: none;
  cursor: pointer; text-align: left;
  transition: background 0.12s;
}
.section-toggle:hover { background: var(--primary-light); }
.section-toggle-label {
  flex: 1; display: flex; align-items: center; gap: 7px;
  font-size: 13px; font-weight: 600; color: var(--text-ink);
}
.section-badge {
  font-size: 11px; font-weight: 600;
  color: var(--success); background: rgba(22,163,74,0.1);
  padding: 2px 8px; border-radius: 20px;
}
.section-chevron { color: var(--text-muted); transition: transform 0.2s; flex-shrink: 0; }
.section-chevron--open { transform: rotate(180deg); }

.section-body {
  padding: 14px; border-top: 1.5px solid var(--border);
  display: flex; flex-direction: column; gap: 14px;
}

/* ── Toggle switch ───────────────────────────────────────────── */
.toggle-row {
  display: flex; align-items: flex-start; gap: 12px;
}
.toggle-label-wrap { flex: 1; }
.toggle-label { font-size: 13px; font-weight: 600; color: var(--text-ink); display: block; }
.toggle-desc  { font-size: 12px; color: var(--text-muted); line-height: 1.4; display: block; margin-top: 2px; }

.toggle-switch {
  flex-shrink: 0; width: 44px; height: 26px; border-radius: 13px;
  background: var(--border); border: none; cursor: pointer;
  padding: 3px; position: relative;
  transition: background 0.2s;
}
.toggle-switch--on { background: var(--primary); }
.toggle-thumb {
  display: block; width: 20px; height: 20px;
  border-radius: 50%; background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}
.toggle-switch--on .toggle-thumb { transform: translateX(18px); }

/* ── Window builder ──────────────────────────────────────────── */
.windows-builder { display: flex; flex-direction: column; gap: 10px; }

.window-row {
  background: var(--bg-subtle); border-radius: 10px;
  padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;
}
.window-days { display: flex; gap: 4px; }
.day-chip {
  width: 32px; height: 32px; border-radius: 50%;
  font-size: 11px; font-weight: 700;
  background: var(--bg-surface); border: 1.5px solid var(--border);
  color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  flex-shrink: 0;
}
.day-chip--on              { background: var(--primary); color: #fff; border-color: var(--primary); }
.day-chip:hover:not(.day-chip--on) { background: var(--primary-light); border-color: var(--primary); }

.window-times {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
}
.time-lbl { font-size: 12px; color: var(--text-muted); flex-shrink: 0; }
.time-in {
  height: 34px; padding: 0 8px; font-size: 13px;
  background: var(--bg-surface); border: 1.5px solid var(--border);
  border-radius: 8px; color: var(--text-ink); flex: 1; min-width: 90px;
  transition: border-color 0.15s;
}
.time-in:focus { outline: none; border-color: var(--primary); }

.btn-remove-win {
  margin-left: auto; width: 28px; height: 28px; border-radius: 7px;
  background: none; border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}
.btn-remove-win:hover { background: var(--danger-bg); color: var(--danger); border-color: transparent; }
.window-error { font-size: 11.5px; color: var(--danger); margin: 0; }

.btn-add-win {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 12.5px; font-weight: 600; color: var(--primary);
  background: none; border: 1.5px dashed var(--primary);
  border-radius: 9px; padding: 8px 14px; cursor: pointer; width: 100%;
  transition: background 0.12s;
}
.btn-add-win:hover { background: var(--primary-light); }

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
.btn-save:hover    { opacity: 0.9; }
.btn-save:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Delete modal ────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-card { background: var(--bg-surface); border-radius: 16px; width: 90%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
.modal-card--sm { max-width: 380px; }
.modal-header { display: flex; align-items: center; gap: 12px; padding: 20px 22px 0; }
.modal-icon--danger {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--danger-bg); color: var(--danger);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.modal-title  { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0; }
.modal-body   { padding: 12px 22px 0; font-size: 13.5px; color: var(--text-muted); line-height: 1.6; }
.modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 20px 22px; }
.btn-cancel   { background: none; border: 1.5px solid var(--border); border-radius: 9px; padding: 8px 16px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; }
.btn-cancel:hover { background: var(--bg-subtle); }
.btn-confirm-danger {
  background: var(--danger); color: #fff; border: none;
  border-radius: 9px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: opacity 0.15s;
}
.btn-confirm-danger:hover    { opacity: 0.88; }
.btn-confirm-danger:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Toast ───────────────────────────────────────────────────── */
.geo-toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 500; padding: 10px 18px; border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18); z-index: 2000; pointer-events: none; white-space: nowrap;
}
.geo-toast--success { background: var(--success); color: #fff; }
.geo-toast--error   { background: var(--danger);  color: #fff; }

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>
