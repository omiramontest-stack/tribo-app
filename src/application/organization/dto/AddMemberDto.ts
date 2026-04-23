import type { MemberRole } from '@/domain/organization/entities/OrganizationMember'

export interface AddMemberDto {
  organizationId: string
  email: string
  role: MemberRole
}
