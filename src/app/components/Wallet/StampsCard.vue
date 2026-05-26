<script setup lang="ts">
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { StampsData } from '@/domain/pass/entities/PassData'
import type { StampsRules } from '@/domain/wallet/entities/WalletRules'
import { getStampIcon } from '@/app/config/stampIcons'

const props = defineProps<{ pass: Pass; wallet: Wallet }>()

const rules = props.wallet.rules as StampsRules
const data  = props.pass.data as StampsData
const icon  = getStampIcon(rules.stampIcon)

/** Para ícono custom usamos el SVG completo; para el resto, el path interno. */
const isCustomIcon = rules.stampIcon === 'custom' && !!rules.stampCustomSvg

const COLS = 5
const filled = (i: number) => i <= data.currentStamps
</script>

<template>
  <div
    class="stamps-card"
    :style="{ background: `linear-gradient(135deg, ${wallet.primaryColor} 0%, ${wallet.accentColor} 100%)` }"
  >
    <!-- Header -->
    <div class="sc-header">
      <div class="sc-title-block">
        <p class="sc-business">{{ wallet.businessName }}</p>
        <p v-if="wallet.description" class="sc-desc">{{ wallet.description }}</p>
      </div>
      <div v-if="wallet.logoUrl" class="sc-logo-wrap">
        <img :src="wallet.logoUrl" class="sc-logo" :alt="wallet.businessName" />
      </div>
    </div>

    <!-- Stamps grid -->
    <div class="sc-grid-wrap">
      <div class="sc-grid" :style="{ '--cols': COLS }">
        <div
          v-for="i in rules.totalStamps"
          :key="i"
          class="sc-stamp"
          :class="filled(i) ? 'sc-stamp--filled' : 'sc-stamp--empty'"
        >
          <!-- ícono custom: SVG completo del usuario -->
          <span
            v-if="isCustomIcon"
            class="sc-stamp-icon sc-stamp-icon--custom"
            v-html="rules.stampCustomSvg"
          />
          <!-- ícono predefinido: paths dentro de un <svg> 24x24 -->
          <svg
            v-else
            viewBox="0 0 24 24"
            class="sc-stamp-icon"
            v-html="icon.svg"
          />
        </div>
      </div>
      <p class="sc-reward">
        {{ data.currentStamps }} / {{ rules.totalStamps }} — {{ rules.reward }}
      </p>
    </div>

    <!-- Footer -->
    <div class="sc-footer">
      <div>
        <p class="sc-footer-label">Nombre</p>
        <p class="sc-footer-value">{{ pass.firstName }} {{ pass.lastName }}</p>
      </div>
      <div class="sc-footer-right">
        <p class="sc-footer-label">Vencimiento</p>
        <p class="sc-footer-value">Sin vencimiento</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stamps-card {
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  color: #fff;
}

/* Header */
.sc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 18px 10px;
  gap: 12px;
}
.sc-title-block { flex: 1; min-width: 0; }
.sc-business {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.2;
}
.sc-desc {
  font-size: 11px;
  color: rgba(255,255,255,0.65);
  margin: 3px 0 0;
}
.sc-logo-wrap {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255,255,255,0.15);
  flex-shrink: 0;
}
.sc-logo { width: 100%; height: 100%; object-fit: cover; }

/* Grid */
.sc-grid-wrap {
  margin: 0 14px 4px;
  background: rgba(255,255,255,0.12);
  border-radius: 14px;
  padding: 14px 14px 10px;
}
.sc-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: 8px;
}
.sc-stamp {
  aspect-ratio: 1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
}
.sc-stamp--filled {
  background: rgba(255,255,255,0.95);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.sc-stamp--empty {
  background: transparent;
  border: 2px solid rgba(255,255,255,0.3);
}
.sc-stamp-icon {
  width: 48%;
  height: 48%;
}
/* custom SVG: span que contiene la etiqueta <svg> completa del usuario */
.sc-stamp-icon--custom {
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-stamp-icon--custom :deep(svg) {
  width: 100%;
  height: 100%;
}
.sc-stamp--filled .sc-stamp-icon {
  color: v-bind('wallet.primaryColor');
  filter: brightness(0.75);
}
.sc-stamp--empty .sc-stamp-icon {
  color: rgba(255,255,255,0.35);
}
.sc-reward {
  font-size: 11px;
  color: rgba(255,255,255,0.75);
  text-align: center;
  margin: 10px 0 0;
  font-weight: 500;
  letter-spacing: 0.01em;
}

/* Footer */
.sc-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 18px 18px;
}
.sc-footer-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.55);
  margin: 0 0 2px;
}
.sc-footer-value {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}
.sc-footer-right { text-align: right; }
</style>
