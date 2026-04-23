import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { Organization } from '@/domain/organization/entities/Organization'
import type { OrganizationMember } from '@/domain/organization/entities/OrganizationMember'
import type { Invitation } from '@/domain/organization/entities/Invitation'
import type { OnboardingDto } from '@/domain/organization/repository/OrganizationRepository'
import type { InviteMemberDto } from '@/application/organization/useCase/InviteMemberUseCase'
import type { AcceptInvitationDto } from '@/application/organization/useCase/AcceptInvitationUseCase'
import type UseCase from '@/application/common/useCase/UseCase'

export const useOrganizationStore = defineStore('OrganizationStore', () => {
  const getMyOrganizationsUseCase = container.get<UseCase<void, Organization[]>>(organizationTypes.getMyOrganizationsUseCase)
  const onboardingUseCase = container.get<UseCase<OnboardingDto, Organization>>(organizationTypes.onboardingUseCase)
  const getMembersUseCase = container.get<UseCase<string, OrganizationMember[]>>(organizationTypes.getMembersUseCase)
  const inviteMemberUseCase = container.get<UseCase<InviteMemberDto, Invitation>>(organizationTypes.inviteMemberUseCase)
  const getInvitationUseCase = container.get<UseCase<string, Invitation>>(organizationTypes.getInvitationUseCase)
  const acceptInvitationUseCase = container.get<UseCase<AcceptInvitationDto, void>>(organizationTypes.acceptInvitationUseCase)

  const state = reactive<{
    _organizations: Organization[]
    _members: OrganizationMember[]
    _initialized: boolean
  }>({
    _organizations: [],
    _members: [],
    _initialized: false,
  })

  const organizations = computed(() => state._organizations)
  const members = computed(() => state._members)
  const currentOrg = computed(() => state._organizations[0] ?? null)
  const initialized = computed(() => state._initialized)
  const hasOrganization = computed(() => state._initialized && state._organizations.length > 0)

  async function fetchMyOrganizations() {
    state._organizations = await getMyOrganizationsUseCase.run()
    state._initialized = true
  }

  async function onboarding(dto: OnboardingDto) {
    const org = await onboardingUseCase.run(dto)
    state._organizations = [org]
    state._initialized = true
    return org
  }

  async function fetchMembers(organizationId: string) {
    state._members = await getMembersUseCase.run(organizationId)
  }

  async function inviteMember(dto: InviteMemberDto): Promise<Invitation> {
    return inviteMemberUseCase.run(dto)
  }

  async function getInvitation(token: string): Promise<Invitation> {
    return getInvitationUseCase.run(token)
  }

  async function acceptInvitation(dto: AcceptInvitationDto): Promise<void> {
    await acceptInvitationUseCase.run(dto)
  }

  function reset() {
    state._organizations = []
    state._members = []
    state._initialized = false
  }

  return {
    organizations,
    members,
    currentOrg,
    initialized,
    hasOrganization,
    fetchMyOrganizations,
    onboarding,
    fetchMembers,
    inviteMember,
    getInvitation,
    acceptInvitation,
    reset,
  }
})
