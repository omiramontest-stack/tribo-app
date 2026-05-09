import type { PassAction } from '@/domain/pass/repository/PassRepository'

export interface UpdatePassDataDto {
  token: string
  action: PassAction
  amount?: number
  purchaseAmount?: number
  cashbackPercent?: number
  description?: string
  orgId: string
}
