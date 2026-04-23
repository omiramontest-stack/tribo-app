import type { Organization } from '@/domain/organization/entities/Organization'
import type { OrganizationMember, MemberRole } from '@/domain/organization/entities/OrganizationMember'
import type { Invitation } from '@/domain/organization/entities/Invitation'

export interface OnboardingDto {
  organizationName: string
  industry?: string
  country?: string
  phone?: string
}

export interface OrganizationRepository {
  getMyOrganizations(): Promise<Organization[]>
  createOrganization(dto: OnboardingDto): Promise<Organization>
  getMembers(organizationId: string): Promise<OrganizationMember[]>
  addMember(organizationId: string, email: string, role: MemberRole): Promise<OrganizationMember>
  inviteMember(organizationId: string, email: string, role: MemberRole): Promise<Invitation>
  getInvitation(token: string): Promise<Invitation>
  acceptInvitation(token: string, password: string): Promise<void>
}
