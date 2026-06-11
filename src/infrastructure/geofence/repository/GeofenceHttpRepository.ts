import 'reflect-metadata'
import { injectable } from 'inversify'

import { apiClient } from '@/infrastructure/http/ApiClient'
import type { GeofenceRepository } from '@/domain/geofence/repository/GeofenceRepository'
import type { Geofence } from '@/domain/geofence/entities/Geofence'
import type { CreateGeofenceDto } from '@/application/geofence/dto/CreateGeofenceDto'
import type { UpdateGeofenceDto } from '@/application/geofence/dto/UpdateGeofenceDto'

@injectable()
export class GeofenceHttpRepository implements GeofenceRepository {
  async findAll(orgId: string, walletId: string): Promise<Geofence[]> {
    return apiClient.get<Geofence[]>(`/organizations/${orgId}/wallets/${walletId}/geofences`)
  }

  async create(orgId: string, walletId: string, dto: CreateGeofenceDto): Promise<Geofence> {
    return apiClient.post<Geofence>(`/organizations/${orgId}/wallets/${walletId}/geofences`, dto)
  }

  async update(orgId: string, walletId: string, id: string, dto: UpdateGeofenceDto): Promise<Geofence> {
    return apiClient.patch<Geofence>(`/organizations/${orgId}/wallets/${walletId}/geofences/${id}`, dto)
  }

  async delete(orgId: string, walletId: string, id: string): Promise<void> {
    await apiClient.delete(`/organizations/${orgId}/wallets/${walletId}/geofences/${id}`)
  }
}
