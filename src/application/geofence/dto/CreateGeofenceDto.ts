export interface CreateGeofenceDto {
  label: string
  latitude: number
  longitude: number
  radiusMeters?: number
  message: string
}
