import { inject, injectable } from 'inversify'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository, RemoveMemberDto } from '@/domain/organization/repository/OrganizationRepository'
import type UseCase from '@/application/common/useCase/UseCase'

@injectable()
export default class RemoveMemberUseCase implements UseCase<RemoveMemberDto, void> {
  constructor(
    @inject(organizationTypes.organizationRepository)
    private readonly _repo: OrganizationRepository,
  ) {}

  run(dto: RemoveMemberDto): Promise<void> {
    return this._repo.removeMember(dto)
  }
}
