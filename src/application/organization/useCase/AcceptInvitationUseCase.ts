import { inject, injectable } from 'inversify'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository } from '@/domain/organization/repository/OrganizationRepository'
import type UseCase from '@/application/common/useCase/UseCase'

export interface AcceptInvitationDto {
  token: string
  password: string
}

@injectable()
export default class AcceptInvitationUseCase implements UseCase<AcceptInvitationDto, void> {
  constructor(
    @inject(organizationTypes.organizationRepository)
    private readonly _repo: OrganizationRepository,
  ) {}

  run(dto: AcceptInvitationDto): Promise<void> {
    return this._repo.acceptInvitation(dto.token, dto.password)
  }
}
