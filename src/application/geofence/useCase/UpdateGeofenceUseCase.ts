import 'reflect-metadata'
import { injectable, inject } from 'inversify'

import geofenceTypes from '@/infrastructure/geofence/di/types'
import type { GeofenceRepository } from '@/domain/geofence/repository/GeofenceRepository'
import type { Geofence } from '@/domain/geofence/entities/Geofence'
import type { UpdateGeofenceDto } from '../dto/UpdateGeofenceDto'
import type UseCase from '@/application/common/useCase/UseCase'

export interface UpdateGeofenceInput extends UpdateGeofenceDto {
  orgId: string
  walletId: string
  id: string
}

@injectable()
export default class UpdateGeofenceUseCase implements UseCase<UpdateGeofenceInput, Geofence> {
  constructor(
    @inject(geofenceTypes.geofenceRepository)
    private readonly _repo: GeofenceRepository,
  ) {}

  async run({ orgId, walletId, id, ...dto }: UpdateGeofenceInput): Promise<Geofence> {
    return this._repo.update(orgId, walletId, id, dto)
  }
}
