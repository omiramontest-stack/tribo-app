import { inject, injectable } from 'inversify'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository } from '@/domain/organization/repository/OrganizationRepository'
import type { OrganizationMember } from '@/domain/organization/entities/OrganizationMember'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class GetMembersUseCase implements UseCase<string, OrganizationMember[]> {
  constructor(
    @inject(organizationTypes.organizationRepository)
    private readonly _repo: OrganizationRepository,
  ) {}

  run(organizationId: string): Promise<OrganizationMember[]> {
    return this._repo.getMembers(organizationId)
  }
}
