import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonInput, IonRange, LoadingController } from '@ionic/angular';
import { BigNumber, ethers } from 'ethers';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { CheddaService } from 'src/app/contracts/chedda.service';
import { FaucetService } from 'src/app/contracts/faucet.service';
import { StakedCheddaService } from 'src/app/contracts/staked-chedda.service';
import { VeCheddaService } from 'src/app/contracts/ve-chedda.service';
import { WalletProviderService } from 'src/app/providers/wallet-provider.service';
import { GlobalAlertService } from 'src/app/shared/global-alert.service';
import { environment } from 'src/environments/environment';

interface Token {
  name: string
  logo: string
  address: string
  isNFT?: boolean
}

@Component({
  selector: 'app-grotto-landing',
  templateUrl: './grotto-landing.page.html',
  styleUrls: ['./grotto-landing.page.scss'],
})
export class GrottoLandingPage implements OnInit, OnDestroy {

  @ViewChild('stakeInput') stakeInput: IonInput
  @ViewChild('unstakeInput') unstakeInput: IonInput
  @ViewChild('lockInput') lockInput: IonInput
  @ViewChild('unlockInput') unlockInput: IonInput
  @ViewChild('lockRange')lockRange: IonRange
  cheddaTotalSupply
  myCheddaBalance = '0'
  myStakedCheddaBalance = '0'
  myVeCheddaBalance = '0'
  myXCheddaLocked = '0'
  cheddaStakingAPR
  currentStakeSegment = 'stake'
  currentLockSegment = 'lock'
  loader?
  isCheddaApproved = false
  isXCheddaApproved = false
  cheddaApprovalSubscription?: Subscription
  xCheddaApprovalSubscription?: Subscription
  cheddaTransferSubscription?: Subscription
  xCheddaDepositSubscription?: Subscription
  veCheddaDepositSubscription?: Subscription
  withdrawSubscription?: Subscription
  lockExpiry: string

  tokens: Token[] = [
    {
      name: 'CHEDDA',
      logo: '/assets/logos/chedda-logo-square.png',
      address: environment.config.contracts.Chedda
    },
    {
      name: 'USDC.c',
      logo: '/assets/logos/usd-coin-logo.png',
      address: environment.config.contracts.USDC
    },
    {
      name: 'DAI.c',
      logo: '/assets/logos/dai-logo.png',
      address: environment.config.contracts.DAI
    },
    {
      name: 'UXD',
      logo: '/assets/logos/uxd-logo.png',
      address: environment.config.contracts.UXD
    },
    {
      name: environment.config.pools[0].collateral[0].symbol,
      logo: environment.config.pools[0].collateral[0].logo,
      address: environment.config.pools[0].collateral[0].address
    },
    {
      name: 'WGK',
      logo: '/assets/logos/wgk-logo.png',
      address: environment.config.contracts.NFT,
      isNFT: true 
    }
  ]
  constructor(
    private faucet: FaucetService,
    private wallet: WalletProviderService,
    private chedda: CheddaService,
    private xChedda: StakedCheddaService,
    private veChedda: VeCheddaService,
    private alert: GlobalAlertService,
    private loadingController: LoadingController) {

      // Checks if acount is changed or disconnected
      // Updates chedda balance according to account selected 
      let eth:any = window.ethereum
      eth.on('accountsChanged', (accounts: any) => {
          this.loadCheddaStats()
          this.loadVeCheddaStats()
      });
    }


  async ngOnInit() {
    await this.loadCheddaStats()
    await this.loadVeCheddaStats()
    await this.checkAllowance()
    await this.listenForEvents()
  }

  ngOnDestroy(): void {
    this.cheddaApprovalSubscription?.unsubscribe()
    this.xCheddaApprovalSubscription?.unsubscribe()
    this.cheddaTransferSubscription?.unsubscribe()
    this.xCheddaDepositSubscription?.unsubscribe()
    this.withdrawSubscription?.unsubscribe()
  }

  async loadCheddaStats() {
    try {
      this.cheddaTotalSupply = ethers.utils.formatEther(await this.chedda.totalSupply())
      this.cheddaStakingAPR = (ethers.utils.formatEther(await this.chedda.apr())).toString()
      console.log('apr = ', this.cheddaStakingAPR)
      if (this.wallet.isConnected && this.wallet.currentAccount) {
        this.myCheddaBalance = ethers.utils.formatEther(await this.chedda.balanceOf(this.wallet.currentAccount))
        this.myStakedCheddaBalance = ethers.utils.formatEther(await this.xChedda.balanceOf(this.wallet.currentAccount))
      } else {
        this.myCheddaBalance = '0'
        this.myStakedCheddaBalance = '0'
      }
    } catch (error) {
      this.alert.showErrorAlert(error) 
    }
  }

  async loadVeCheddaStats() {
    try {
      if (this.wallet.isConnected && this.wallet.currentAccount) {
        this.myVeCheddaBalance = ethers.utils.formatEther(await this.veChedda.balanceOf(this.wallet.currentAccount))
        this.myXCheddaLocked = ethers.utils.formatEther(await this.veChedda.lockedAmount(this.wallet.currentAccount))
        const lockExpiry = (await this.veChedda.lockedEnd(this.wallet.currentAccount)).mul(1000).toString()
        console.log(lockExpiry)
        this.lockExpiry = lockExpiry
      } else {
        this.myVeCheddaBalance = '0'
        this.myXCheddaLocked = '0'
      }
    } catch (error) {
      this.alert.showErrorAlert(error) 
    }
  }

  async addTokenToMetamask(token) {
    try {
      await this.wallet.addToken(token.address, token.name, 18)
    } catch (error) {
      this.alert.showErrorAlert(error)
    }
  }

  async drip(token: Token) {
    if (!this.wallet.isConnected) {
      this.alert.showConnectAlert()
      return
    }
    let accountBalance = await this.wallet.checkBalance()
    if (accountBalance.eq(BigNumber.from(0))) {
      this.alert.showInsufficientBalanceAlert()
      return
    }
    try {
      // if isNFT, mint
      if (token.isNFT) {
        const tx = await this.faucet.mint(token.address)
        console.log('mint tx = ', tx)
      } else {
        const tx = await this.faucet.drip(token.address)
        console.log('drip tx = ', tx)
      }
      await this.alert.showToast('Drip request sent to faucet')
    } catch (error) {
      await this.hideLoading()
      await this.alert.showErrorAlert(error)
    }
  }

  async stake() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert()
      return
    }
    const amount = ethers.utils.parseEther(this.stakeInput.value.toString() ?? '0')
    const cheddaBalance = ethers.utils.parseEther(this.myCheddaBalance)
    console.log('amount to stake: ', amount)
    if (amount.gt(cheddaBalance)){
      this.alert.showMessageAlert('Can not stake', 'Insufficient CHEDDA balance')
      return
    }
    try {
      await this.showLoading('Waiting for confirmation')
      await this.xChedda.stake(amount)
      this.stakeInput.value = ''
    } catch (error) {
      await this.hideLoading()
      this.alert.showErrorAlert(error)
    }
  }

  async unstake() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert()
      return
    }
    const amount = ethers.utils.parseEther(this.unstakeInput.value.toString() ?? '0')
    const stakedBalance = ethers.utils.parseEther(this.myStakedCheddaBalance)
    if (amount.gt(stakedBalance)){
      this.alert.showMessageAlert('Can not unstake', 'Insufficient sCHEDDA balance')
      return
    }
    try {
      this.showLoading('Waiting for confirmation')
      await this.xChedda.unstake(amount)
      this.unstakeInput.value = ''
    } catch (error) {
      this.alert.showErrorAlert(error)
    }
  }

  async lock() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert()
      return
    }
    try {
      const lockInputValue = this.lockInput.value
      if (!lockInputValue) {
        this.alert.showToast('Invalid lock time')
        return
      }
      const amount = ethers.utils.parseEther(lockInputValue.toString())
      const weeks = this.lockRange.value.toString()
      const unlockTime = moment().add(weeks, 'weeks').unix()
      console.log('unlock time = ', unlockTime)
      console.log('amount = ', amount)
      await this.veChedda.createLock(amount, BigNumber.from(unlockTime))
    } catch (error) {
      this.alert.showErrorAlert(error)
    }

  }

  async withdraw() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert()
      return
    }
    try {
      await this.veChedda.withdraw()
    } catch (error) {
      this.alert.showErrorAlert(error)
    }
  }

  async approveChedda() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert()
      return
    }
    try {
      await this.showLoading('Waiting for approval')
      await this.chedda.approve(this.xChedda.address())
    } catch (error) {
      this.isCheddaApproved = false
      await this.hideLoading()
      await this.alert.showErrorAlert(error)
    }
  }

  async approveStakedChedda() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert()
      return
    }
    try {
      await this.showLoading('Waiting for approval')
      await this.xChedda.approve(this.veChedda.address())
    } catch (error) {
      this.isXCheddaApproved = false
      this.hideLoading()
      await this.alert.showErrorAlert(error)
    }
  } 

  onStakeSegmentChanged($event) {
    this.currentStakeSegment = $event.target.value
  }

  onLockSegmentChanged($event) {
    this.currentLockSegment = $event.target.value
  }

  fillMaxStake() {
    this.stakeInput.value = this.myCheddaBalance
  }

  fillMaxUnstake() {
    this.unstakeInput.value = this.myStakedCheddaBalance
  }

  fillMaxLock() {
    this.lockInput.value = this.myStakedCheddaBalance
  }

  fillMaxUnlock() {
    this.unlockInput.value = ''
  }

  private async showLoading(message: string) {
    this.loader = await this.loadingController.create({
      message
    })
    await this.loader?.present()
  }

  private async hideLoading() {
    console.log('hiding loader')
    await this.loader?.dismiss()
  }

  private async checkAllowance() {
    if (!this.wallet || !this.wallet.currentAccount) {
      return
    }
    const allowance = await this.chedda.allowance(this.wallet.currentAccount, this.xChedda.address())
    this.isCheddaApproved = allowance.gt(ethers.utils.parseUnits("1000"))
  }

  private async listenForEvents() {
    this.cheddaApprovalSubscription = this.chedda.approvalSubject.subscribe(async res => {
      if (res && res.account && res.account.toLowerCase() === this.wallet.currentAccount.toLowerCase()) {
        this.isCheddaApproved = true
        await this.hideLoading()
      }
    })

    this.xCheddaApprovalSubscription = this.xChedda.approvalSubject.subscribe(async res => {
      if (res && res.account && res.account.toLowerCase() === this.wallet.currentAccount.toLowerCase()) {
        this.isXCheddaApproved = true
        await this.hideLoading()
      }
    })

    this.cheddaTransferSubscription = this.chedda.transferSubject.subscribe(async res => {
      if (res && res.to.toLowerCase() === this.wallet.currentAccount.toLowerCase()) {
        await this.hideLoading()
        await this.alert.showToast('CHEDDA transfer received')
        await this.loadCheddaStats()
      }
    })

    this.xCheddaDepositSubscription = this.xChedda.depositSubject.subscribe(async res => {
      console.log('deposit received: ', res)
      if (this.wallet && this.wallet.currentAccount && res && res.from.toLowerCase() == this.wallet.currentAccount.toLowerCase()) {
        await this.hideLoading()
        await this.alert.showToast('Stake confirmed')
        await this.loadCheddaStats()
      }
    })

    this.veCheddaDepositSubscription = this.veChedda.depositSubject.subscribe(async res => {
      console.log('deposit received: ', res)
      if (this.wallet && this.wallet.currentAccount && res && res.address.toLowerCase() == this.wallet.currentAccount.toLowerCase()) {
        await this.hideLoading()
        await this.alert.showToast('Lock created')
        await this.loadVeCheddaStats()
      }
    }) 

    this.withdrawSubscription = this.xChedda.withdrawSubject.subscribe(async res => {
      console.log('withdraw received: ', res)
      if (this.wallet && this.wallet.currentAccount && res && res.from.toLowerCase() == this.wallet.currentAccount.toLowerCase()) {
        await this.hideLoading()
        await this.alert.showToast('Withdrawal confirmed')
        await this.loadCheddaStats()
      }
    })
  }
}

