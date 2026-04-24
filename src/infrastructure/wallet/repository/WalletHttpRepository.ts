import 'reflect-metadata'
import { injectable } from 'inversify'

import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import { apiClient, ApiError } from '@/infrastructure/http/ApiClient'

@injectable()
export class WalletHttpRepository implements WalletRepository {
  async findAll(orgId: string): Promise<Wallet[]> {
    return apiClient.get<Wallet[]>(`/organizations/${orgId}/wallets`)
  }

  async findById(orgId: string, id: string): Promise<Wallet | null> {
    try {
      return await apiClient.get<Wallet>(`/organizations/${orgId}/wallets/${id}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  }

  async save(orgId: string, wallet: Wallet): Promise<Wallet> {
    return apiClient.post<Wallet>(`/organizations/${orgId}/wallets`, wallet)
  }

  async delete(orgId: string, id: string): Promise<void> {
    await apiClient.delete(`/organizations/${orgId}/wallets/${id}`)
  }
}
