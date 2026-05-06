import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import passTypes from '@/infrastructure/pass/di/types'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import type { Pass } from '@/domain/pass/entities/Pass'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { GeneratePassDto } from '@/application/pass/dto/GeneratePassDto'
import type { UpdatePassDataDto } from '@/application/pass/dto/UpdatePassDataDto'
import type { PassWithWallet } from '@/application/pass/useCase/GetPassByTokenUseCase'
import type UseCase from '@/application/common/useCase/UseCase'
import type { PassRepository, CashbackTransaction } from '@/domain/pass/repository/PassRepository'

export const usePassStore = defineStore('PassStore', () => {
  const orgStore = useOrganizationStore()
  const generatePassUseCase = container.get<UseCase<GeneratePassDto, Pass>>(passTypes.generatePassUseCase)
  const getPassByTokenUseCase = container.get<UseCase<string, PassWithWallet>>(passTypes.getPassByTokenUseCase)
  const getPassesByWalletUseCase = container.get<UseCase<string, Pass[]>>(passTypes.getPassesByWalletUseCase)
  const updatePassDataUseCase = container.get<UseCase<UpdatePassDataDto, PassWithWallet>>(passTypes.updatePassDataUseCase)
  const deletePassUseCase = container.get<UseCase<string, void>>(passTypes.deletePassUseCase)
  const passRepository = container.get<PassRepository>(passTypes.passRepository)

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

  async function generatePass(dto: Omit<GeneratePassDto, 'orgId'>): Promise<Pass> {
    const orgId = orgStore.activeOrgId
    if (!orgId) throw new Error('No active organization')
    const pass = await generatePassUseCase.run({ ...dto, orgId })
    state._passes.push(pass)
    return pass
  }

  async function fetchPassesByWallet(walletId: string) {
    state._passes = await getPassesByWalletUseCase.run(walletId)
  }

  async function fetchPassByToken(token: string, dl?: string) {
    if (dl) {
      const result = await passRepository.findByToken(token, dl)
      if (!result) throw new Error('NOT_FOUND')
      state._currentPass = result.pass
      state._currentPassWallet = result.wallet
    } else {
      const result = await getPassByTokenUseCase.run(token)
      state._currentPass = result.pass
      state._currentPassWallet = result.wallet
    }
  }

  async function updatePassData(dto: Omit<UpdatePassDataDto, 'orgId'>): Promise<PassWithWallet> {
    const orgId = orgStore.activeOrgId
    if (!orgId) throw new Error('No active organization')
    const result = await updatePassDataUseCase.run({ ...dto, orgId })
    state._currentPass = result.pass
    state._currentPassWallet = result.wallet
    return result
  }

  async function deletePass(token: string) {
    await deletePassUseCase.run(token)
    state._passes = state._passes.filter((p) => p.token !== token)
  }

  async function fetchTransactions(token: string): Promise<CashbackTransaction[]> {
    return passRepository.getTransactions(token)
  }

  async function fetchScannedPasses(walletId: string): Promise<Pass[]> {
    return passRepository.findScanned(walletId)
  }

  async function sendLink(token: string): Promise<void> {
    const { apiClient } = await import('@/infrastructure/http/ApiClient')
    await apiClient.post(`/passes/${token}/send-link`)
  }

  return {
    passes,
    currentPass,
    currentPassWallet,
    generatePass,
    fetchPassesByWallet,
    fetchPassByToken,
    updatePassData,
    deletePass,
    fetchTransactions,
    fetchScannedPasses,
    sendLink,
  }
})
