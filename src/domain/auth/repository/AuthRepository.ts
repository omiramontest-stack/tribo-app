import type { Admin } from '@/domain/auth/entities/Admin'

export interface RegisterDto {
  email: string
  password: string
}

export interface ChangeEmailDto {
  newEmail: string
}

export interface ChangePasswordDto {
  currentPassword?: string
  newPassword: string
}

export interface ForgotPasswordDto {
  email: string
}

export interface ResetPasswordDto {
  token: string
  newPassword: string
}

export interface AuthRepository {
  login(email: string, password: string): Promise<Admin | null>
  register(dto: RegisterDto): Promise<Admin>
  logout(): Promise<void>
  getCurrentAdmin(): Admin | null
  checkSession(): Promise<Admin | null>
  switchOrg(organizationId: string): Promise<void>
  verifyEmail(token: string): Promise<void>
  resendVerification(): Promise<void>
  changeEmail(dto: ChangeEmailDto): Promise<void>
  confirmEmailChange(token: string): Promise<void>
  changePassword(dto: ChangePasswordDto): Promise<void>
  forgotPassword(dto: ForgotPasswordDto): Promise<void>
  resetPassword(dto: ResetPasswordDto): Promise<void>
  exchangeGoogleSession(code: string): Promise<Admin>
}
