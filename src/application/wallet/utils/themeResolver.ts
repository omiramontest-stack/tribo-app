import type { WalletThemeOverrides, ResolvedTheme, FontKey, BarcodeFormat } from '@/domain/wallet/entities/WalletTheme'

interface WalletBase {
  primaryColor: string
  accentColor: string
  logoUrl: string | null
}

const DEFAULT_FOREGROUND = '#FFFFFF'
const DEFAULT_FONT_KEY: FontKey = 'system'
const DEFAULT_BARCODE_FORMAT: BarcodeFormat = 'qr'

export function resolveTheme(
  overrides: WalletThemeOverrides | null | undefined,
  base: WalletBase,
): ResolvedTheme {
  return {
    background: overrides?.colors?.background ?? base.primaryColor,
    foreground: overrides?.colors?.foreground ?? DEFAULT_FOREGROUND,
    label: overrides?.colors?.label ?? DEFAULT_FOREGROUND,
    accent: overrides?.colors?.accent ?? base.accentColor,
    gradientTo: overrides?.colors?.gradientTo ?? null,
    fontKey: overrides?.typography?.fontKey ?? DEFAULT_FONT_KEY,
    barcode: {
      format: overrides?.barcode?.format ?? DEFAULT_BARCODE_FORMAT,
      altText: overrides?.barcode?.altText ?? null,
    },
    assets: {
      logoUrl: overrides?.assets?.logoUrl !== undefined ? overrides.assets.logoUrl : base.logoUrl,
      stripImageUrl: overrides?.assets?.stripImageUrl ?? null,
    },
    back: {
      website: overrides?.back?.website ?? null,
      phone: overrides?.back?.phone ?? null,
      address: overrides?.back?.address ?? null,
      instagram: overrides?.back?.instagram ?? null,
    },
  }
}

export function mergeThemeOverrides(
  base: WalletThemeOverrides | null | undefined,
  tier: WalletThemeOverrides | null | undefined,
): WalletThemeOverrides {
  if (!tier) return base ?? {}
  if (!base) return tier

  return {
    colors: { ...base.colors, ...tier.colors },
    typography: { ...base.typography, ...tier.typography },
    assets: { ...base.assets, ...tier.assets },
    barcode: { ...base.barcode, ...tier.barcode },
    back: { ...base.back, ...tier.back },
  }
}
