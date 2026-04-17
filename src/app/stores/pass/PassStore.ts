import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import passTypes from '@/infrastructure/pass/di/types'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { GeneratePassDto } from '@/application/pass/dto/GeneratePassDto'
import type { UpdatePassDataDto } from '@/application/pass/dto/UpdatePassDataDto'
import type { PassWithWallet } from '@/application/pass/useCase/GetPassByTokenUseCase'
import type UseCase from '@/application/common/useCase/UseCase'

export const usePassStore = defineStore('PassStore', () => {
  const generatePassUseCase = container.get<UseCase<GeneratePassDto, Pass>>(passTypes.generatePassUseCase)
  const getPassByTokenUseCase = container.get<UseCase<string, PassWithWallet>>(passTypes.getPassByTokenUseCase)
  const getPassesByWalletUseCase = container.get<UseCase<string, Pass[]>>(passTypes.getPassesByWalletUseCase)
  const updatePassDataUseCase = container.get<UseCase<UpdatePassDataDto, PassWithWallet>>(passTypes.updatePassDataUseCase)

  const state = reactive<{
    _passes: Pass[]
    _currentPass: Pass | null
    _currentPassWallet: Wallet | null
  }>({
    _passes: [],
    _currentPass: null,
    _currentPassWallet: null,
  })

  const passes = computed(() => state._passes)
  const currentPass = computed(() => state._currentPass)
  const currentPassWallet = computed(() => state._currentPassWallet)

  async function generatePass(dto: GeneratePassDto): Promise<Pass> {
    const pass = await generatePassUseCase.run(dto)
    state._passes.push(pass)
    return pass
  }

  async function fetchPassesByWallet(walletId: string) {
    state._passes = await getPassesByWalletUseCase.run(walletId)
  }

  async function fetchPassByToken(token: string) {
    const result = await getPassByTokenUseCase.run(token)
    state._currentPass = result.pass
    state._currentPassWallet = result.wallet
  }

  async function updatePassData(dto: UpdatePassDataDto): Promise<PassWithWallet> {
    const result = await updatePassDataUseCase.run(dto)
    state._currentPass = result.pass
    state._currentPassWallet = result.wallet
    return result
  }

  return {
    passes,
    currentPass,
    currentPassWallet,
    generatePass,
    fetchPassesByWallet,
    fetchPassByToken,
    updatePassData,
  }
})
