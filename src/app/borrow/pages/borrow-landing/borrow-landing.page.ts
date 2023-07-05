import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonSegment, IonSelect } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { CheddaBaseTokenVaultService } from 'src/app/contracts/chedda-base-token-vault.service';
import { PriceOracleService } from 'src/app/contracts/price-oracle.service';
import { LendingPool, Loan } from 'src/app/lend/lend.models';
import { EnvironmentProviderService } from 'src/app/providers/environment-provider.service';
import { VaultStatsService } from 'src/app/providers/vault-stats.service';
import { WalletProviderService } from 'src/app/providers/wallet-provider.service';
@Component({
  selector: 'app-borrow-landing',
  templateUrl: './borrow-landing.page.html',
  styleUrls: ['./borrow-landing.page.scss'],
})
export class BorrowLandingPage implements OnInit, OnDestroy {
  @ViewChild('segmentControl') segmentControl: IonSegment
  @ViewChild('filterSelect') filterSelect: IonSelect
  currentSegment = 'items'
  accountSubscription?: Subscription
  account
  lendingPoolsSubscription:Subscription
  lendingPools: LendingPool[] = []
  currency
  vaultContract
  netWorkChangeSubscription: Subscription;

  constructor(
    private wallet: WalletProviderService,
    private priceFeed: PriceOracleService,
    private vaultService: CheddaBaseTokenVaultService,
    private vaultStatsService: VaultStatsService,
    private environmentService: EnvironmentProviderService
    
    ) { }
  
  async ngOnInit() {
    this.currency = this.environmentService.environment.config.networkParams.nativeCurrency.name
    this.vaultContract = this.vaultService.contractAt(this.environmentService.environment.config.contracts.CheddaBaseTokenVault)
    await this.vaultStatsService.loadVaultStats()
    this.registerEventListener()
  }

  async ngOnDestroy() {
    this.accountSubscription?.unsubscribe();
    this.lendingPoolsSubscription?.unsubscribe();
  }

  onSegmentChanged(event) {
    this.currentSegment = this.segmentControl.value
  }

  async registerEventListener() {
    this.accountSubscription = this.wallet.accountSubject.subscribe(newAccount => {
      this.account = newAccount
    })

    this.lendingPoolsSubscription = this.vaultStatsService.lendingPoolsSubject.subscribe(lendingPools => {
      this.lendingPools = lendingPools
    })

    this.netWorkChangeSubscription = this.environmentService.environmentSubject.subscribe(async network => {
      if(network){
        await this.vaultStatsService.loadVaultStats();
      }
    })
  }
}
