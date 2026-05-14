<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import { walletTypeConfig } from '@/app/config/walletTypeConfig'

const props = defineProps<{ wallet: Wallet }>()
const router = useRouter()

const wt = computed(() =>
  walletTypeConfig.find(c => c.value === props.wallet.type)
  ?? { label: props.wallet.type, iconColor: 'var(--text-muted)', iconBg: 'var(--bg-page)', iconPath: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' }
)

const initials = computed(() =>
  props.wallet.businessName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
)
</script>

<template>
  <div
    class="wallet-card"
    @click="router.push({ name: 'WalletDetail', params: { id: wallet.id } })"
  >
    <div class="card-strip" :style="{ background: wallet.primaryColor || wt.iconColor }" />

    <div class="card-body">
      <div class="card-header">
        <div class="card-avatar" :style="wallet.logoUrl ? {} : { background: wallet.primaryColor || wt.iconBg }">
          <img v-if="wallet.logoUrl" :src="wallet.logoUrl" :alt="wallet.businessName" class="card-avatar-img" />
          <span v-else class="card-avatar-initials">{{ initials }}</span>
        </div>

        <div class="card-name-wrap">
          <p class="card-name">{{ wallet.businessName }}</p>
          <p v-if="wallet.description" class="card-desc">{{ wallet.description }}</p>
        </div>

        <div class="card-type-icon" :style="{ background: wt.iconBg }">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="1.8"
               stroke-linecap="round" stroke-linejoin="round" :stroke="wt.iconColor">
            <path :d="wt.iconPath" />
          </svg>
        </div>
      </div>

      <div class="card-divider" />

      <div class="card-meta">
        <div class="meta-item">
          <span class="meta-label">Tipo</span>
          <span class="meta-value" :style="{ color: wt.iconColor }">{{ wt.label }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Creado</span>
          <span class="meta-value">
            {{ new Date(wallet.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) }}
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Colores</span>
          <span class="meta-colors">
            <span class="color-dot" :style="{ background: wallet.primaryColor }" :title="wallet.primaryColor" />
            <span class="color-dot accent" :style="{ background: wallet.accentColor }" :title="wallet.accentColor" />
          </span>
        </div>
      </div>

      <div class="card-footer">
        <span class="type-badge" :style="{ color: wt.iconColor, background: wt.iconBg }">
          {{ wt.label }}
        </span>
        <span class="card-cta">Ver detalles →</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.18s, transform 0.18s;
}
.wallet-card:hover {
  box-shadow: 0 6px 24px var(--overlay);
  transform: translateY(-2px);
}

.card-strip { height: 3px; }

.card-body { padding: 16px; }

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.card-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 3px;
  background: var(--bg-page);
}

.card-avatar-initials {
  font-size: 14px;
  font-weight: 700;
  color: var(--bg-surface);
  letter-spacing: -0.5px;
}

.card-name-wrap {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-ink);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 11.5px;
  color: var(--text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-type-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-divider {
  height: 1px;
  background: var(--border);
  margin-bottom: 12px;
}

.card-meta {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
}

.meta-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta-label {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.meta-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-ink);
}

.meta-colors {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.color-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.color-dot.accent { opacity: 0.7; }

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.type-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
}

.card-cta {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-mid);
  transition: color 0.15s;
}
.wallet-card:hover .card-cta { color: var(--primary); }
</style>
