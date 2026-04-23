import { inject, injectable } from 'inversify'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository } from '@/domain/organization/repository/OrganizationRepository'
import type { Invitation } from '@/domain/organization/entities/Invitation'
import type { MemberRole } from '@/domain/organization/entities/OrganizationMember'
import type UseCase from '@/application/common/useCase/UseCase'

export interface InviteMemberDto {
  organizationId: string
  email: string
  role: MemberRole
}

@injectable()
export default class InviteMemberUseCase implements UseCase<InviteMemberDto, Invitation> {
  constructor(
    @inject(organizationTypes.organizationRepository)
    private readonly _repo: OrganizationRepository,
  ) {}

  run(dto: InviteMemberDto): Promise<Invitation> {
    return this._repo.inviteMember(dto.organizationId, dto.email, dto.role)
  }
}
