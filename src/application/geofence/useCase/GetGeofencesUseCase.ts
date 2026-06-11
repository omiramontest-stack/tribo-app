import 'reflect-metadata'
import { injectable, inject } from 'inversify'

import geofenceTypes from '@/infrastructure/geofence/di/types'
import type { GeofenceRepository } from '@/domain/geofence/repository/GeofenceRepository'
import type { Geofence } from '@/domain/geofence/entities/Geofence'
import type UseCase from '@/application/common/useCase/UseCase'

export interface GetGeofencesInput {
  orgId: string
  walletId: string
}

@injectable()
export default class GetGeofencesUseCase implements UseCase<GetGeofencesInput, Geofence[]> {
  constructor(
    @inject(geofenceTypes.geofenceRepository)
    private readonly _repo: GeofenceRepository,
  ) {}

  async run({ orgId, walletId }: GetGeofencesInput): Promise<Geofence[]> {
    return this._repo.findAll(orgId, walletId)
  }
}
