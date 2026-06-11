import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import geofenceTypes from '@/infrastructure/geofence/di/types'
import { useOrganizationStore } from '@/app/stores/organization/OrganizationStore'
import type { Geofence } from '@/domain/geofence/entities/Geofence'
import type { CreateGeofenceDto } from '@/application/geofence/dto/CreateGeofenceDto'
import type { UpdateGeofenceDto } from '@/application/geofence/dto/UpdateGeofenceDto'
import type { GetGeofencesInput } from '@/application/geofence/useCase/GetGeofencesUseCase'
import type { CreateGeofenceInput } from '@/application/geofence/useCase/CreateGeofenceUseCase'
import type { UpdateGeofenceInput } from '@/application/geofence/useCase/UpdateGeofenceUseCase'
import type { DeleteGeofenceInput } from '@/application/geofence/useCase/DeleteGeofenceUseCase'
import type UseCase from '@/application/common/useCase/UseCase'

export const useGeofenceStore = defineStore('GeofenceStore', () => {
  const orgStore = useOrganizationStore()

  const getGeofencesUseCase   = container.get<UseCase<GetGeofencesInput, Geofence[]>>(geofenceTypes.getGeofencesUseCase)
  const createGeofenceUseCase = container.get<UseCase<CreateGeofenceInput, Geofence>>(geofenceTypes.createGeofenceUseCase)
  const updateGeofenceUseCase = container.get<UseCase<UpdateGeofenceInput, Geofence>>(geofenceTypes.updateGeofenceUseCase)
  const deleteGeofenceUseCase = container.get<UseCase<DeleteGeofenceInput, void>>(geofenceTypes.deleteGeofenceUseCase)

  const state = reactive<{
    _geofences: Geofence[]
    _loading: boolean
  }>({
    _geofences: [],
    _loading: false,
  })

  const geofences = computed(() => state._geofences)
  const loading   = computed(() => state._loading)

  function requireOrgId(): string {
    const id = orgStore.activeOrgId
    if (!id) throw new Error('No active organization')
    return id
  }

  async function fetchGeofences(walletId: string): Promise<void> {
    state._loading = true
    try {
      state._geofences = await getGeofencesUseCase.run({ orgId: requireOrgId(), walletId })
    } finally {
      state._loading = false
    }
  }

  async function createGeofence(walletId: string, dto: CreateGeofenceDto): Promise<Geofence> {
    const created = await createGeofenceUseCase.run({ ...dto, orgId: requireOrgId(), walletId })
    state._geofences.push(created)
    return created
  }

  async function updateGeofence(walletId: string, id: string, dto: UpdateGeofenceDto): Promise<Geofence> {
    const updated = await updateGeofenceUseCase.run({ ...dto, orgId: requireOrgId(), walletId, id })
    const idx = state._geofences.findIndex(g => g.id === id)
    if (idx >= 0) state._geofences[idx] = updated
    return updated
  }

  async function deleteGeofence(walletId: string, id: string): Promise<void> {
    await deleteGeofenceUseCase.run({ orgId: requireOrgId(), walletId, id })
    state._geofences = state._geofences.filter(g => g.id !== id)
  }

  return {
    geofences,
    loading,
    fetchGeofences,
    createGeofence,
    updateGeofence,
    deleteGeofence,
  }
})
