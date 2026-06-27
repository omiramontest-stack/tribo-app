import { computed } from 'vue'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { FontKey, ResolvedTheme } from '@/domain/wallet/entities/WalletTheme'
import { resolveTheme } from '@/application/wallet/utils/themeResolver'

export const FONT_FAMILY_MAP: Record<FontKey, string> = {
  system:  'system-ui, -apple-system, sans-serif',
  rounded: '"Plus Jakarta Sans", system-ui, sans-serif',
  serif:   'Georgia, "Times New Roman", serif',
  mono:    '"Menlo", "Consolas", "Courier New", monospace',
}

export function usePassTheme(wallet: Wallet) {
  const resolved = computed<ResolvedTheme>(() => resolveTheme(wallet.theme, wallet))

  const bgStyle = computed(() => {
    const { background, gradientTo } = resolved.value
    return {
      background: gradientTo
        ? `linear-gradient(135deg, ${background} 0%, ${gradientTo} 100%)`
        : background,
    }
  })

  const fontStyle = computed(() => ({
    fontFamily: FONT_FAMILY_MAP[resolved.value.fontKey],
  }))

  const logoUrl = computed(() => resolved.value.assets.logoUrl)

  return { resolved, bgStyle, fontStyle, logoUrl }
}
