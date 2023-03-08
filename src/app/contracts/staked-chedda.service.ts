import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BigNumber, ethers } from 'ethers';
import { BehaviorSubject } from 'rxjs';
import StakedChedda from '../../artifacts/StakedChedda.json'
import { DefaultProviderService } from '../providers/default-provider.service';
import { WalletProviderService } from '../providers/wallet-provider.service';

@Injectable({
  providedIn: 'root'
})
export class StakedCheddaService {

  stakedCheddaContract: any
  approvalSubject: BehaviorSubject<any> = new BehaviorSubject(null)
  withdrawSubject: BehaviorSubject<any> = new BehaviorSubject(null)
  depositSubject: BehaviorSubject<any> = new BehaviorSubject(null)
  
  constructor(provider: DefaultProviderService, private wallet: WalletProviderService, private http: HttpClient) {
    this.stakedCheddaContract = new ethers.Contract(
      wallet.currentConfig.contracts.xChedda,
      StakedChedda.abi,
      provider.provider
      );
      this.registerForEvents()
  }

  async balanceOf(address: string): Promise<BigNumber> {
    return await this.stakedCheddaContract.balanceOf(address)
  }

  async totalSupply(): Promise<BigNumber> {
    return await this.stakedCheddaContract.totalSupply()
  }

  async stake(amount: BigNumber): Promise<BigNumber> {
    return await this.stakedCheddaContract.connect(this.wallet.signer).stake(amount)
  }

  async unstake(amount: BigNumber) {
    await this.stakedCheddaContract.connect(this.wallet.signer).unstake(amount)
  }

  async totalAssets(): Promise<BigNumber> {
    return await this.stakedCheddaContract.totalAssets()
  }

  async allowance(account: string, spender: string): Promise<BigNumber> {
    return await this.stakedCheddaContract.allowance(account, spender)
  }


  async approve(spender: string, amount?: string) {
    if (!amount) {
      amount = await this.stakedCheddaContract.totalSupply();
    }
    return this.stakedCheddaContract.connect(this.wallet.signer).approve(spender, amount)
  }

  address(): string {
    return this.wallet.currentConfig.contracts.xChedda
  }

  registerForEvents() {
    this.stakedCheddaContract.on('Approval', async (account, spender, amount) => {
      console.log('Approval: ', account, spender, amount)
      this.approvalSubject?.next({
        account,
        spender,
        amount
      })
    })
    this.stakedCheddaContract.on('Deposit', (from, to, amount, shares) => {
      this.depositSubject.next({
        from,
        to,
        amount,
        shares
      })
    })

    this.stakedCheddaContract.on('Withdraw', (from, to, amount, shares) => {
      console.log('Withdraw event: ', from, to, amount, shares)
      this.withdrawSubject.next({
        from,
        to,
        amount,
        shares
      })
    })
  }
}
