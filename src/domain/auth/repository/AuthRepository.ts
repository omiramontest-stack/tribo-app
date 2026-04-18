import type { Admin } from '@/domain/auth/entities/Admin'

export interface AuthRepository {
  login(email: string, password: string): Promise<Admin | null>
  logout(): Promise<void>
  getCurrentAdmin(): Admin | null
  checkSession(): Promise<Admin | null>
}
