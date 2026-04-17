import 'reflect-metadata'
import { inject, injectable } from 'inversify'

import persistenceTypes from '@/infrastructure/persistence/di/types'
import type { PersistenceRepository } from '@/infrastructure/persistence/repository/PersistenceRepository'
import type { PassRepository } from '@/domain/pass/repository/PassRepository'
import type { Pass } from '@/domain/pass/entities/Pass'

@injectable()
export class PassStorageRepository implements PassRepository {
  private readonly STORAGE_KEY = 'wallet_saas_passes'

  constructor(
    @inject(persistenceTypes.localStorageManagerRepository)
    private readonly _storage: PersistenceRepository,
  ) {}

  async findByToken(token: string): Promise<Pass | null> {
    const passes = this._storage.getItem<Pass[]>(this.STORAGE_KEY, [])
    return passes.find((p) => p.token === token) ?? null
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
}
