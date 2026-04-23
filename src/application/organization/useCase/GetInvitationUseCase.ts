import { inject, injectable } from 'inversify'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository } from '@/domain/organization/repository/OrganizationRepository'
import type { Invitation } from '@/domain/organization/entities/Invitation'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class GetInvitationUseCase implements UseCase<string, Invitation> {
  constructor(
    @inject(organizationTypes.organizationRepository)
    private readonly _repo: OrganizationRepository,
  ) {}

  run(token: string): Promise<Invitation> {
    return this._repo.getInvitation(token)
  }
}
