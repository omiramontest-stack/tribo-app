import 'reflect-metadata'
import { inject, injectable } from 'inversify'

import persistenceTypes from '@/infrastructure/persistence/di/types'
import type { PersistenceRepository } from '@/infrastructure/persistence/repository/PersistenceRepository'
import type { PassRepository, PassAction, PassWithWalletRaw, CashbackTransaction, PaginationMeta } from '@/domain/pass/repository/PassRepository'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { StampsData, PointsData, MembershipData, CashbackData } from '@/domain/pass/entities/PassData'

@injectable()
export class PassStorageRepository implements PassRepository {
  private readonly STORAGE_KEY = 'wallet_saas_passes'

  constructor(
    @inject(persistenceTypes.localStorageManagerRepository)
    private readonly _storage: PersistenceRepository,
  ) {}

  async findByToken(_token: string): Promise<PassWithWalletRaw | null> {
    // Storage mock doesn't have wallet data — not used in production
    return null
  }

  async findByWalletId(walletId: string, _page = 1, _search = '', _status = 'active'): Promise<{ data: Pass[]; meta: PaginationMeta }> {
    const passes = this._storage.getItem<Pass[]>(this.STORAGE_KEY, [])
    const data = passes.filter((p) => p.walletId === walletId)
    return { data, meta: { total: data.length, page: 1, limit: 20, totalPages: 1 } }
  }

  async findScanned(_walletId: string, _page = 1): Promise<{ data: Pass[]; meta: PaginationMeta }> {
    return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } }
  }

  async save(pass: Pass): Promise<Pass> {
    const passes = this._storage.getItem<Pass[]>(this.STORAGE_KEY, [])
    passes.push(pass)
    this._storage.setItem(this.STORAGE_KEY, passes)
    return pass
  }

  async update(pass: Pass): Promise<Pass> {
    const passes = this._storage.getItem<Pass[]>(this.STORAGE_KEY, [])
    const index = passes.findIndex((p) => p.id === pass.id)
    if (index >= 0) passes[index] = pass
    this._storage.setItem(this.STORAGE_KEY, passes)
    return pass
  }

  async applyAction(token: string, action: PassAction, options?: { amount?: number; purchaseAmount?: number; cashbackPercent?: number; description?: string }): Promise<Pass> {
    const passes = this._storage.getItem<Pass[]>(this.STORAGE_KEY, [])
    const pass = passes.find((p) => p.token === token)
    if (!pass) throw new Error('Pass not found')

    if (action === 'add_stamp' && pass.data.type === 'stamps') {
      (pass.data as StampsData).currentStamps += 1
    } else if (action === 'add_points' && pass.data.type === 'points') {
      (pass.data as PointsData).currentPoints += options?.amount ?? 1
    } else if (action === 'renew_membership' && pass.data.type === 'membership') {
      (pass.data as MembershipData).expiresAt = new Date(Date.now() + 30 * 86400000).toISOString()
    } else if ((action === 'add_cashback' || action === 'subtract_cashback') && pass.data.type === 'cashback') {
      const pct = options?.cashbackPercent ?? 0
      const amt = ((options?.purchaseAmount ?? 0) * pct) / 100
      if (action === 'add_cashback') {
        (pass.data as CashbackData).balance += amt
      } else {
        (pass.data as CashbackData).balance = Math.max(0, (pass.data as CashbackData).balance - amt)
      }
    }

    this._storage.setItem(this.STORAGE_KEY, passes)
    return pass
  }

  async getTransactions(_token: string): Promise<CashbackTransaction[]> {
    return []
  }

  async delete(token: string): Promise<void> {
    const passes = this._storage.getItem<Pass[]>(this.STORAGE_KEY, [])
    this._storage.setItem(this.STORAGE_KEY, passes.filter((p) => p.token !== token))
  }

  async renew(_token: string): Promise<Pass> {
    throw new Error('renew not supported in storage repository')
  }

  async unarchive(_token: string): Promise<Pass> {
    throw new Error('unarchive not supported in storage repository')
  }
}
