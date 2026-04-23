export type MemberRole = 'owner' | 'admin' | 'staff'

export interface OrganizationMember {
  id: string
  adminId: string
  organizationId: string
  email?: string
  role: MemberRole
  createdAt: string
}
