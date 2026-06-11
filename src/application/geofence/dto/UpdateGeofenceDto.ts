import type { GeofenceWindow } from '@/domain/geofence/entities/Geofence'

export interface UpdateGeofenceDto {
  label?: string
  latitude?: number
  longitude?: number
  radiusMeters?: number
  message?: string
  isActive?: boolean
  scheduleEnabled?: boolean
  schedule?: GeofenceWindow[]
  timezone?: string
}
