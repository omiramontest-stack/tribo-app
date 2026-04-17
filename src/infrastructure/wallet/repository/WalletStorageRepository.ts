import 'reflect-metadata'
import { inject, injectable } from 'inversify'

import persistenceTypes from '@/infrastructure/persistence/di/types'
import type { PersistenceRepository } from '@/infrastructure/persistence/repository/PersistenceRepository'
import type { WalletRepository } from '@/domain/wallet/repository/WalletRepository'
import type { Wallet } from '@/domain/wallet/entities/Wallet'

@injectable()
export class WalletStorageRepository implements WalletRepository {
  private readonly STORAGE_KEY = 'wallet_saas_wallets'

  constructor(
    @inject(persistenceTypes.localStorageManagerRepository)
    private readonly _storage: PersistenceRepository,
  ) {}

  async findAll(): Promise<Wallet[]> {
    return this._storage.getItem<Wallet[]>(this.STORAGE_KEY, [])
  }

  async findById(id: string): Promise<Wallet | null> {
    const wallets = await this.findAll()
    return wallets.find((w) => w.id === id) ?? null
  }

  async save(wallet: Wallet): Promise<Wallet> {
    const wallets = await this.findAll()
    const index = wallets.findIndex((w) => w.id === wallet.id)
    if (index >= 0) {
      wallets[index] = wallet
    } else {
      wallets.push(wallet)
    }
    this._storage.setItem(this.STORAGE_KEY, wallets)
    return wallet
  }

  async delete(id: string): Promise<void> {
    const wallets = await this.findAll()
    this._storage.setItem(
      this.STORAGE_KEY,
      wallets.filter((w) => w.id !== id),
    )
  }
}
