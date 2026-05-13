import 'reflect-metadata'
import { injectable } from 'inversify'

import type { AuthRepository, RegisterDto, ChangeEmailDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from '@/domain/auth/repository/AuthRepository'

import type { Admin } from '@/domain/auth/entities/Admin'
import { apiClient } from '@/infrastructure/http/ApiClient'

interface LoginResponse {
  admin: Admin
  accessToken: string
}

interface RegisterResponse {
  admin: Admin
  accessToken: string
}

interface MeResponse {
  admin: { adminId: string; email: string; emailVerified?: boolean }
}

interface TokenResponse {
  ok: boolean
  accessToken: string
}

@injectable()
export class AuthHttpRepository implements AuthRepository {
  private _admin: Admin | null = null

  async login(email: string, password: string): Promise<Admin | null> {
    try {
      const { admin, accessToken } = await apiClient.post<LoginResponse>('/auth/login', { email, password })
      apiClient.setToken(accessToken)
      this._admin = admin
      return admin
    } catch {
      return null
    }
  }

  async register(dto: RegisterDto): Promise<Admin> {
    const { admin, accessToken } = await apiClient.post<RegisterResponse>('/auth/register', dto)
    apiClient.setToken(accessToken)
    this._admin = admin
    return admin
  }

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
    apiClient.clearToken()
    this._admin = null
  }

  getCurrentAdmin(): Admin | null {
    return this._admin
  }

  async checkSession(): Promise<Admin | null> {
    try {
      const { admin: payload } = await apiClient.get<MeResponse>('/auth/me')
      this._admin = { id: payload.adminId, email: payload.email, emailVerified: payload.emailVerified }
      return this._admin
    } catch {
      this._admin = null
      return null
    }
  }

  async switchOrg(organizationId: string): Promise<void> {
    const { accessToken } = await apiClient.post<TokenResponse>('/auth/switch-org', { organizationId })
    apiClient.setToken(accessToken)
  }

  async verifyEmail(token: string): Promise<void> {
    const { accessToken } = await apiClient.post<TokenResponse>(`/auth/verify-email/${token}`)
    apiClient.setToken(accessToken)
  }

  async resendVerification(): Promise<void> {
    await apiClient.post('/auth/resend-verification')
  }

  async changeEmail(dto: ChangeEmailDto): Promise<void> {
    await apiClient.patch('/auth/email', { newEmail: dto.newEmail })
  }

  async confirmEmailChange(token: string): Promise<void> {
    const { accessToken } = await apiClient.post<TokenResponse>(`/auth/confirm-email-change/${token}`)
    apiClient.setToken(accessToken)
  }

  async changePassword(dto: ChangePasswordDto): Promise<void> {
    await apiClient.patch('/auth/password', {
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    })
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email: dto.email })
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    await apiClient.post(`/auth/reset-password/${dto.token}`, { newPassword: dto.newPassword })
  }
}
