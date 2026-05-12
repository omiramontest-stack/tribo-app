import { inject, injectable } from 'inversify'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository, UpdateMemberRoleDto } from '@/domain/organization/repository/OrganizationRepository'
import type { OrganizationMember } from '@/domain/organization/entities/OrganizationMember'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class UpdateMemberRoleUseCase implements UseCase<UpdateMemberRoleDto, OrganizationMember> {
  constructor(
    @inject(organizationTypes.organizationRepository)
    private readonly _repo: OrganizationRepository,
  ) {}

  run(dto: UpdateMemberRoleDto): Promise<OrganizationMember> {
    return this._repo.updateMemberRole(dto)
  }
}
