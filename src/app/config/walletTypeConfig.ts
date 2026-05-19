import type { WalletType } from '@/domain/wallet/entities/Wallet'
import type { WalletRules, BundleRules, GiftcardRules } from '@/domain/wallet/entities/WalletRules'
import type { PassData } from '@/domain/pass/entities/PassData'

export interface WalletTypeEntry {
  value: WalletType
  label: string
  desc: string
  iconBg: string
  iconColor: string
  iconPath: string
  defaultRules(): WalletRules
  previewData(rules: WalletRules): PassData
}

export const walletTypeConfig: WalletTypeEntry[] = [
  {
    value: 'stamps',
    label: 'Sellos',
    desc: 'Tarjeta de lealtad con sellos acumulables',
    iconBg: '#F1E6D4',
    iconColor: '#7C5E3C',
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    defaultRules: () => ({ type: 'stamps', totalStamps: 10, reward: 'Un producto gratis', stampIcon: 'check' }),
    previewData: () => ({ type: 'stamps', currentStamps: 3 }),
  },
  {
    value: 'membership',
    label: 'Membresía',
    desc: 'Tarjeta de miembro con nivel y vigencia',
    iconBg: '#D9E5DD',
    iconColor: '#1B3A2D',
    iconPath: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    defaultRules: () => ({ type: 'membership', level: 'Gold Member', expiresInDays: null }),
    previewData: () => ({ type: 'membership', memberSince: new Date().toISOString(), expiresAt: null }),
  },
  {
    value: 'points',
    label: 'Puntos',
    desc: 'Acumulación de puntos canjeables por recompensas',
    iconBg: '#EBE3FB',
    iconColor: '#8B5CF6',
    iconPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    defaultRules: () => ({ type: 'points', pointsLabel: 'puntos', reward: 'Descuento 10%', rewardThreshold: 100 }),
    previewData: () => ({ type: 'points', currentPoints: 45 }),
  },
  {
    value: 'cashback',
    label: 'Cashback',
    desc: 'Saldo acumulable como porcentaje de compras',
    iconBg: '#FCEBC4',
    iconColor: '#F5A623',
    iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    defaultRules: () => ({ type: 'cashback', cashbackPercent: 5, currency: 'MXN' }),
    previewData: () => ({ type: 'cashback', balance: 42.5 }),
  },
  {
    value: 'daypass',
    label: 'Day Pass',
    desc: 'Pase de acceso único para eventos',
    iconBg: '#D6EEFB',
    iconColor: '#0EA5E9',
    iconPath: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
    defaultRules: () => ({ type: 'daypass', eventName: '', eventDate: '', venue: '', imageUrl: null }),
    previewData: () => ({ type: 'daypass', used: false }),
  },
  {
    value: 'bundle',
    label: 'Paquete',
    desc: 'Paquete de N usos (clases, sesiones, lavados…)',
    iconBg: '#F0E6FB',
    iconColor: '#7C3AED',
    iconPath: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    defaultRules: () => ({ type: 'bundle', totalUses: 10, label: 'clases' }),
    previewData: (rules) => {
      const r = rules as BundleRules
      return { type: 'bundle', remainingUses: Math.ceil(r.totalUses * 0.7) }
    },
  },
  {
    value: 'giftcard',
    label: 'Gift Card',
    desc: 'Tarjeta de regalo con saldo prepagado',
    iconBg: '#FCE7F3',
    iconColor: '#DB2777',
    iconPath: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
    defaultRules: () => ({ type: 'giftcard', initialBalance: 500, currency: 'MXN' }),
    previewData: (rules) => {
      const r = rules as GiftcardRules
      return { type: 'giftcard', initialBalance: r.initialBalance, currentBalance: r.initialBalance * 0.6 }
    },
  },
  {
    value: 'coupon',
    label: 'Cupón',
    desc: 'Cupón de descuento de un solo uso',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    iconPath: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
    defaultRules: () => ({ type: 'coupon', discount: 10, discountType: 'percent', expiresInDays: 30 }),
    previewData: () => ({ type: 'coupon', used: false, expiresAt: null }),
  },
]

export function findWalletTypeConfig(type: WalletType): WalletTypeEntry {
  return walletTypeConfig.find(c => c.value === type)!
}
