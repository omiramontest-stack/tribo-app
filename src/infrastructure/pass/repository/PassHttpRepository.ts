import 'reflect-metadata'
import { injectable } from 'inversify'

import type { PassRepository, PassAction, PassWithWalletRaw, CashbackTransaction, ApplyActionOptions, PaginationMeta } from '@/domain/pass/repository/PassRepository'
import type { Pass } from '@/domain/pass/entities/Pass'
import { apiClient, ApiError } from '@/infrastructure/http/ApiClient'

@injectable()
export class PassHttpRepository implements PassRepository {
  async findByToken(token: string, dl?: string): Promise<PassWithWalletRaw | null> {
    const url = dl ? `/passes/w/${token}?dl=${encodeURIComponent(dl)}` : `/passes/w/${token}`
    try {
      return await apiClient.get<PassWithWalletRaw>(url)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  }

  async findByWalletId(walletId: string, page = 1): Promise<{ data: Pass[]; meta: PaginationMeta }> {
    return apiClient.get<{ data: Pass[]; meta: PaginationMeta }>(`/wallets/${walletId}/passes?page=${page}&limit=20`)
  }

  async findScanned(walletId: string, page = 1): Promise<{ data: Pass[]; meta: PaginationMeta }> {
    return apiClient.get<{ data: Pass[]; meta: PaginationMeta }>(`/wallets/${walletId}/passes/scanned?page=${page}&limit=20`)
  }

  async save(pass: Pass): Promise<Pass> {
    return apiClient.post<Pass>(`/wallets/${pass.walletId}/passes`, {
      firstName: pass.firstName,
      lastName: pass.lastName,
      phone: pass.phone,
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

  async applyAction(token: string, action: PassAction, options?: ApplyActionOptions): Promise<Pass> {
    const result = await apiClient.patch<{ pass: Pass; wallet: unknown }>(`/passes/${token}`, {
      action,
      ...(options?.amount !== undefined ? { amount: options.amount } : {}),
      ...(options?.purchaseAmount !== undefined ? { purchaseAmount: options.purchaseAmount } : {}),
      ...(options?.cashbackPercent !== undefined ? { cashbackPercent: options.cashbackPercent } : {}),
      ...(options?.description !== undefined ? { description: options.description } : {}),
    })
    return result.pass
  }

  async getTransactions(token: string): Promise<CashbackTransaction[]> {
    return apiClient.get<CashbackTransaction[]>(`/passes/${token}/transactions`)
  }

  async delete(token: string): Promise<void> {
    await apiClient.delete(`/passes/${token}`)
  }
}
