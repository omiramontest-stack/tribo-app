import type { GeofenceWindow } from '@/domain/geofence/entities/Geofence'

export interface CreateGeofenceDto {
  label: string
  latitude: number
  longitude: number
  radiusMeters?: number
  message: string
  scheduleEnabled?: boolean
  schedule?: GeofenceWindow[]
  timezone?: string
}
