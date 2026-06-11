import 'reflect-metadata'
import { injectable, inject } from 'inversify'

import geofenceTypes from '@/infrastructure/geofence/di/types'
import type { GeofenceRepository } from '@/domain/geofence/repository/GeofenceRepository'
import type { Geofence } from '@/domain/geofence/entities/Geofence'
import type { CreateGeofenceDto } from '../dto/CreateGeofenceDto'
import type UseCase from '@/application/common/useCase/UseCase'

export interface CreateGeofenceInput extends CreateGeofenceDto {
  orgId: string
  walletId: string
}

@injectable()
export default class CreateGeofenceUseCase implements UseCase<CreateGeofenceInput, Geofence> {
  constructor(
    @inject(geofenceTypes.geofenceRepository)
    private readonly _repo: GeofenceRepository,
  ) {}

  async run({ orgId, walletId, ...dto }: CreateGeofenceInput): Promise<Geofence> {
    return this._repo.create(orgId, walletId, dto)
  }
}
