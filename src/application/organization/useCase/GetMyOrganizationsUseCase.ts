import { inject, injectable } from 'inversify'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository } from '@/domain/organization/repository/OrganizationRepository'
import type { Organization } from '@/domain/organization/entities/Organization'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class GetMyOrganizationsUseCase implements UseCase<void, Organization[]> {
  constructor(
    @inject(organizationTypes.organizationRepository)
    private readonly _repo: OrganizationRepository,
  ) {}

  run(): Promise<Organization[]> {
    return this._repo.getMyOrganizations()
  }
}
