import { reactive, computed } from 'vue'
import { defineStore } from 'pinia'

import { container } from '@/container'
import { apiClient } from '@/infrastructure/http/ApiClient'
import organizationTypes from '@/infrastructure/organization/di/types'
import type { Organization } from '@/domain/organization/entities/Organization'
import type { OrganizationMember } from '@/domain/organization/entities/OrganizationMember'
import type { Invitation } from '@/domain/organization/entities/Invitation'
import type { OnboardingDto, UpdateMemberRoleDto, RemoveMemberDto } from '@/domain/organization/repository/OrganizationRepository'
export type { OnboardingDto }
import type { InviteMemberDto } from '@/application/organization/useCase/InviteMemberUseCase'
import type { AcceptInvitationDto } from '@/application/organization/useCase/AcceptInvitationUseCase'
import type { UpdateOrganizationUseCaseDto } from '@/application/organization/useCase/UpdateOrganizationUseCase'
import type UseCase from '@/application/common/useCase/UseCase'

const ACTIVE_ORG_KEY = 'wallet_saas_active_org_id'

function _decodeRoleFromToken(): string | null {
  const token = apiClient.getToken()
  if (!token) return null
  try {
    const [, part] = token.split('.')
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

export const useOrganizationStore = defineStore('OrganizationStore', () => {
  const getMyOrganizationsUseCase = container.get<UseCase<void, Organization[]>>(organizationTypes.getMyOrganizationsUseCase)
  const onboardingUseCase = container.get<UseCase<OnboardingDto, Organization>>(organizationTypes.onboardingUseCase)
  const createOrganizationUseCase = container.get<UseCase<OnboardingDto, Organization>>(organizationTypes.createOrganizationUseCase)
  const getMembersUseCase = container.get<UseCase<string, OrganizationMember[]>>(organizationTypes.getMembersUseCase)
  const inviteMemberUseCase = container.get<UseCase<InviteMemberDto, Invitation>>(organizationTypes.inviteMemberUseCase)
  const getInvitationUseCase = container.get<UseCase<string, Invitation>>(organizationTypes.getInvitationUseCase)
  const acceptInvitationUseCase = container.get<UseCase<AcceptInvitationDto, void>>(organizationTypes.acceptInvitationUseCase)
  const updateOrganizationUseCase = container.get<UseCase<UpdateOrganizationUseCaseDto, Organization>>(organizationTypes.updateOrganizationUseCase)
  const updateMemberRoleUseCase = container.get<UseCase<UpdateMemberRoleDto, OrganizationMember>>(organizationTypes.updateMemberRoleUseCase)
  const removeMemberUseCase = container.get<UseCase<RemoveMemberDto, void>>(organizationTypes.removeMemberUseCase)

  const state = reactive<{
    _organizations: Organization[]
    _activeOrgId: string | null
    _members: OrganizationMember[]
    _initialized: boolean
    _loadingOrgs: boolean
    _currentOrgRole: string | null
  }>({
    _organizations: [],
    _activeOrgId: localStorage.getItem(ACTIVE_ORG_KEY),
    _members: [],
    _initialized: false,
    _loadingOrgs: false,
    _currentOrgRole: _decodeRoleFromToken(),
  })

  const organizations = computed(() => state._organizations)
  const members = computed(() => state._members)
  const initialized = computed(() => state._initialized)
  const loadingOrgs = computed(() => state._loadingOrgs)
  const hasOrganization = computed(() => state._initialized && state._organizations.length > 0)
  const currentOrgRole = computed(() => state._currentOrgRole)
  const isOwner = computed(() => state._currentOrgRole === 'owner')

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
    state._currentOrgRole = _decodeRoleFromToken()
    localStorage.setItem(ACTIVE_ORG_KEY, org.id)
  }

  async function fetchMyOrganizations() {
    state._loadingOrgs = true
    try {
      const orgs = await getMyOrganizationsUseCase.run()
      state._organizations = orgs
      state._initialized = true
      // Restore saved active org, or default to first
      const savedId = localStorage.getItem(ACTIVE_ORG_KEY)
      const match = orgs.find((o) => o.id === savedId)
      state._activeOrgId = match ? match.id : (orgs[0]?.id ?? null)
      if (state._activeOrgId) localStorage.setItem(ACTIVE_ORG_KEY, state._activeOrgId)
      state._currentOrgRole = _decodeRoleFromToken()
    } finally {
      state._loadingOrgs = false
    }
  }

  async function createOrg(dto: OnboardingDto): Promise<Organization> {
    const org = await createOrganizationUseCase.run(dto)
    state._organizations = [...state._organizations, org]
    return org
  }

  async function onboarding(dto: OnboardingDto) {
    const org = await onboardingUseCase.run(dto)
    state._organizations = [org]
    state._activeOrgId = org.id
    state._initialized = false
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

  async function updateOrg(dto: Omit<UpdateOrganizationUseCaseDto, 'organizationId'>): Promise<Organization> {
    const orgId = activeOrgId.value
    if (!orgId) throw new Error('No active organization')
    const updated = await updateOrganizationUseCase.run({ organizationId: orgId, ...dto })
    const idx = state._organizations.findIndex((o) => o.id === updated.id)
    if (idx >= 0) state._organizations[idx] = updated
    return updated
  }

  async function updateMemberRole(memberId: string, role: 'admin' | 'staff'): Promise<OrganizationMember> {
    const orgId = activeOrgId.value
    if (!orgId) throw new Error('No active organization')
    const updated = await updateMemberRoleUseCase.run({ organizationId: orgId, memberId, role })
    const idx = state._members.findIndex((m) => m.id === memberId)
    if (idx >= 0) state._members[idx] = updated
    return updated
  }

  async function removeMember(memberId: string): Promise<void> {
    const orgId = activeOrgId.value
    if (!orgId) throw new Error('No active organization')
    await removeMemberUseCase.run({ organizationId: orgId, memberId })
    state._members = state._members.filter((m) => m.id !== memberId)
  }

  function clearMembers() {
    state._members = []
  }

  function reset() {
    state._organizations = []
    state._activeOrgId = null
    state._members = []
    state._initialized = false
    state._currentOrgRole = null
    localStorage.removeItem(ACTIVE_ORG_KEY)
  }

  return {
    organizations,
    members,
    currentOrg,
    activeOrg,
    activeOrgId,
    initialized,
    loadingOrgs,
    hasOrganization,
    currentOrgRole,
    isOwner,
    setActiveOrg,
    fetchMyOrganizations,
    createOrg,
    onboarding,
    fetchMembers,
    inviteMember,
    getInvitation,
    acceptInvitation,
    updateOrg,
    updateMemberRole,
    removeMember,
    clearMembers,
    reset,
  }
})
