import 'reflect-metadata'
import { injectable } from 'inversify'

import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import { apiClient, ApiError } from '@/infrastructure/http/ApiClient'

@injectable()
export class WalletHttpRepository implements WalletRepository {
  async findAll(): Promise<Wallet[]> {
    return apiClient.get<Wallet[]>('/wallets')
  }

  async findById(id: string): Promise<Wallet | null> {
    try {
      return await apiClient.get<Wallet>(`/wallets/${id}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  }

  async save(wallet: Wallet): Promise<Wallet> {
    return apiClient.post<Wallet>('/wallets', wallet)
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/wallets/${id}`)
  }
}
