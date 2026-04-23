export interface Invitation {
  id: string
  organization: { id: string; name: string }
  email: string
  role: string
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: string
  createdAt: string
}
