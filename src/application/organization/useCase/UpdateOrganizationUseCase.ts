import { inject, injectable } from 'inversify'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository, UpdateOrganizationDto } from '@/domain/organization/repository/OrganizationRepository'
import type { Organization } from '@/domain/organization/entities/Organization'
import type UseCase from '@/application/common/useCase/UseCase'

export interface UpdateOrganizationUseCaseDto extends UpdateOrganizationDto {
  organizationId: string
}

@injectable()
export default class UpdateOrganizationUseCase implements UseCase<UpdateOrganizationUseCaseDto, Organization> {
  constructor(
    @inject(organizationTypes.organizationRepository)
    private readonly _repo: OrganizationRepository,
  ) {}

  run({ organizationId, ...dto }: UpdateOrganizationUseCaseDto): Promise<Organization> {
    return this._repo.updateOrganization(organizationId, dto)
  }
}
