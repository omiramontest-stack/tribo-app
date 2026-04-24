import 'reflect-metadata'
import { inject, injectable } from 'inversify'

import persistenceTypes from '@/infrastructure/persistence/di/types'
import type { PersistenceRepository } from '@/infrastructure/persistence/repository/PersistenceRepository'
import type { PassRepository, PassAction, PassWithWalletRaw } from '@/domain/pass/repository/PassRepository'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { StampsData, PointsData, MembershipData } from '@/domain/pass/entities/PassData'

@injectable()
export class PassStorageRepository implements PassRepository {
  private readonly STORAGE_KEY = 'wallet_saas_passes'

  constructor(
    @inject(persistenceTypes.localStorageManagerRepository)
    private readonly _storage: PersistenceRepository,
  ) {}

  async findByToken(token: string): Promise<PassWithWalletRaw | null> {
    // Storage mock doesn't have wallet data — not used in production
    return null
  }

  async findByWalletId(walletId: string): Promise<Pass[]> {
    const passes = this._storage.getItem<Pass[]>(this.STORAGE_KEY, [])
    return passes.filter((p) => p.walletId === walletId)
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

  async applyAction(token: string, action: PassAction, amount?: number): Promise<Pass> {
    const passes = this._storage.getItem<Pass[]>(this.STORAGE_KEY, [])
    const pass = passes.find((p) => p.token === token)
    if (!pass) throw new Error('Pass not found')

    if (action === 'add_stamp' && pass.data.type === 'stamps') {
      (pass.data as StampsData).currentStamps += 1
    } else if (action === 'add_points' && pass.data.type === 'points') {
      (pass.data as PointsData).currentPoints += amount ?? 1
    } else if (action === 'renew_membership' && pass.data.type === 'membership') {
      (pass.data as MembershipData).expiresAt = new Date(Date.now() + 30 * 86400000).toISOString()
    }

    this._storage.setItem(this.STORAGE_KEY, passes)
    return pass
  }

  async delete(token: string): Promise<void> {
    const passes = this._storage.getItem<Pass[]>(this.STORAGE_KEY, [])
    this._storage.setItem(this.STORAGE_KEY, passes.filter((p) => p.token !== token))
  }
}
