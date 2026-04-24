import type { Admin } from '@/domain/auth/entities/Admin'

export interface RegisterDto {
  email: string
  password: string
}

export interface AuthRepository {
  login(email: string, password: string): Promise<Admin | null>
  register(dto: RegisterDto): Promise<Admin>
  logout(): Promise<void>
  getCurrentAdmin(): Admin | null
  checkSession(): Promise<Admin | null>
  switchOrg(organizationId: string): Promise<void>
}
