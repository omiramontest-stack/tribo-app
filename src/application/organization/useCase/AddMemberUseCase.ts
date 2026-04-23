import { inject, injectable } from 'inversify'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository } from '@/domain/organization/repository/OrganizationRepository'
import type { OrganizationMember } from '@/domain/organization/entities/OrganizationMember'
import type { AddMemberDto } from '@/application/organization/dto/AddMemberDto'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class AddMemberUseCase implements UseCase<AddMemberDto, OrganizationMember> {
  constructor(
    @inject(organizationTypes.organizationRepository)
    private readonly _repo: OrganizationRepository,
  ) {}

  run(dto: AddMemberDto): Promise<OrganizationMember> {
    return this._repo.addMember(dto.organizationId, dto.email, dto.role)
  }
}
