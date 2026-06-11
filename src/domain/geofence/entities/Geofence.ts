export interface GeofenceWindow {
  days: number[]      // 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
  startTime: string   // "HH:mm"
  endTime: string     // "HH:mm", must be > startTime
}

export interface Geofence {
  id: string
  walletId: string
  label: string
  latitude: number
  longitude: number
  radiusMeters: number
  message: string
  isActive: boolean
  scheduleEnabled: boolean
  schedule: GeofenceWindow[]
  timezone: string
  createdAt: string
  updatedAt: string
}
