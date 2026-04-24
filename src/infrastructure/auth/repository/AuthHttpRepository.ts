import 'reflect-metadata'
import { injectable } from 'inversify'

import type { AuthRepository, RegisterDto } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'
import { apiClient } from '@/infrastructure/http/ApiClient'

interface RegisterResponse {
  admin: Admin
}

interface LoginResponse {
  admin: Admin
}

interface MeResponse {
  admin: { adminId: string; email: string }
}

@injectable()
export class AuthHttpRepository implements AuthRepository {
  private _admin: Admin | null = null

  async login(email: string, password: string): Promise<Admin | null> {
    try {
      const { admin } = await apiClient.post<LoginResponse>('/auth/login', { email, password })
      this._admin = admin
      return admin
    } catch {
      return null
    }
  }

  async register(dto: RegisterDto): Promise<Admin> {
    const { admin } = await apiClient.post<RegisterResponse>('/auth/register', dto)
    this._admin = admin
    return this._admin
  }

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
    this._admin = null
  }

  getCurrentAdmin(): Admin | null {
    return this._admin
  }

  async checkSession(): Promise<Admin | null> {
    try {
      const { admin: payload } = await apiClient.get<MeResponse>('/auth/me')
      this._admin = { id: payload.adminId, email: payload.email }
      return this._admin
    } catch {
      this._admin = null
      return null
    }
  }

  async switchOrg(organizationId: string): Promise<void> {
    await apiClient.post('/auth/switch-org', { organizationId })
  }
}
