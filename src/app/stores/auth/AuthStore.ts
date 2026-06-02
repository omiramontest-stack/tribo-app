import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository, ChangeEmailDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'
import type { Organization } from '@/domain/organization/entities/Organization'
import type UseCase from '@/application/common/useCase/UseCase'
import type { LoginDto } from '@/application/auth/useCase/LoginUseCase'
import type { RegisterDto } from '@/domain/auth/repository/AuthRepository'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

export const useAuthStore = defineStore('AuthStore', () => {
  const exchangeGoogleSessionUseCase = container.get<UseCase<string, Admin>>(authTypes.exchangeGoogleSessionUseCase)
  const loginUseCase = container.get<UseCase<LoginDto, Admin>>(authTypes.loginUseCase)
  const logoutUseCase = container.get<UseCase<void, void>>(authTypes.logoutUseCase)
  const registerUseCase = container.get<UseCase<RegisterDto, Admin>>(authTypes.registerUseCase)
  const changeEmailUseCase = container.get<UseCase<ChangeEmailDto, void>>(authTypes.changeEmailUseCase)
  const confirmEmailChangeUseCase = container.get<UseCase<string, void>>(authTypes.confirmEmailChangeUseCase)
  const changePasswordUseCase = container.get<UseCase<ChangePasswordDto, void>>(authTypes.changePasswordUseCase)
  const forgotPasswordUseCase = container.get<UseCase<ForgotPasswordDto, void>>(authTypes.forgotPasswordUseCase)
  const resetPasswordUseCase = container.get<UseCase<ResetPasswordDto, void>>(authTypes.resetPasswordUseCase)
  const authRepository = container.get<AuthRepository>(authTypes.authRepository)

  const state = reactive<{ _admin: Admin | null }>({
    _admin: authRepository.getCurrentAdmin(),
  })

  const isAuthenticated = computed(() => !!state._admin)
  const admin = computed(() => state._admin)
  const emailVerified = computed(() => state._admin?.emailVerified)

  async function init() {
    try {
      state._admin = await authRepository.checkSession()
    } catch {
      state._admin = null
    }
  }

  async function login(email: string, password: string) {
    const result = await loginUseCase.run({ email, password })
    state._admin = result
  }

  async function register(dto: RegisterDto) {
    const result = await registerUseCase.run(dto)
    state._admin = result
  }

  async function switchOrg(org: Organization) {
    await authRepository.switchOrg(org.id)
    useOrganizationStore().setActiveOrg(org)
  }

  async function logout() {
    try { await logoutUseCase.run() } catch { /* clear local state regardless */ }
    state._admin = null
    useOrganizationStore().reset()
  }

  async function verifyEmail(token: string) {
    await authRepository.verifyEmail(token)
    state._admin = await authRepository.checkSession()
  }

  async function resendVerification() {
    await authRepository.resendVerification()
  }

  async function changeEmail(newEmail: string) {
    await changeEmailUseCase.run({ newEmail })
  }

  async function confirmEmailChange(token: string) {
    await confirmEmailChangeUseCase.run(token)
    state._admin = await authRepository.checkSession()
  }

  async function changePassword(newPassword: string, currentPassword?: string) {
    await changePasswordUseCase.run({ newPassword, currentPassword })
  }

  async function forgotPassword(email: string): Promise<void> {
    await forgotPasswordUseCase.run({ email })
  }

  async function resetPassword(token: string, newPassword: string): Promise<void> {
    await resetPasswordUseCase.run({ token, newPassword })
  }

  async function exchangeGoogleSession(code: string): Promise<void> {
    state._admin = await exchangeGoogleSessionUseCase.run(code)
  }

  return { admin, emailVerified, isAuthenticated, init, login, register, logout, switchOrg, verifyEmail, resendVerification, changeEmail, confirmEmailChange, changePassword, forgotPassword, resetPassword, exchangeGoogleSession }
})
