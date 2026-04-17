import type { PassErrorCodes } from './enum/PassErrorCodes'

export class PassHandlerError extends Error {
  constructor(
    public readonly code: PassErrorCodes,
    message: string,
  ) {
    super(message)
    this.name = 'PassHandlerError'
  }
}
