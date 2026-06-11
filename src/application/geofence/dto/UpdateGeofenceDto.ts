export interface UpdateGeofenceDto {
  label?: string
  latitude?: number
  longitude?: number
  radiusMeters?: number
  message?: string
  isActive?: boolean
}
