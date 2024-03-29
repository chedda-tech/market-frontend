import { Injectable } from '@angular/core';
import { BigNumber, ethers, providers, Signer,  } from 'ethers'
import detectEthereumProvider from '@metamask/detect-provider';
import { BehaviorSubject } from 'rxjs';
import { EnvironmentProviderService } from 'src/app/providers/environment-provider.service';import { NetworkParams } from './network-params.interface';
import { CheddaConfig } from './chedda-config.interface';

@Injectable({
  providedIn: 'root'
})
export class WalletProviderService {
  
  provider: any
  ethereum
  signer: Signer
  environment
  currentAccount
  currentNetwork: NetworkParams
  currentConfig: CheddaConfig
  connectedSubject: BehaviorSubject<boolean> = new BehaviorSubject(false)
  accountSubject: BehaviorSubject<any> = new BehaviorSubject(null)
  networkSubject: BehaviorSubject<any> = new BehaviorSubject(null)

  constructor(
    private environmentService: EnvironmentProviderService
  ) {
    this.environment = environmentService.environment
    this.initializeNetworkConnection()
    this.listenToEvents();
  }

  listenToEvents(){
    let eth:any = window.ethereum;
    if(eth){
      eth.on('accountsChanged', (accounts: any) => {
        if (accounts.length > 0) {
          this.setCurrentAccount(accounts[0])
        }else{
          this.setCurrentAccount(null)
        }
      });
    }

    this.environmentService.getEvent().subscribe((network) => {
      if(network){
        this.currentConfig = network.config
        this.environment = network
      }
    });
  }

  async connect(): Promise<boolean> {
    try {
      let ethereum = await detectEthereumProvider();
      if (ethereum) {
        await this.startApp(ethereum)
        return ethereum != undefined
      } else {
        return false
      }
    } catch (error) {
      console.error('unable to detect ethereum provider: ', error)
      return false
    }
  }

  isConnected(): boolean {
    return this.currentAccount != null && this.currentAccount != undefined
  }

  async startApp(ethereum: any) {
    this.provider = new ethers.providers.Web3Provider(ethereum, 'any')
    this.signer = await this.provider.getSigner()
    this.registerHandlers()
    if (ethereum.selectedAddress) {
      ethereum.enable()
      this.setCurrentAccount(ethereum.selectedAddress)
    } else {
    }

  }

  async addNetwork(network) {
    if (!this.provider || !this.currentNetwork) {
      return;
    }
  
    const networkParams = network.config.networkParams;
  
    if (this.currentNetwork !== networkParams) {
      console.log('about to add:', this.currentNetwork);
      try {
        await this.provider.send('wallet_addEthereumChain', [networkParams]);
      } catch (error) {
        console.log(error);
      }
      this.currentNetwork = networkParams;
      return;
    }
  
    console.log('about to add:', this.currentNetwork);
    try {
      await this.provider.send('wallet_addEthereumChain', [this.currentNetwork]);
    } catch (error) {
      console.log(error);
    }
  }

  async getChainId(){
    return await (window as any).ethereum.request({ method: 'eth_chainId' });
  } 
  
  async addToken(address: string, symbol: string, decimals: number, image?: string) {
    this.provider
  .send(
    'wallet_watchAsset',
    {
      type: 'ERC20',
      options: {
        address,
        symbol,
        decimals,
        image
      },
  })
  .then((success) => {
    if (success) {
      console.log('successfully added to wallet!');
    } else {
      throw new Error('Something went wrong.');
    }
  })
  .catch(console.error);
  }

  async getAccounts() {
    if (!this.provider) {
      return
    }

    console.log('getting accounts')
    const accounts = await this.provider.send('eth_requestAccounts', []);
    if (accounts.length > 0) {
      this.setCurrentAccount(accounts[0])
    } else {
      let accounts = await this.enableEthereum()
      if (accounts.length > 0) {
        this.setCurrentAccount(accounts[0])
      } else {
        this.setCurrentAccount(null)
      }
    }
    this.signer = this.provider.getSigner()
    console.log('signer is now ', this.signer)
    return accounts
  }

  async disconnect() {
    // not the right call
    // await this.ethereum.disconnect()
    this.setCurrentAccount(null)
  }

  async checkBalance(): Promise<BigNumber | BigNumber> {
    console.log('checking balance')
    if (this.currentAccount) {
      return await this.provider.getBalance(this.currentAccount)
    } else {
      return BigNumber.from(0)
    }
  }

  async balanceIsOver(value: BigNumber): Promise<boolean | boolean> {
    if (this.currentAccount) {
      const balance: BigNumber = await this.provider.getBalance(this.currentAccount)
      console.log(`Balance=${balance}, value=${value}`)
      return balance.gt(value) // must be strictly > to account for gas cost.
    } else {
      return false
    }
  }

  async enableEthereum(): Promise<any> {
    return await this.provider.enable()
  }

  private async registerHandlers() {
    console.log('registering handlers')
    this.provider.on('connect', this.handleAccountConnected.bind(this))
    this.provider.on('disconnect', this.handleAccountDisconnected.bind(this))
    this.provider.on('network', this.handledChainChanged.bind(this))
    this.provider.on('accountsChanged', this.handleAccountChanged.bind(this))
  }

  private handleAccountConnected(accounts) {
    console.log('>>> Account connected: ', accounts)
  }

  private handleAccountDisconnected(accounts) {
    console.log('>>> Account disconnected: ', accounts)
  }

  private handledChainChanged(network) {
    console.log('>>> Chain changed to: ', network)
    this.networkSubject.next(this.getHexString(network.chainId))
  }

  private handleAccountChanged(accounts) {
    if (accounts.length > 0) {
      this.setCurrentAccount(accounts[0])
    } else {
      this.setCurrentAccount(null)
    }
    console.log('>>> Account changed to: ', accounts)
  }

  private setCurrentAccount(account: string | null) {
    this.currentAccount = account
    this.accountSubject.next(account)
  }

  private initializeNetworkConnection() {
    let eth: any = window.ethereum
    if (eth) {
      let hexVersion = this.getHexString(eth.networkVersion)
      console.log('current network version is: ', hexVersion)
      this.handledChainChanged(hexVersion)
    } else {
      console.log('no ethereum')
    }
    let currentNetwork: NetworkParams = this.environment.config.networkParams
    if (currentNetwork && currentNetwork.chainId) {
    }
    this.currentNetwork = currentNetwork
    this.currentConfig = this.environment.config
  }

  private getHexString(networkCode) {
    return `0x${(+networkCode).toString(16)}`
  }

  currencyName(): string {
    return this.environment.config.networkParams.nativeCurrency.symbol
  }

  onboard() {}
}
