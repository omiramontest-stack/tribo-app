export interface StampsData {
  type: 'stamps'
  currentStamps: number
  expiresAt: string | null
  tierLevel?: number
  completedCycles?: number
}

export interface MembershipData {
  type: 'membership'
  memberSince: string
  expiresAt: string | null
  tierLevel?: number
  completedCycles?: number
}

export interface PointsData {
  type: 'points'
  currentPoints: number
  expiresAt: string | null
  tierLevel?: number
  completedCycles?: number
}

export interface CashbackData {
  type: 'cashback'
  balance: number
  expiresAt: string | null
  tierLevel?: number
  completedCycles?: number
}

export interface DaypassData {
  type: 'daypass'
  used: boolean
  tierLevel?: number
  completedCycles?: number
}

export interface BundleData {
  type: 'bundle'
  remainingUses: number
  expiresAt: string | null
  tierLevel?: number
  completedCycles?: number
}

export interface GiftcardData {
  type: 'giftcard'
  initialBalance: number
  currentBalance: number
  expiresAt: string | null
  tierLevel?: number
  completedCycles?: number
}

export interface CouponData {
  type: 'coupon'
  used: boolean
  expiresAt: string | null
  tierLevel?: number
  completedCycles?: number
}

export type PassData = StampsData | MembershipData | PointsData | CashbackData | DaypassData | BundleData | GiftcardData | CouponData
