import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import tierTypes from '@/infrastructure/tier/di/types'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import type { WalletTier } from '@/domain/wallet/entities/WalletTier'
import type { CreateTierDto } from '@/application/wallet/dto/CreateTierDto'
import type { UpdateTierDto } from '@/application/wallet/dto/UpdateTierDto'
import type { FetchTiersInput } from '@/application/wallet/useCase/FetchTiersUseCase'
import type { CreateTierInput } from '@/application/wallet/useCase/CreateTierUseCase'
import type { UpdateTierInput } from '@/application/wallet/useCase/UpdateTierUseCase'
import type { DeleteTierInput } from '@/application/wallet/useCase/DeleteTierUseCase'
import type UseCase from '@/application/common/useCase/UseCase'

export const useTierStore = defineStore('TierStore', () => {
  const orgStore = useOrganizationStore()

  const fetchTiersUseCase  = container.get<UseCase<FetchTiersInput, WalletTier[]>>(tierTypes.fetchTiersUseCase)
  const createTierUseCase  = container.get<UseCase<CreateTierInput, WalletTier>>(tierTypes.createTierUseCase)
  const updateTierUseCase  = container.get<UseCase<UpdateTierInput, WalletTier>>(tierTypes.updateTierUseCase)
  const deleteTierUseCase  = container.get<UseCase<DeleteTierInput, void>>(tierTypes.deleteTierUseCase)

  const state = reactive<{ _tiers: WalletTier[]; _walletId: string | null }>({
    _tiers: [],
    _walletId: null,
  })

  const tiers    = computed(() => [...state._tiers].sort((a, b) => a.level - b.level))
  const maxLevel = computed(() => tiers.value.reduce((m, t) => Math.max(m, t.level), 1))

  function requireOrgId(): string {
    const id = orgStore.activeOrgId
    if (!id) throw new Error('No active organization')
    return id
  }

  async function fetchTiers(walletId: string): Promise<void> {
    state._walletId = walletId
    state._tiers = await fetchTiersUseCase.run({ orgId: requireOrgId(), walletId })
  }

  async function createTier(walletId: string, dto: CreateTierDto): Promise<WalletTier> {
    const tier = await createTierUseCase.run({ ...dto, orgId: requireOrgId(), walletId })
    state._tiers.push(tier)
    return tier
  }

  async function updateTier(walletId: string, tierId: string, dto: UpdateTierDto): Promise<WalletTier> {
    const updated = await updateTierUseCase.run({ ...dto, orgId: requireOrgId(), walletId, tierId })
    const idx = state._tiers.findIndex(t => t.id === tierId)
    if (idx >= 0) state._tiers[idx] = updated
    return updated
  }

  async function deleteTier(walletId: string, tierId: string): Promise<void> {
    await deleteTierUseCase.run({ orgId: requireOrgId(), walletId, tierId })
    state._tiers = state._tiers.filter(t => t.id !== tierId)
  }

  function clearTiers(): void {
    state._tiers = []
    state._walletId = null
  }

  return {
    tiers,
    maxLevel,
    fetchTiers,
    createTier,
    updateTier,
    deleteTier,
    clearTiers,
  }
})
