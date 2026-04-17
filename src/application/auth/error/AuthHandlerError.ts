import type { AuthErrorCodes } from './enum/AuthErrorCodes'

export class AuthHandlerError extends Error {
  constructor(
    public readonly code: AuthErrorCodes,
    message: string,
  ) {
    super(message)
    this.name = 'AuthHandlerError'
  }
}
