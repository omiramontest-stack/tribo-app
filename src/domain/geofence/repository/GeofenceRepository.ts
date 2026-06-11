import type { Geofence } from '../entities/Geofence'
import type { CreateGeofenceDto } from '@/application/geofence/dto/CreateGeofenceDto'
import type { UpdateGeofenceDto } from '@/application/geofence/dto/UpdateGeofenceDto'

export interface GeofenceRepository {
  findAll(orgId: string, walletId: string): Promise<Geofence[]>
  create(orgId: string, walletId: string, dto: CreateGeofenceDto): Promise<Geofence>
  update(orgId: string, walletId: string, id: string, dto: UpdateGeofenceDto): Promise<Geofence>
  delete(orgId: string, walletId: string, id: string): Promise<void>
}
