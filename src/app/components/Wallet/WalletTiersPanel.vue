<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTierStore } from '@/app/stores/tier/TierStore'
import { parseApiError } from '@/app/composables/useApiError'
import TierEditModal from '@/app/components/Wallet/TierEditModal.vue'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { WalletTier } from '@/domain/wallet/entities/WalletTier'

const props = defineProps<{ wallet: Wallet; canEdit: boolean }>()

const tierStore = useTierStore()

// ─── Loading / error state ─────────────────────────────────────────────────────
const loading  = ref(false)
const loadErr  = ref('')

onMounted(async () => {
  loading.value = true
  loadErr.value = ''
  try {
    await tierStore.fetchTiers(props.wallet.id)
  } catch (e) {
    loadErr.value = parseApiError(e)
  } finally {
    loading.value = false
  }
})

// ─── Edit modal state ──────────────────────────────────────────────────────────
const showModal   = ref(false)
const editingTier = ref<WalletTier | null>(null)

const nextLevel = computed(() => tierStore.maxLevel + 1)

const prevThreshold = computed(() => {
  // For the next tier, the minimum threshold is the current max tier's threshold
  const sorted = tierStore.tiers
  if (sorted.length === 0) return 0
  return sorted[sorted.length - 1].unlockRule.threshold
})

function openCreate() {
  editingTier.value = null
  showModal.value = true
}

function openEdit(tier: WalletTier) {
  editingTier.value = tier
  showModal.value = true
}

// For editing an existing tier, we need its prev threshold (the tier with level - 1)
const editPrevThreshold = computed(() => {
  if (!editingTier.value) return prevThreshold.value
  const prevTier = tierStore.tiers.find(t => t.level === editingTier.value!.level - 1)
  return prevTier?.unlockRule.threshold ?? 0
})

const editNextLevel = computed(() =>
  editingTier.value ? editingTier.value.level : nextLevel.value,
)

// ─── Delete ────────────────────────────────────────────────────────────────────
const confirmDeleteTier = ref<WalletTier | null>(null)
const deleting = ref(false)
const deleteErr = ref('')

async function confirmDelete() {
  if (!confirmDeleteTier.value) return
  deleting.value = true
  deleteErr.value = ''
  try {
    await tierStore.deleteTier(props.wallet.id, confirmDeleteTier.value.id)
    confirmDeleteTier.value = null
  } catch (e) {
    deleteErr.value = parseApiError(e)
  } finally {
    deleting.value = false
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function thresholdLabel(threshold: number): string {
  return threshold === 1 ? '1 canje acumulado' : `${threshold} canjes acumulados`
}
</script>

<template>
  <div class="tiers-panel">

    <!-- Panel header -->
    <div class="panel-header">
      <div class="panel-title-row">
        <div class="panel-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary-text)" stroke-width="2" stroke-linecap="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <div>
          <p class="panel-title">Programa de Niveles</p>
          <p class="panel-subtitle">
            {{ tierStore.tiers.length === 0 ? 'Sin niveles configurados' : `${tierStore.tiers.length + 1} niveles` }}
          </p>
        </div>
      </div>
      <button
        v-if="canEdit"
        class="btn-add-tier"
        @click="openCreate"
        :disabled="loading"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Añadir Nivel {{ nextLevel }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="panel-loading">
      <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round">
        <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
      </svg>
      Cargando niveles…
    </div>

    <!-- Load error -->
    <div v-else-if="loadErr" class="panel-error">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      {{ loadErr }}
    </div>

    <!-- Evolution path -->
    <div v-else class="evolution-path">

      <!-- Nivel 1: base wallet (always shown) -->
      <div class="tier-node tier-node--base">
        <div class="tier-node-level">
          <span class="level-badge level-badge--base">1</span>
        </div>
        <div class="tier-node-card tier-node-card--base">
          <div class="tier-card-top">
            <div class="tier-card-color" :style="{ background: wallet.primaryColor }" />
            <div class="tier-card-info">
              <p class="tier-card-name">{{ wallet.businessName }}</p>
              <p class="tier-card-meta">Nivel base · Siempre activo</p>
            </div>
            <span class="tier-card-base-badge">Nivel 1</span>
          </div>
          <div class="tier-card-hint">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            Configura este nivel en la pestaña "Marca" del editor de wallet.
          </div>
        </div>
      </div>

      <!-- Arrow between levels when there are tiers -->
      <template v-if="tierStore.tiers.length > 0">
        <div
          v-for="(tier, idx) in tierStore.tiers"
          :key="tier.id"
          class="tier-step"
        >
          <!-- Connector arrow -->
          <div class="tier-connector">
            <div class="connector-line" />
            <div class="connector-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 5v14M19 12l-7 7-7-7"/>
              </svg>
              tras {{ thresholdLabel(tier.unlockRule.threshold) }}
            </div>
          </div>

          <!-- Tier card -->
          <div class="tier-node">
            <div class="tier-node-level">
              <span class="level-badge">{{ tier.level }}</span>
            </div>
            <div class="tier-node-card">
              <div class="tier-card-top">
                <div
                  class="tier-card-color"
                  :style="{
                    background: tier.config?.colors?.background ?? wallet.primaryColor,
                  }"
                />
                <div class="tier-card-info">
                  <p class="tier-card-name">{{ tier.name }}</p>
                  <p class="tier-card-meta">
                    Nivel {{ tier.level }}
                    <span v-if="tier.config?.colors?.background" class="tier-card-custom-badge">Diseño personalizado</span>
                  </p>
                </div>
                <div v-if="canEdit" class="tier-card-actions">
                  <button
                    type="button"
                    class="tier-action-btn"
                    title="Editar nivel"
                    @click="openEdit(tier)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <!-- Only allow deleting the highest level -->
                  <button
                    v-if="tier.level === tierStore.maxLevel"
                    type="button"
                    class="tier-action-btn tier-action-btn--danger"
                    title="Eliminar nivel"
                    @click="confirmDeleteTier = tier"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    </svg>
                  </button>
                  <span
                    v-else
                    class="tier-action-btn tier-action-btn--disabled"
                    :title="`Solo puedes eliminar el nivel más alto (actualmente Nivel ${tierStore.maxLevel})`"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    </svg>
                  </span>
                </div>
              </div>

              <!-- Rules summary -->
              <div class="tier-card-rules">
                <template v-if="tier.rules.type === 'stamps'">
                  {{ tier.rules.totalStamps }} sellos → {{ tier.rules.reward }}
                </template>
                <template v-else-if="tier.rules.type === 'points'">
                  {{ tier.rules.rewardThreshold }} {{ tier.rules.pointsLabel }} → {{ tier.rules.reward }}
                </template>
                <template v-else-if="tier.rules.type === 'membership'">
                  Membresía: {{ tier.rules.level }}
                </template>
                <template v-else-if="tier.rules.type === 'bundle'">
                  {{ tier.rules.totalUses }} {{ tier.rules.label }}
                </template>
                <template v-else-if="tier.rules.type === 'cashback'">
                  {{ tier.rules.cashbackPercent }}% cashback en {{ tier.rules.currency }}
                </template>
                <template v-else-if="tier.rules.type === 'coupon'">
                  {{ tier.rules.discount }}{{ tier.rules.discountType === 'percent' ? '%' : ` ${tier.rules.currency ?? ''}` }} de descuento
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty tiers state -->
      <div v-if="tierStore.tiers.length === 0" class="tiers-empty">
        <div class="connector-line connector-line--dashed" />
        <div class="tiers-empty-card">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.5" stroke-linecap="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <p class="tiers-empty-title">Sin niveles de evolución</p>
          <p class="tiers-empty-hint">
            Crea un Nivel 2 para que los clientes que completen canjes obtengan
            un nuevo nombre, diseño y beneficios en su misma tarjeta.
          </p>
          <button v-if="canEdit" class="btn-add-tier-inline" @click="openCreate">
            Añadir Nivel 2
          </button>
        </div>
      </div>

    </div>

  </div>

  <!-- TierEditModal -->
  <TierEditModal
    v-model="showModal"
    :wallet="wallet"
    :tier="editingTier"
    :next-level="editNextLevel"
    :prev-threshold="editPrevThreshold"
    @saved="showModal = false"
  />

  <!-- Delete confirmation -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="confirmDeleteTier" class="modal-backdrop" @click.self="confirmDeleteTier = null">
        <div class="modal-card">
          <div class="modal-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          </div>
          <div>
            <p class="modal-title">Eliminar Nivel {{ confirmDeleteTier.level }}</p>
            <p class="modal-body">
              ¿Eliminar "<strong>{{ confirmDeleteTier.name }}</strong>"?
              Los pases que ya alcanzaron este nivel mantienen su estado; solo se elimina la configuración del nivel.
            </p>
            <p v-if="deleteErr" class="delete-error">{{ deleteErr }}</p>
          </div>
          <div class="modal-actions">
            <button class="modal-btn-cancel" :disabled="deleting" @click="confirmDeleteTier = null">Cancelar</button>
            <button class="modal-btn-confirm" :disabled="deleting" @click="confirmDelete">
              <svg v-if="deleting" class="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 019 9"/>
              </svg>
              {{ deleting ? 'Eliminando…' : 'Eliminar nivel' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tiers-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 0 var(--shadow-card);
}

.panel-header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 18px; border-bottom: 1px solid var(--border);
}

.panel-title-row { display: flex; align-items: center; gap: 10px; }

.panel-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--primary-light);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.panel-title { font-size: 14px; font-weight: 700; color: var(--text-ink); margin: 0 0 1px; }
.panel-subtitle { font-size: 11.5px; color: var(--text-muted); margin: 0; }

.btn-add-tier {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 13px; border-radius: 8px;
  border: 1.5px solid var(--primary-text); background: var(--primary-light);
  color: var(--primary-text); font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: background 0.13s;
}
.btn-add-tier:hover { background: var(--primary-text); color: #fff; }
.btn-add-tier:disabled { opacity: 0.5; cursor: not-allowed; }

/* Loading / error */
.panel-loading {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 32px 20px; font-size: 13px; color: var(--text-muted);
}

.panel-error {
  display: flex; align-items: center; gap: 7px;
  padding: 14px 18px; font-size: 12.5px;
  color: var(--danger); background: var(--danger-bg); border-top: 1px solid var(--danger-bg);
}

/* Evolution path */
.evolution-path {
  padding: 18px;
  display: flex; flex-direction: column; gap: 0;
}

.tier-step { display: flex; flex-direction: column; gap: 0; }

/* Connector */
.tier-connector {
  display: flex; flex-direction: column; align-items: center;
  padding: 6px 0;
}

.connector-line {
  width: 2px; height: 20px; background: var(--border);
  border-radius: 999px;
}

.connector-line--dashed {
  background: none;
  border-left: 2px dashed var(--border);
  height: 24px; width: 0;
  margin: 6px 0 0;
}

.connector-label {
  display: flex; align-items: center; gap: 4px;
  font-size: 10.5px; font-weight: 600; color: var(--text-faint);
  background: var(--bg-page); border: 1px solid var(--border);
  border-radius: 999px; padding: 3px 10px; margin-top: 4px;
  white-space: nowrap;
}

/* Tier node */
.tier-node { display: flex; align-items: flex-start; gap: 12px; }

.tier-node-level { padding-top: 12px; flex-shrink: 0; }

.level-badge {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--primary-text); color: #fff;
  font-size: 12px; font-weight: 800;
}

.level-badge--base {
  background: var(--bg-subtle); color: var(--text-muted);
  border: 1.5px solid var(--border);
}

.tier-node-card {
  flex: 1; background: var(--bg-page); border: 1.5px solid var(--border);
  border-radius: 12px; overflow: hidden; transition: border-color 0.15s;
}
.tier-node-card:hover { border-color: var(--primary-text); }

.tier-node-card--base { border-style: dashed; }
.tier-node-card--base:hover { border-color: var(--border); }

.tier-card-top {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
}

.tier-card-color {
  width: 8px; flex-shrink: 0;
  align-self: stretch; border-radius: 4px;
  min-height: 32px;
}

.tier-card-info { flex: 1; min-width: 0; }

.tier-card-name {
  font-size: 13px; font-weight: 700; color: var(--text-ink); margin: 0 0 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.tier-card-meta {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--text-muted); margin: 0;
}

.tier-card-base-badge {
  font-size: 10px; font-weight: 700; color: var(--text-faint);
  background: var(--bg-subtle); border: 1px solid var(--border);
  padding: 2px 7px; border-radius: 999px; white-space: nowrap;
}

.tier-card-custom-badge {
  font-size: 9.5px; font-weight: 600; color: var(--primary-text);
  background: var(--primary-light); padding: 1px 6px; border-radius: 999px;
}

.tier-card-actions { display: flex; gap: 4px; flex-shrink: 0; }

.tier-action-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--border);
  background: var(--bg-surface); color: var(--text-muted);
  cursor: pointer; transition: background 0.12s, color 0.12s;
}
.tier-action-btn:hover { background: var(--bg-page); color: var(--text-ink); }
.tier-action-btn--danger:hover { background: var(--danger-bg); color: var(--danger); border-color: var(--danger-bg); }
.tier-action-btn--disabled {
  opacity: 0.3; cursor: not-allowed;
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--border);
  background: var(--bg-surface); color: var(--text-muted);
}

.tier-card-hint {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: var(--text-faint);
  padding: 8px 14px; border-top: 1px solid var(--border);
  background: var(--bg-subtle);
}

.tier-card-rules {
  font-size: 11.5px; color: var(--text-muted);
  padding: 8px 14px; border-top: 1px solid var(--border);
  background: var(--bg-subtle);
}

/* Empty state */
.tiers-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 4px 0 8px;
}

.tiers-empty-card {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 24px 20px;
  border: 1.5px dashed var(--border); border-radius: 12px;
  width: 100%; box-sizing: border-box; text-align: center;
}

.tiers-empty-title { font-size: 13px; font-weight: 600; color: var(--text-muted); margin: 0; }

.tiers-empty-hint {
  font-size: 12px; color: var(--text-faint); margin: 0; line-height: 1.55;
  max-width: 340px;
}

.btn-add-tier-inline {
  margin-top: 4px; padding: 8px 16px; border-radius: 8px;
  border: 1.5px solid var(--primary-text); background: var(--primary-light);
  color: var(--primary-text); font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: background 0.13s;
}
.btn-add-tier-inline:hover { background: var(--primary-text); color: #fff; }

/* Delete modal */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 9200;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  background: var(--overlay); backdrop-filter: blur(2px);
}

.modal-card {
  background: var(--bg-surface); border-radius: 18px;
  box-shadow: 0 20px 60px var(--shadow-card);
  width: 100%; max-width: 380px; padding: 28px;
  display: flex; flex-direction: column; gap: 16px;
}

.modal-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: var(--danger-bg); display: grid; place-items: center;
}

.modal-title { font-size: 15px; font-weight: 700; color: var(--text-ink); margin: 0 0 6px; }
.modal-body  { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.55; }
.delete-error { font-size: 12px; color: var(--danger); margin: 4px 0 0; }

.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

.modal-btn-cancel {
  padding: 8px 16px; border-radius: 9px; border: 1px solid var(--border);
  background: var(--bg-surface); font-size: 13px; font-weight: 600;
  color: var(--text-medium); cursor: pointer; font-family: inherit;
  transition: background 0.12s;
}
.modal-btn-cancel:hover:not(:disabled) { background: var(--bg-page); }
.modal-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-btn-confirm {
  padding: 8px 16px; border-radius: 9px; border: none;
  background: var(--danger); font-size: 13px; font-weight: 700;
  color: #fff; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; gap: 6px; transition: opacity 0.12s;
}
.modal-btn-confirm:hover:not(:disabled) { opacity: 0.88; }
.modal-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-card, .modal-leave-active .modal-card { transition: transform 0.2s; }
.modal-enter-from .modal-card, .modal-leave-to .modal-card { transform: scale(0.96); }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
</style>
