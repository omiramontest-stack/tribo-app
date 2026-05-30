import 'reflect-metadata'
import { injectable } from 'inversify'
import type { OrganizationRepository, OnboardingDto, UpdateOrganizationDto, UpdateMemberRoleDto, RemoveMemberDto } from '@/domain/organization/repository/OrganizationRepository'
import type { Organization } from '@/domain/organization/entities/Organization'
import type { OrganizationMember, MemberRole } from '@/domain/organization/entities/OrganizationMember'
import type { Invitation } from '@/domain/organization/entities/Invitation'
import { apiClient } from '@/infrastructure/http/ApiClient'

@injectable()
export class OrganizationHttpRepository implements OrganizationRepository {
  getMyOrganizations(): Promise<Organization[]> {
    return apiClient.get<Organization[]>('/organizations')
  }

  async createOrganization(dto: OnboardingDto): Promise<Organization> {
    const res = await apiClient.post<{ organization: Organization }>('/auth/onboarding', dto)
    return res.organization
  }

  async createAdditionalOrganization(dto: OnboardingDto): Promise<Organization> {
    const res = await apiClient.post<{ organization: Organization }>('/organizations', dto)
    return res.organization
  }

  getMembers(organizationId: string): Promise<OrganizationMember[]> {
    return apiClient.get<OrganizationMember[]>(`/organizations/${organizationId}/members`)
  }

  addMember(organizationId: string, email: string, role: MemberRole): Promise<OrganizationMember> {
    return apiClient.post<OrganizationMember>(`/organizations/${organizationId}/members`, { email, role })
  }

  inviteMember(organizationId: string, email: string, role: MemberRole): Promise<Invitation> {
    return apiClient.post<Invitation>(`/organizations/${organizationId}/invitations`, { email, role })
  }

  getInvitation(token: string): Promise<Invitation> {
    return apiClient.get<Invitation>(`/invitations/${token}`)
  }

  async acceptInvitation(token: string, password: string): Promise<void> {
    await apiClient.post(`/invitations/${token}/accept`, { password })
  }

  async updateOrganization(organizationId: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const res = await apiClient.patch<{ organization: Organization }>(`/organizations/${organizationId}`, dto)
    return res.organization
  }

  async updateMemberRole(dto: UpdateMemberRoleDto): Promise<OrganizationMember> {
    const res = await apiClient.patch<{ member: OrganizationMember }>(
      `/organizations/${dto.organizationId}/members/${dto.memberId}`,
      { role: dto.role },
    )
    return res.member
  }

  async removeMember(dto: RemoveMemberDto): Promise<void> {
    await apiClient.delete(`/organizations/${dto.organizationId}/members/${dto.memberId}`)
  }
}
