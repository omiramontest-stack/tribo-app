import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import walletTypes from '@/infrastructure/wallet/di/types'
import type { Wallet } from '@/domain/wallet/entities/Wallet'
import type { CreateWalletDto } from '@/application/wallet/dto/CreateWalletDto'
import type UseCase from '@/application/common/useCase/UseCase'

export const useWalletStore = defineStore('WalletStore', () => {
  const createWalletUseCase = container.get<UseCase<CreateWalletDto, Wallet>>(walletTypes.createWalletUseCase)
  const getWalletsUseCase = container.get<UseCase<void, Wallet[]>>(walletTypes.getWalletsUseCase)
  const getWalletByIdUseCase = container.get<UseCase<string, Wallet>>(walletTypes.getWalletByIdUseCase)
  const deleteWalletUseCase = container.get<UseCase<string, void>>(walletTypes.deleteWalletUseCase)

  const state = reactive<{ _wallets: Wallet[]; _currentWallet: Wallet | null }>({
    _wallets: [],
    _currentWallet: null,
  })

  const wallets = computed(() => state._wallets)
  const currentWallet = computed(() => state._currentWallet)

  async function fetchWallets() {
    state._wallets = await getWalletsUseCase.run()
  }

  async function fetchWalletById(id: string) {
    state._currentWallet = await getWalletByIdUseCase.run(id)
  }

  async function createWallet(dto: CreateWalletDto): Promise<Wallet> {
    const wallet = await createWalletUseCase.run(dto)
    state._wallets.push(wallet)
    return wallet
  }

  async function deleteWallet(id: string) {
    await deleteWalletUseCase.run(id)
    state._wallets = state._wallets.filter((w) => w.id !== id)
    if (state._currentWallet?.id === id) state._currentWallet = null
  }

  return { wallets, currentWallet, fetchWallets, fetchWalletById, createWallet, deleteWallet }
})
