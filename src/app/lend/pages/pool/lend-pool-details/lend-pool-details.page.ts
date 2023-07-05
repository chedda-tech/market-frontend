import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonInput, LoadingController, NavController } from '@ionic/angular';
import { BigNumber, ethers } from 'ethers';
import { BehaviorSubject, Subscription } from 'rxjs';
import { CheddaBaseTokenVaultService } from 'src/app/contracts/chedda-base-token-vault.service';
import { TokenService } from 'src/app/contracts/token.service';
import { LendingPool } from 'src/app/lend/lend.models';
import { WalletProviderService } from 'src/app/providers/wallet-provider.service';
import { GlobalAlertService } from 'src/app/shared/global-alert.service';
import { EnvironmentProviderService } from 'src/app/providers/environment-provider.service';import { VaultStatsService } from 'src/app/providers/vault-stats.service';
import { ModalController } from '@ionic/angular';
import { LoadingModalComponent } from 'src/app/shared/components/loading-modal/loading-modal.component';

export interface VaultStats {
  borrowApr: number
  depositApr: number
  rewardsApr: number
  liquidity: BigNumber
  utilization: BigNumber
}
@Component({
  selector: 'app-lend-pool-details',
  templateUrl: './lend-pool-details.page.html',
  styleUrls: ['./lend-pool-details.page.scss'],
})
export class LendPoolDetailsPage implements OnInit, OnDestroy {

  @ViewChild('depositInput') depositInput:ElementRef;
  @ViewChild('withdrawInput') withdrawInput:ElementRef;
  isApproved = false
  asset
  vaultContract
  stats?: VaultStats
  assetApprovalSubjet = new BehaviorSubject(null)
  approvalEventListener
  depositEventListener
  withdrawEventListener
  walletSubscription?: Subscription
  myAssetBalance
  myVaultSharesBalance = '0'
  totalVaultAssets = '0'
  assetSymbol
  vaultTokenSymbol
  loader?
  utilizationRate = '0'
  depositApy = '0'
  rewardsApy = '0'
  utilizationPrecision = BigNumber.from(1000000000000)
  aprPrecision = BigNumber.from(100000000000)
  routeSubscription: Subscription
  pool: LendingPool
  isDepositCheddaTab: boolean = true;
  netWorkChangeSubscription: Subscription;

  constructor(
    private tokenService: TokenService, 
    private vaultService: CheddaBaseTokenVaultService,
    private vaultStatsService: VaultStatsService,
    private wallet: WalletProviderService,
    private route: ActivatedRoute,
    private router: Router,
    private navController: NavController,
    private alert: GlobalAlertService,
    private modalController: ModalController, 
    private environmentService: EnvironmentProviderService
    ) { }

  async ngOnInit() {
    await this.setup()
  }

  ngOnDestroy(): void {
    this.walletSubscription?.unsubscribe();
    this.netWorkChangeSubscription?.unsubscribe();
  }

  private async setup() {
    this.routeSubscription = this.route.paramMap.subscribe(async paramMap => {
      if (!paramMap.has('id')) {
        this.navigateBack()
        return
      }
      const poolId = paramMap.get('id')
      this.pool = this.findPoolWithId(poolId)
      if (!this.pool) {
        console.warn('pool id not found')
        this.navigateBack()
        return
      }
      this.vaultContract = this.vaultService.contractAt(poolId)
      console.log('vaultcontract = ', this.vaultContract)
      if (!this.vaultContract) { 
        this.navigateBack()
        return
      }
      this.asset = this.tokenService.contractAt(this.pool.asset.address)
      console.log('asset = ', this.asset)
      console.log('asset address = ', this.asset.address)
      this.assetSymbol = await this.tokenService.symbol(this.asset)
      this.vaultTokenSymbol = await this.tokenService.symbol(this.vaultContract)

      await this.loadVaultStats()
      await this.checkAllowance()
      this.registerEventListeners()
    })
  }

  private findPoolWithId(id: string): LendingPool | null {
    for (const pool of this.environmentService.environment.config.pools) {
      if (pool.address.toLowerCase() == id.toLocaleLowerCase()) {
        return pool
      }
    }
    return null
  }

  private async loadVaultStats() {
    const stats = await this.vaultService.getVaultStats(this.vaultContract)
    console.log('stats = ', stats)
    this.utilizationRate = ethers.utils.formatEther(stats.utilization.mul(100))
    this.depositApy = ethers.utils.formatEther(stats.depositApr.mul(1000)) // todo: Should be .mul(100)
    this.rewardsApy = ethers.utils.formatEther(stats.rewardsApr.mul(100))
    this.totalVaultAssets = ethers.utils.formatEther(stats.liquidity)
    if (!this.wallet || !this.wallet.currentAccount) {
      return
    }
    this.myAssetBalance = ethers.utils.formatEther(await this.tokenService.balanceOf(this.asset, this.wallet.currentAccount))

    this.myVaultSharesBalance = ethers.utils.formatEther(
      await this.tokenService.balanceOf(this.vaultContract, this.wallet.currentAccount))
    
  }

  async approveAsset() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert()
      return
    }
    try {
      this.showLoading('Waiting for Approval')
      const totalSupply = await this.tokenService.totalSupply(this.asset)
      await this.tokenService.approve(this.asset, this.vaultContract.address, totalSupply)
    } catch (error) {
      this.alert.showErrorAlert(error)
      this.hideLoading()
    }
  }

  async deposit() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert()
      return
    }
    try {
      await this.showLoading('Waiting for Confirmation')
      const amount = ethers.utils.parseUnits(this.depositInput.nativeElement.value.toString() ?? '0')
      this.depositInput.nativeElement.value = ''
      await this.vaultService.depositAsset(this.vaultContract, amount, this.wallet.currentAccount) 
    } catch (error) {
      await this.hideLoading()
      this.alert.showErrorAlert(error)
    }
  }

  async redeem() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert()
      return
    }
    try {
      await this.showLoading('Waiting for Confirmation')
      const amount = ethers.utils.parseUnits(this.withdrawInput.nativeElement.value.toString() ?? '0')
      this.withdrawInput.nativeElement.value = ''
      await this.vaultService.redeem(this.vaultContract, amount, this.wallet.currentAccount) 
    } catch (error) {
      await this.hideLoading()
      this.alert.showErrorAlert(error)
    }
  }  

  fillMaxDeposit() {
    this.depositInput.nativeElement.value = this.myAssetBalance
  }

  fillMaxWithdraw() {
    this.withdrawInput.nativeElement.value = this.myVaultSharesBalance
  }

  navigateToMarkets(){
    this.router.navigate(['/lend']);
  }

  private async registerEventListeners() {
    this.assetApprovalSubjet = this.asset.on('Approval', async (account, spender, amount) => {
      console.log('Approval: ', account, spender, amount)
      if (account.toLowerCase() === this.wallet.currentAccount.toLowerCase()) {
        this.hideLoading()
        this.isApproved = true
      }
    }) 

    this.depositEventListener = this.vaultContract.on('Deposit', async (from, to, amount, shares) => {
      console.log('deposit posted: ', from, to, amount, shares)
      if (from.toLowerCase() == this.wallet.currentAccount.toLowerCase()) {
        this.hideLoading()
        this.alert.showToast('Deposit confirmed')
        await this.loadVaultStats()
        await this.vaultStatsService.loadStats(this.pool)
      }
    })
    this.withdrawEventListener = this.vaultContract.on('Withdraw', async (from, to, amount, shares) => {
      if (from.toLowerCase() == this.wallet.currentAccount.toLowerCase()) {
        this.hideLoading()
        this.alert.showToast('Withdrawal confirmed')
        await this.loadVaultStats()
        await this.vaultStatsService.loadStats(this.pool)
      }
    })

    this.wallet.accountSubject.subscribe(wallet => {
      this.loadVaultStats()
    })

    this.netWorkChangeSubscription = this.environmentService.environmentSubject.subscribe(async network => {
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      if(network && (network.config.networkParams.chainId.toLocaleLowerCase() !== chainId)){
        this.navigateBack();
      }
    })
  }

  async switchDepositCheddaTab(isDepositTab:boolean){
    this.isDepositCheddaTab = isDepositTab
  }

  private async checkAllowance() {
    if (!this.wallet || !this.wallet.currentAccount) {
      return
    }
    const allowance = await this.tokenService.allowance(this.asset, this.wallet.currentAccount, this.vaultContract.address)
    this.isApproved = allowance.gt(ethers.utils.parseUnits("1000"))
  }

  private async showLoading(message: string) {
    this.loader = await this.modalController.create({
      component: LoadingModalComponent,
      componentProps:{
        'message': message
      }
    })
    return await this.loader?.present()
  }

  private async hideLoading() {
    await this.loader?.dismiss()
  }

  private navigateBack() {
    this.navController.navigateBack('/lend')
  }
}
