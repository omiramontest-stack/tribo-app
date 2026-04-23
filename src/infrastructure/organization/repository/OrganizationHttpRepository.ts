import 'reflect-metadata'
import { injectable } from 'inversify'
import type { OrganizationRepository, OnboardingDto } from '@/domain/organization/repository/OrganizationRepository'
import type { Organization } from '@/domain/organization/entities/Organization'
import type { OrganizationMember, MemberRole } from '@/domain/organization/entities/OrganizationMember'
import type { Invitation } from '@/domain/organization/entities/Invitation'
import { apiClient } from '@/infrastructure/http/ApiClient'

@injectable()
export class OrganizationHttpRepository implements OrganizationRepository {
  getMyOrganizations(): Promise<Organization[]> {
    return apiClient.get<Organization[]>('/organizations')
  }

  createOrganization(dto: OnboardingDto): Promise<Organization> {
    return apiClient.post<Organization>('/auth/onboarding', dto)
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
}
