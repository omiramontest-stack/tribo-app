import { ContainerModule } from 'inversify'
import type { interfaces } from 'inversify'

import organizationTypes from '@/infrastructure/organization/di/types'
import type { OrganizationRepository, OnboardingDto, UpdateMemberRoleDto, RemoveMemberDto } from '@/domain/organization/repository/OrganizationRepository'
import type { Organization } from '@/domain/organization/entities/Organization'
import type { OrganizationMember } from '@/domain/organization/entities/OrganizationMember'
import type { Invitation } from '@/domain/organization/entities/Invitation'
import type { AddMemberDto } from '@/application/organization/dto/AddMemberDto'
import type { InviteMemberDto } from '@/application/organization/useCase/InviteMemberUseCase'
import type { AcceptInvitationDto } from '@/application/organization/useCase/AcceptInvitationUseCase'
import type { UpdateOrganizationUseCaseDto } from '@/application/organization/useCase/UpdateOrganizationUseCase'
import type UseCase from '@/application/common/useCase/UseCase'

import { OrganizationHttpRepository } from '@/infrastructure/organization/repository/OrganizationHttpRepository'
import GetMyOrganizationsUseCase from '@/application/organization/useCase/GetMyOrganizationsUseCase'
import OnboardingUseCase from '@/application/organization/useCase/OnboardingUseCase'
import GetMembersUseCase from '@/application/organization/useCase/GetMembersUseCase'
import AddMemberUseCase from '@/application/organization/useCase/AddMemberUseCase'
import InviteMemberUseCase from '@/application/organization/useCase/InviteMemberUseCase'
import GetInvitationUseCase from '@/application/organization/useCase/GetInvitationUseCase'
import AcceptInvitationUseCase from '@/application/organization/useCase/AcceptInvitationUseCase'
import UpdateOrganizationUseCase from '@/application/organization/useCase/UpdateOrganizationUseCase'
import UpdateMemberRoleUseCase from '@/application/organization/useCase/UpdateMemberRoleUseCase'
import RemoveMemberUseCase from '@/application/organization/useCase/RemoveMemberUseCase'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<OrganizationRepository>(organizationTypes.organizationRepository).to(OrganizationHttpRepository)
  bind<UseCase<void, Organization[]>>(organizationTypes.getMyOrganizationsUseCase).to(GetMyOrganizationsUseCase)
  bind<UseCase<OnboardingDto, Organization>>(organizationTypes.onboardingUseCase).to(OnboardingUseCase)
  bind<UseCase<string, OrganizationMember[]>>(organizationTypes.getMembersUseCase).to(GetMembersUseCase)
  bind<UseCase<AddMemberDto, OrganizationMember>>(organizationTypes.addMemberUseCase).to(AddMemberUseCase)
  bind<UseCase<InviteMemberDto, Invitation>>(organizationTypes.inviteMemberUseCase).to(InviteMemberUseCase)
  bind<UseCase<string, Invitation>>(organizationTypes.getInvitationUseCase).to(GetInvitationUseCase)
  bind<UseCase<AcceptInvitationDto, void>>(organizationTypes.acceptInvitationUseCase).to(AcceptInvitationUseCase)
  bind<UseCase<UpdateOrganizationUseCaseDto, Organization>>(organizationTypes.updateOrganizationUseCase).to(UpdateOrganizationUseCase)
  bind<UseCase<UpdateMemberRoleDto, OrganizationMember>>(organizationTypes.updateMemberRoleUseCase).to(UpdateMemberRoleUseCase)
  bind<UseCase<RemoveMemberDto, void>>(organizationTypes.removeMemberUseCase).to(RemoveMemberUseCase)
})
