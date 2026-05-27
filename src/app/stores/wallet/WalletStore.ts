import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import walletTypes from '@/infrastructure/wallet/di/types'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { CreateWalletDto } from '@/application/wallet/dto/CreateWalletDto'
import type { UpdateWalletDto } from '@/application/wallet/dto/UpdateWalletDto'
import type { CreateWalletInput } from '@/application/wallet/useCase/CreateWalletUseCase'
import type { UpdateWalletInput } from '@/application/wallet/useCase/UpdateWalletUseCase'
import type { GetWalletByIdInput } from '@/application/wallet/useCase/GetWalletByIdUseCase'
import type { DeleteWalletInput } from '@/application/wallet/useCase/DeleteWalletUseCase'
import type UseCase from '@/application/common/useCase/UseCase'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'

export const useWalletStore = defineStore('WalletStore', () => {
  const orgStore = useOrganizationStore()

  const createWalletUseCase = container.get<UseCase<CreateWalletInput, Wallet>>(walletTypes.createWalletUseCase)
  const updateWalletUseCase = container.get<UseCase<UpdateWalletInput, Wallet>>(walletTypes.updateWalletUseCase)
  const getWalletsUseCase = container.get<UseCase<string, Wallet[]>>(walletTypes.getWalletsUseCase)
  const getWalletByIdUseCase = container.get<UseCase<GetWalletByIdInput, Wallet>>(walletTypes.getWalletByIdUseCase)
  const deleteWalletUseCase = container.get<UseCase<DeleteWalletInput, void>>(walletTypes.deleteWalletUseCase)

  const state = reactive<{ _wallets: Wallet[]; _currentWallet: Wallet | null }>({
    _wallets: [],
    _currentWallet: null,
  })

  const wallets = computed(() => state._wallets)
  const currentWallet = computed(() => state._currentWallet)

  function requireOrgId(): string {
    const id = orgStore.activeOrgId
    if (!id) throw new Error('No active organization')
    return id
  }

  async function fetchWallets() {
    state._wallets = (await getWalletsUseCase.run(requireOrgId())) ?? []
  }

  async function fetchWalletById(id: string) {
    state._currentWallet = await getWalletByIdUseCase.run({ orgId: requireOrgId(), id })
  }

  async function createWallet(dto: CreateWalletDto): Promise<Wallet> {
    const wallet = await createWalletUseCase.run({ ...dto, orgId: requireOrgId() })
    state._wallets.push(wallet)
    return wallet
  }

  async function updateWallet(id: string, dto: UpdateWalletDto): Promise<Wallet> {
    const updated = await updateWalletUseCase.run({ ...dto, orgId: requireOrgId(), id })
    // Keep the lists in sync with the server response
    const idx = state._wallets.findIndex((w) => w.id === id)
    if (idx >= 0) state._wallets[idx] = updated
    if (state._currentWallet?.id === id) state._currentWallet = updated
    return updated
  }

  async function deleteWallet(id: string) {
    await deleteWalletUseCase.run({ orgId: requireOrgId(), id })
    state._wallets = state._wallets.filter((w) => w.id !== id)
    if (state._currentWallet?.id === id) state._currentWallet = null
  }

  function clearWallets() {
    state._wallets = []
  }

  return {
    wallets,
    currentWallet,
    fetchWallets,
    fetchWalletById,
    createWallet,
    updateWallet,
    deleteWallet,
    clearWallets,
  }
})
