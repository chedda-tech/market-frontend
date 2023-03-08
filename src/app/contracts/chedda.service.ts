import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BigNumber, ethers } from 'ethers';
import { BehaviorSubject } from 'rxjs';
import Chedda from '../../artifacts/Chedda.json'
import { DefaultProviderService } from '../providers/default-provider.service';
import { WalletProviderService } from '../providers/wallet-provider.service';

@Injectable({
  providedIn: 'root'
})
export class CheddaService {

  cheddaContract: any
  approvalSubject: BehaviorSubject<any> = new BehaviorSubject(null)
  transferSubject: BehaviorSubject<any> = new BehaviorSubject(null)
  
  constructor(provider: DefaultProviderService, private wallet: WalletProviderService, private http: HttpClient) {
    this.cheddaContract = new ethers.Contract(
      wallet.currentConfig.contracts.Chedda,
      Chedda.abi,
      provider.provider
      );
      this.registerEventListeners()
  }

  async balanceOf(address: string): Promise<BigNumber> {
    return await this.cheddaContract.balanceOf(address)
  }

  async allowance(account: string, spender: string): Promise<BigNumber> {
    return await this.cheddaContract.allowance(account, spender)
  }
  
  async totalSupply(): Promise<BigNumber> {
    return await this.cheddaContract.totalSupply()
  }

  async apr(): Promise<BigNumber> {
    return (await this.cheddaContract.apr()).mul(10)
  }

  async rebase() {
    await this.cheddaContract.connect(this.wallet.signer).rebase()
  }

  async approve(spender: string, amount?: string) {
    if (!amount) {
      amount = await this.cheddaContract.totalSupply();
    }
    return this.cheddaContract.connect(this.wallet.signer).approve(spender, amount)
  }

  address(): string {
    return this.wallet.currentConfig.contracts.Chedda
  }

  private async registerEventListeners() {
    this.cheddaContract.on('Approval', async (account, spender, amount) => {
      console.log('Approval: ', account, spender, amount)
      this.approvalSubject?.next({
        account,
        spender,
        amount
      })
    })
    this.cheddaContract.on('Transfer', async (from, to, amount) => {
      console.log('Transfer: ', from, to, amount)
      this.transferSubject?.next({
        from,
        to,
        amount
      })
    })
  }
}
