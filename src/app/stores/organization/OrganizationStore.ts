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

const ACTIVE_ORG_KEY = 'wallet_saas_active_org_id'

export const useOrganizationStore = defineStore('OrganizationStore', () => {
  const getMyOrganizationsUseCase = container.get<UseCase<void, Organization[]>>(organizationTypes.getMyOrganizationsUseCase)
  const onboardingUseCase = container.get<UseCase<OnboardingDto, Organization>>(organizationTypes.onboardingUseCase)
  const getMembersUseCase = container.get<UseCase<string, OrganizationMember[]>>(organizationTypes.getMembersUseCase)
  const inviteMemberUseCase = container.get<UseCase<InviteMemberDto, Invitation>>(organizationTypes.inviteMemberUseCase)
  const getInvitationUseCase = container.get<UseCase<string, Invitation>>(organizationTypes.getInvitationUseCase)
  const acceptInvitationUseCase = container.get<UseCase<AcceptInvitationDto, void>>(organizationTypes.acceptInvitationUseCase)

  const state = reactive<{
    _organizations: Organization[]
    _activeOrgId: string | null
    _members: OrganizationMember[]
    _initialized: boolean
  }>({
    _organizations: [],
    _activeOrgId: localStorage.getItem(ACTIVE_ORG_KEY),
    _members: [],
    _initialized: false,
  })

  const organizations = computed(() => state._organizations)
  const members = computed(() => state._members)
  const initialized = computed(() => state._initialized)
  const hasOrganization = computed(() => state._initialized && state._organizations.length > 0)

  const activeOrg = computed<Organization | null>(() => {
    if (!state._organizations.length) return null
    const saved = state._organizations.find((o) => o.id === state._activeOrgId)
    return saved ?? state._organizations[0]
  })

  const activeOrgId = computed(() => activeOrg.value?.id ?? null)

  // Keep backward compat with currentOrg references
  const currentOrg = activeOrg

  function setActiveOrg(org: Organization) {
    state._activeOrgId = org.id
    localStorage.setItem(ACTIVE_ORG_KEY, org.id)
  }

  async function fetchMyOrganizations() {
    const orgs = await getMyOrganizationsUseCase.run()
    state._organizations = orgs
    state._initialized = true
    // Restore saved active org, or default to first
    const savedId = localStorage.getItem(ACTIVE_ORG_KEY)
    const match = orgs.find((o) => o.id === savedId)
    state._activeOrgId = match ? match.id : (orgs[0]?.id ?? null)
    if (state._activeOrgId) localStorage.setItem(ACTIVE_ORG_KEY, state._activeOrgId)
  }

  async function onboarding(dto: OnboardingDto) {
    const org = await onboardingUseCase.run(dto)
    state._organizations = [org]
    state._activeOrgId = org.id
    state._initialized = true
    localStorage.setItem(ACTIVE_ORG_KEY, org.id)
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

  function clearMembers() {
    state._members = []
  }

  function reset() {
    state._organizations = []
    state._activeOrgId = null
    state._members = []
    state._initialized = false
    localStorage.removeItem(ACTIVE_ORG_KEY)
  }

  return {
    organizations,
    members,
    currentOrg,
    activeOrg,
    activeOrgId,
    initialized,
    hasOrganization,
    setActiveOrg,
    fetchMyOrganizations,
    onboarding,
    fetchMembers,
    inviteMember,
    getInvitation,
    acceptInvitation,
    clearMembers,
    reset,
  }
})
