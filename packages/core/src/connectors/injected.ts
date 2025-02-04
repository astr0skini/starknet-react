import { AccountInterface } from 'starknet'
import { Connector } from './base'
import {
  ConnectorNotConnectedError,
  ConnectorNotFoundError,
  UserNotConnectedError,
  UserRejectedRequestError,
} from '../errors'
import { getStarknet, StarknetWindowObject, AccountChangeEventHandler } from 'get-starknet-core'

/** Injected connector options. */
export interface InjectedConnectorOptions {
  /** The wallet id. */
  id: string
}

export class InjectedConnector extends Connector<InjectedConnectorOptions> {
  private _wallet?: StarknetWindowObject

  constructor({ options }: { options: InjectedConnectorOptions }) {
    super({ options })
  }

  available(): boolean {
    this.ensureWallet()
    return this._wallet !== undefined
  }

  async ready(): Promise<boolean> {
    await this.ensureWallet()

    if (!this._wallet) return false
    return await this._wallet.isPreauthorized()
  }

  async connect(): Promise<AccountInterface> {
    await this.ensureWallet()

    if (!this._wallet) {
      throw new ConnectorNotFoundError()
    }

    try {
      await this._wallet.enable({ starknetVersion: 'v4' })
    } catch {
      // NOTE: Argent v3.0.0 swallows the `.enable` call on reject, so this won't get hit.
      throw new UserRejectedRequestError()
    }

    if (!this._wallet.isConnected) {
      // NOTE: Argent v3.0.0 swallows the `.enable` call on reject, so this won't get hit.
      throw new UserRejectedRequestError()
    }

    return this._wallet.account
  }

  async disconnect(): Promise<void> {
    await this.ensureWallet()

    if (!this.available()) {
      throw new ConnectorNotFoundError()
    }

    if (!this._wallet?.isConnected) {
      throw new UserNotConnectedError()
    }
  }

  async account(): Promise<AccountInterface | null> {
    await this.ensureWallet()

    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }

    if (!this._wallet.account) {
      return null
    }

    return this._wallet.account
  }

  id(): string {
    return this.options.id
  }

  name(): string {
    this.ensureWallet()
    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }
    return this._wallet.name
  }

  icon(): string {
    this.ensureWallet()
    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }
    return this._wallet.icon
  }

  async initEventListener(accountChangeCb: AccountChangeEventHandler) {
    await this.ensureWallet()

    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }

    this._wallet.on('accountsChanged', accountChangeCb)
  }

  async removeEventListener(accountChangeCb: AccountChangeEventHandler) {
    await this.ensureWallet()

    if (!this._wallet) {
      throw new ConnectorNotConnectedError()
    }

    this._wallet.off('accountsChanged', accountChangeCb)
  }

  private async ensureWallet() {
    const starknet = getStarknet()
    const installed = await starknet.getAvailableWallets()
    const wallet = installed.filter((w) => w.id === this.options.id)[0]
    if (wallet) {
      this._wallet = wallet
    }
  }
}
