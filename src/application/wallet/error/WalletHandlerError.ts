import type { WalletErrorCodes } from './enum/WalletErrorCodes'

export class WalletHandlerError extends Error {
  constructor(
    public readonly code: WalletErrorCodes,
    message: string,
  ) {
    super(message)
    this.name = 'WalletHandlerError'
  }
}
