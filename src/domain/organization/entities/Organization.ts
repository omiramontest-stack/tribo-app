export interface Organization {
  id: string
  name: string
  logoUrl?: string | null
  industry?: string
  country?: string
  phone?: string
  whatsappMessageTemplate?: string | null
  createdAt: string
}
