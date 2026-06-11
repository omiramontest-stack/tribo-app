import { ContainerModule } from 'inversify'
import type { interfaces } from 'inversify'

import geofenceTypes from './types'
import type { GeofenceRepository } from '@/domain/geofence/repository/GeofenceRepository'
import type { Geofence } from '@/domain/geofence/entities/Geofence'
import type UseCase from '@/application/common/useCase/UseCase'
import type { GetGeofencesInput } from '@/application/geofence/useCase/GetGeofencesUseCase'
import type { CreateGeofenceInput } from '@/application/geofence/useCase/CreateGeofenceUseCase'
import type { UpdateGeofenceInput } from '@/application/geofence/useCase/UpdateGeofenceUseCase'
import type { DeleteGeofenceInput } from '@/application/geofence/useCase/DeleteGeofenceUseCase'

import { GeofenceHttpRepository } from '../repository/GeofenceHttpRepository'
import GetGeofencesUseCase from '@/application/geofence/useCase/GetGeofencesUseCase'
import CreateGeofenceUseCase from '@/application/geofence/useCase/CreateGeofenceUseCase'
import UpdateGeofenceUseCase from '@/application/geofence/useCase/UpdateGeofenceUseCase'
import DeleteGeofenceUseCase from '@/application/geofence/useCase/DeleteGeofenceUseCase'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<GeofenceRepository>(geofenceTypes.geofenceRepository).to(GeofenceHttpRepository)
  // @ts-ignore
  bind<UseCase<GetGeofencesInput, Geofence[]>>(geofenceTypes.getGeofencesUseCase).to(GetGeofencesUseCase)
  // @ts-ignore
  bind<UseCase<CreateGeofenceInput, Geofence>>(geofenceTypes.createGeofenceUseCase).to(CreateGeofenceUseCase)
  // @ts-ignore
  bind<UseCase<UpdateGeofenceInput, Geofence>>(geofenceTypes.updateGeofenceUseCase).to(UpdateGeofenceUseCase)
  // @ts-ignore
  bind<UseCase<DeleteGeofenceInput, void>>(geofenceTypes.deleteGeofenceUseCase).to(DeleteGeofenceUseCase)
})
