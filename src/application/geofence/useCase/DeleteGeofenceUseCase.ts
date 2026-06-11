import 'reflect-metadata'
import { injectable, inject } from 'inversify'

import geofenceTypes from '@/infrastructure/geofence/di/types'
import type { GeofenceRepository } from '@/domain/geofence/repository/GeofenceRepository'
import type UseCase from '@/application/common/useCase/UseCase'

export interface DeleteGeofenceInput {
  orgId: string
  walletId: string
  id: string
}

@injectable()
export default class DeleteGeofenceUseCase implements UseCase<DeleteGeofenceInput, void> {
  constructor(
    @inject(geofenceTypes.geofenceRepository)
    private readonly _repo: GeofenceRepository,
  ) {}

  async run({ orgId, walletId, id }: DeleteGeofenceInput): Promise<void> {
    return this._repo.delete(orgId, walletId, id)
  }
}
