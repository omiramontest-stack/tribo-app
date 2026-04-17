import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import authTypes from '@/infrastructure/auth/di/types'
import type { AuthRepository } from '@/domain/auth/repository/AuthRepository'
import type { Admin } from '@/domain/auth/entities/Admin'
import type UseCase from '@/application/common/useCase/UseCase'
import type { LoginDto } from '@/application/auth/useCase/LoginUseCase'

export const useAuthStore = defineStore('AuthStore', () => {
  const loginUseCase = container.get<UseCase<LoginDto, Admin>>(authTypes.loginUseCase)
  const logoutUseCase = container.get<UseCase<void, void>>(authTypes.logoutUseCase)
  const authRepository = container.get<AuthRepository>(authTypes.authRepository)

  const state = reactive<{ _admin: Admin | null }>({
    _admin: authRepository.getCurrentAdmin(),
  })

  const isAuthenticated = computed(() => !!state._admin)
  const admin = computed(() => state._admin)

  async function login(email: string, password: string) {
    const result = await loginUseCase.run({ email, password })
    state._admin = result
  }

  async function logout() {
    await logoutUseCase.run()
    state._admin = null
  }

  return { admin, isAuthenticated, login, logout }
})
