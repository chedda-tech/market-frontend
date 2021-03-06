import { Injectable, OnDestroy, OnInit } from '@angular/core';
import { BigNumber, ethers } from 'ethers';
import { DefaultProviderService } from '../providers/default-provider.service';
import { WalletProviderService } from '../providers/wallet-provider.service';
import CheddaXP from '../../artifacts/CheddaXP.json'
import { BehaviorSubject, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheddaXpService implements OnInit, OnDestroy {

  xpContract: any
  balanceSubject: BehaviorSubject<number> = new BehaviorSubject<any>(0)
  private accountSubscription?: Subscription
  private account
  private balance

  constructor(
    provider: DefaultProviderService, 
    private wallet: WalletProviderService,
    ) {
    this.xpContract = new ethers.Contract(
      wallet.currentConfig.contracts.CheddaXP,
      CheddaXP.abi,
      provider.provider
      );
    this.account = this.wallet.currentAccount
    this.registerEventListener()
  }

  ngOnInit(): void {
    console.log('**** XP service got account: ', this.account)
    if (this.account) {
      this.checkBalance(this.account)
    }
  }

  ngOnDestroy(): void {
     this.accountSubscription?.unsubscribe() 
  }

  async checkBalance(address) {
    let balance = await this.balanceOf(address)
    if (balance) {
      this.notifyBalance(balance)
    }
  }

  async balanceOf(address: string): Promise<BigNumber> {
    return await this.xpContract.balanceOf(address)
  }

  registerEventListener() {
    this.accountSubscription = this.wallet.accountSubject.subscribe(account => {
      this.account = account
      if (account) {
        this.checkBalance(account)
      }
    })
    this.xpContract.on('Minted', async (address, amount) => {
      if (address && this.account && address.toLowerCase() == this.account.toLowerCase()) {
        const newBalance = await this.balanceOf(address)
        this.notifyBalance(newBalance)
      }
    })
  }

  private notifyBalance(balance) {
    this.balance = balance
    this.balanceSubject.next(balance)
  }
}
