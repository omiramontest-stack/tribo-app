import 'reflect-metadata'
import { injectable } from 'inversify'

import type { PassRepository, PassAction } from '@/domain/pass/repository/PassRepository'
import type { Pass } from '@/domain/pass/entities/Pass'
import { apiClient, ApiError } from '@/infrastructure/http/ApiClient'

@injectable()
export class PassHttpRepository implements PassRepository {
  async findByToken(token: string): Promise<Pass | null> {
    try {
      const result = await apiClient.get<{ pass: Pass; wallet: unknown }>(`/passes/w/${token}`)
      return result.pass
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  }

  async findByWalletId(walletId: string): Promise<Pass[]> {
    return apiClient.get<Pass[]>(`/wallets/${walletId}/passes`)
  }

  async save(pass: Pass): Promise<Pass> {
    return apiClient.post<Pass>(`/wallets/${pass.walletId}/passes`, {
      customerName: pass.customerName,
    })
  }

  async update(pass: Pass): Promise<Pass> {
    const result = await apiClient.patch<{ pass: Pass; wallet: unknown }>(`/passes/${pass.token}`, {
      action: pass.data.type === 'stamps'
        ? 'add_stamp'
        : pass.data.type === 'points'
          ? 'add_points'
          : 'renew_membership',
    })
    return result.pass
  }

  async applyAction(token: string, action: PassAction, amount?: number): Promise<Pass> {
    const result = await apiClient.patch<{ pass: Pass; wallet: unknown }>(`/passes/${token}`, {
      action,
      ...(amount !== undefined ? { amount } : {}),
    })
    return result.pass
  }

  async delete(token: string): Promise<void> {
    await apiClient.delete(`/passes/${token}`)
  }
}
