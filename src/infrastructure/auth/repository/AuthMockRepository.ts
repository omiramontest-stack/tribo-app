import 'reflect-metadata'
import { inject, injectable } from 'inversify'

import persistenceTypes from '@/infrastructure/persistence/di/types'
import type { PersistenceRepository } from '@/infrastructure/persistence/repository/PersistenceRepository'
import type { AuthRepository } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'

@injectable()
export class AuthMockRepository implements AuthRepository {
  private readonly STORAGE_KEY = 'wallet_saas_auth'
  private readonly HARDCODED_EMAIL = 'admin@wallet.com'
  private readonly HARDCODED_PASSWORD = 'admin123'
  private readonly HARDCODED_ADMIN: Admin = {
    id: '1',
    email: 'admin@wallet.com',
    businessName: 'Demo Business',
  }

  constructor(
    @inject(persistenceTypes.localStorageManagerRepository)
    private readonly _storage: PersistenceRepository,
  ) {}

  async login(email: string, password: string): Promise<Admin | null> {
    if (email === this.HARDCODED_EMAIL && password === this.HARDCODED_PASSWORD) {
      this._storage.setItem(this.STORAGE_KEY, this.HARDCODED_ADMIN)
      return this.HARDCODED_ADMIN
    }
    return null
  }

  async logout(): Promise<void> {
    this._storage.removeItem(this.STORAGE_KEY)
  }

  getCurrentAdmin(): Admin | null {
    return this._storage.getItem<Admin | null>(this.STORAGE_KEY, null)
  }

  async checkSession(): Promise<Admin | null> {
    return this.getCurrentAdmin()
  }
}
