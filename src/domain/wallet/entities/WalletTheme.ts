export type BarcodeFormat = 'qr'
export type FontKey = 'system' | 'rounded' | 'serif' | 'mono'

export interface WalletThemeColors {
  background?: string
  foreground?: string
  label?: string
  accent?: string
  gradientTo?: string | null
}

export interface WalletThemeTypography {
  fontKey?: FontKey
}

export interface WalletThemeAssets {
  logoUrl?: string | null
  stripImageUrl?: string | null
}

export interface WalletThemeBarcode {
  format?: BarcodeFormat
  altText?: string | null
}

export interface WalletThemeBack {
  website?: string | null
  phone?: string | null
  address?: string | null
  instagram?: string | null
}

export interface WalletThemeOverrides {
  colors?: WalletThemeColors
  typography?: WalletThemeTypography
  assets?: WalletThemeAssets
  barcode?: WalletThemeBarcode
  back?: WalletThemeBack
}

export interface ResolvedTheme {
  background: string
  foreground: string
  label: string
  accent: string
  gradientTo: string | null
  fontKey: FontKey
  barcode: { format: BarcodeFormat; altText: string | null }
  assets: { logoUrl: string | null; stripImageUrl: string | null }
  back: { website: string | null; phone: string | null; address: string | null; instagram: string | null }
}
