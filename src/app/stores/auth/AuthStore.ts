import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'
import type { Organization } from '@/domain/organization/entities/Organization'
import type UseCase from '@/application/common/useCase/UseCase'
import type { LoginDto } from '@/application/auth/useCase/LoginUseCase'
import type { RegisterDto } from '@/domain/auth/repository/AuthRepository'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

export const useAuthStore = defineStore('AuthStore', () => {
  const loginUseCase = container.get<UseCase<LoginDto, Admin>>(authTypes.loginUseCase)
  const logoutUseCase = container.get<UseCase<void, void>>(authTypes.logoutUseCase)
  const registerUseCase = container.get<UseCase<RegisterDto, Admin>>(authTypes.registerUseCase)
  const authRepository = container.get<AuthRepository>(authTypes.authRepository)

  const state = reactive<{ _admin: Admin | null }>({
    _admin: authRepository.getCurrentAdmin(),
  })

  const isAuthenticated = computed(() => !!state._admin)
  const admin = computed(() => state._admin)

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
    await logoutUseCase.run()
    state._admin = null
    useOrganizationStore().reset()
  }

  return { admin, isAuthenticated, init, login, register, logout, switchOrg }
})
