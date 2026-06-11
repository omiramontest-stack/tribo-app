export interface Geofence {
  id: string
  walletId: string
  label: string
  latitude: number
  longitude: number
  radiusMeters: number
  message: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
