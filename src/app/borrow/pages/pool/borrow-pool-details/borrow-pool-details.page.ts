import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { ethers } from 'ethers';
import { Subscription } from 'rxjs';
import { CheddaBaseTokenVaultService } from 'src/app/contracts/chedda-base-token-vault.service';
import { CheddaDebtTokenService } from 'src/app/contracts/chedda-debt-token.service';
import { MarketNftService } from 'src/app/contracts/market-nft.service';
import { PriceOracleService } from 'src/app/contracts/price-oracle.service';
import { TokenService } from 'src/app/contracts/token.service';
import { LendingPool } from 'src/app/lend/lend.models';
import { VaultStatsService } from 'src/app/providers/vault-stats.service';
import { WalletProviderService } from 'src/app/providers/wallet-provider.service';
import { LoadingModalComponent } from 'src/app/shared/components/loading-modal/loading-modal.component';
import { GlobalAlertService } from 'src/app/shared/global-alert.service';
import { NFTMetadata } from 'src/app/shared/models/nft.model';
import { EnvironmentProviderService } from 'src/app/providers/environment-provider.service';


enum BorrowMode {
  borrow = 'borrow',
  collateral = 'collateral',
}

enum RepayMode {
  repay = 'repay',
  collateral = 'collateral',
}

@Component({
  selector: 'app-borrow-pool-details',
  templateUrl: './borrow-pool-details.page.html',
  styleUrls: ['./borrow-pool-details.page.scss'],
})
export class BorrowPoolDetailsPage implements OnInit, OnDestroy {
  @ViewChild('addCollateralInput') addCollateralInput: ElementRef;
  @ViewChild('borrowInput') borrowInput: ElementRef;
  @ViewChild('withdrawCollateralInput') withdrawCollateralInput: ElementRef;
  @ViewChild('repayInput') repayInput: ElementRef;

  isApproved = false;
  myCollateral;
  collateralType = '';
  collateralContract;
  vaultContract;
  debtContract;
  collateralTokeName;
  collateralTokenSymbol;
  loader;
  myCollateralTokenBalance;
  myCollateralDeposited = '0';
  myAmountOwed = '0';
  collaterals = [];
  selectedNfts: NFTMetadata[] = [];
  ownedNFTs: NFTMetadata[] = [];
  myNftsCollateral: NFTMetadata[] = [];
  utilizationRate = '0';
  depositApy = '0';
  rewardsApy = '0';
  totalVaultAssets;
  assetSymbol;
  maxBorrowAmount; // TODO: update maxLTV to 75% and use remaining borrow amount instead of total borrow
  maxLTV = 65; // 65 %
  collateralApprovalListener;
  depositListener;
  borrowListener;
  repayListener;
  withdrawListener;
  borrowMode: BorrowMode = BorrowMode.collateral;
  repayMode: RepayMode = RepayMode.repay;
  routeSubscription: Subscription;
  pool: LendingPool;
  isBorrowCheddaTab: boolean = true;
  netWorkChangeSubscription: Subscription;

  constructor(
    private tokenService: TokenService,
    private vaultService: CheddaBaseTokenVaultService,
    private debtService: CheddaDebtTokenService,
    private wallet: WalletProviderService,
    private nftService: MarketNftService,
    private modalController: ModalController,
    private priceFeed: PriceOracleService,
    private route: ActivatedRoute,
    private navController: NavController,
    private alert: GlobalAlertService,
    private vaultStatsService: VaultStatsService,
    private router: Router,
    private environmentService: EnvironmentProviderService

  ) {}

  async ngOnInit() {
    await this.setup();
  }
  ngOnDestroy(): void {
    this.netWorkChangeSubscription?.unsubscribe();
  }

  private async setup() {
    this.routeSubscription = this.route.paramMap.subscribe(async (paramMap) => {
      if (!paramMap.has('id')) {
        this.navigateBack();
        return;
      }

      const poolId = paramMap.get('id');
      this.pool = this.findPoolWithId(poolId);
      if (!this.pool) {
        console.warn('pool with id not found: ', poolId);
        this.navigateBack();
        return;
      }

      this.assetSymbol = this.pool.asset.symbol;
      this.collaterals = this.pool.collateral;
      this.collateralTokeName = this.pool.collateral[0].name;
      this.collateralTokenSymbol = this.pool.collateral[0].symbol;
      this.vaultContract = this.vaultService.contractAt(poolId);
      this.collateralContract = this.tokenService.contractAt(
        this.pool.collateral[0].address
      );
      this.debtContract = this.debtService.contractAt(
        await this.vaultContract.debtToken()
      );
      if (!this.vaultContract) {
        this.navigateBack();
        return;
      }

      await this.loadVaultStats();
      await this.checkAllowance();
      this.registerForEvents();
    });

  }

  private findPoolWithId(id: string): LendingPool | null {
    for (const pool of this.environmentService.environment.config.pools) {
      if (pool.address.toLowerCase() == id.toLocaleLowerCase()) {
        return pool;
      }
    }
    return null;
  }

  async switchBorrowCheddaTab(isBorrowTab:boolean){
    this.isBorrowCheddaTab = isBorrowTab
    this.selectedNfts = []
  }

  onCollateralTypeChanged(selectValue: string) {
    try {
      this.changeCollateral(selectValue);
    } catch (error) {
      console.error('changeCollateral error: ', error);
    }
  }

  navigateToMarkets(){
    this.router.navigate(['/borrow']);
  }

  private async changeCollateral(symbol: string) {
    let found = false;
    for (const c of this.pool.collateral) {
      if (c.symbol === symbol) {
        this.collateralContract = this.tokenService.contractAt(
          c.address,
          c.isNFT
        );
        this.collateralContract.isNFT = c.isNFT;
        found = true;
        break;
      }
    }

    if (found) {
      this.collateralTokenSymbol = symbol;
      await this.checkCollateralPrice()
      await this.updateCollateralBalances();
      await this.registerCollateralEvents();
      await this.checkAllowance();
      if (this.collateralContract.isNFT) {
        await this.fetchOwnedTokens()
        await this.fetchDepositedNfts()
      }
    } else {
      this.alert.showToast('Invalid collateral');
    }
  }

  private async checkCollateralPrice() {
    if (!this.collateralContract) {
      return
    }
    console.log('checking collateral price: ')
    const price = await this.priceFeed.getAssetPrice(this.collateralContract.address)
    console.log('***price = ', ethers.utils.formatEther(price))
  }
  private async updateCollateralBalances() {
    if (!(this.wallet && this.wallet.currentAccount)) {
      return;
    }
    this.myCollateralTokenBalance = ethers.utils.formatEther(
      await this.tokenService.balanceOf(
        this.collateralContract,
        this.wallet.currentAccount
      )
    );
    this.myCollateralDeposited = ethers.utils.formatEther(
      (
        await this.vaultService.collateral(
          this.vaultContract,
          this.wallet.currentAccount,
          this.collateralContract.address
        )
      ).amount
    )
  }

  private async loadVaultStats() {
    const stats = await this.vaultService.getVaultStats(this.vaultContract);
    this.utilizationRate = ethers.utils.formatEther(stats.utilization.mul(100));
    this.depositApy = ethers.utils.formatEther(stats.depositApr.mul(1000)); // todo: Should be .mul(100)
    this.rewardsApy = ethers.utils.formatEther(stats.rewardsApr.mul(100));
    this.totalVaultAssets = ethers.utils.formatEther(stats.liquidity);
    if (this.wallet && this.wallet.currentAccount) {
      await this.updateCollateralBalances();
      const collateralValue =
        await this.vaultService.totalAccountCollateralValue(
          this.vaultContract,
          this.wallet.currentAccount
        );
        const cv = ethers.utils.parseEther(collateralValue.toString())
        console.log('collateralValue = ', collateralValue.toString())
      const maxLoanAmount = collateralValue.mul(this.maxLTV).div(100);
      const collateral = await this.vaultService.collateral(
        this.vaultContract,
        this.wallet.currentAccount,
        this.collateralContract.address
      );
      const borrowed = await this.debtService.debtOf(
        this.debtContract,
        this.wallet.currentAccount
      );
      this.myAmountOwed = ethers.utils.formatEther(borrowed);
      this.maxBorrowAmount = ethers.utils.formatEther(
        maxLoanAmount.sub(borrowed)
      );
      this.myCollateral = ethers.utils.parseEther(collateral.amount.toString());
    }
  }

  fillMaxDeposit() {
    this.setBorrowMode(BorrowMode.collateral);
    this.addCollateralInput.nativeElement.value = this.myCollateralTokenBalance;
  }

  fillMaxBorrow() {
    this.setBorrowMode(BorrowMode.borrow);
    this.borrowInput.nativeElement.value = this.maxBorrowAmount;
  }

  fillMaxWithdraw() {
    this.setRepayMode(RepayMode.collateral);
    this.withdrawCollateralInput.nativeElement.value = this.myCollateralDeposited;
  }

  fillMaxRepay() {
    this.setRepayMode(RepayMode.repay);
    this.repayInput.nativeElement.value = this.myAmountOwed;
  }

  async approveCollateral() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert();
      return;
    }
    try {
      this.showLoading('Waiting for Approval');
      const totalSupply = await this.tokenService.totalSupply(
        this.collateralContract
      );
      await this.tokenService.approve(
        this.collateralContract,
        this.vaultContract.address,
        totalSupply
      );
    } catch (error) {
      this.alert.showErrorAlert(error);
      this.hideLoading();
    }
  }

  async addCollateral() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert();
      return;
    }
    try {
      await this.showLoading('Waiting for Confirmation');
      if (this.collateralContract.isNFT) {
        const tokenIds = this.selectedNfts.map(t => t.edition.toString())
        await this.vaultService.addCollateral721(
          this.vaultContract, 
          this.collateralContract.address,
          tokenIds
        )
      } else {
        const amount = ethers.utils.parseUnits(
          this.addCollateralInput.nativeElement.value.toString() ?? '0'
        );
        this.addCollateralInput.nativeElement.value = '';
        await this.vaultService.addCollateral(
          this.vaultContract,
          this.collateralContract.address,
          amount
        ); 
      }
      
    } catch (error) {
      this.hideLoading();
      this.alert.showErrorAlert(error);
    }
  }

  async removeCollateral() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert();
      return;
    }
    try {
      await this.showLoading('Waiting for Confirmation');
      if (this.collateralContract.isNFT) {
        const tokenIds = this.selectedNfts.map(t => t.edition.toString())
        await this.vaultService.removeCollateral721(
          this.vaultContract,
          this.collateralContract.address,
          tokenIds
        )
    } else {
        const amount = ethers.utils.parseUnits(
          this.withdrawCollateralInput.nativeElement.value.toString() ?? '0'
        );
        this.withdrawCollateralInput.nativeElement.value = '';
        await this.vaultService.removeCollateral(
          this.vaultContract,
          this.collateralContract.address,
          amount
        );
      }
      
    } catch (error) {
      this.hideLoading();
      this.alert.showErrorAlert(error);
    }
  }

  async borrowAsset() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert();
      return;
    }
    try {
      await this.showLoading('Waiting for Confirmation');
      const amount = ethers.utils.parseUnits(
        this.borrowInput.nativeElement.value.toString() ?? '0'
      );
      this.borrowInput.nativeElement.value = '';
      await this.vaultService.borrow(this.vaultContract, amount);
    } catch (error) {
      this.hideLoading();
      this.alert.showErrorAlert(error);
    }
  }

  async repay() {
    if (!this.wallet.currentAccount) {
      this.alert.showConnectAlert();
      return;
    }
    try {
      await this.showLoading('Waiting for Confirmation');
      const amount = ethers.utils.parseUnits(
        this.repayInput.nativeElement.value.toString() ?? '0'
      );
      this.repayInput.nativeElement.value = '';
      await this.vaultService.repay(this.vaultContract, amount);
    } catch (error) {
      this.hideLoading();
      this.alert.showErrorAlert(error);
    }
  }

  setBorrowMode(mode) {
    this.borrowMode = mode;
    if (mode == BorrowMode.borrow && this.addCollateralInput) {
      this.addCollateralInput.nativeElement.value = '';
    } else if (this.borrowInput) {
      this.borrowInput.nativeElement.value = '';
    }
  }

  setRepayMode(mode) {
    this.repayMode = mode;
    if (mode == RepayMode.repay && this.withdrawCollateralInput) {
      this.withdrawCollateralInput.nativeElement.value = '';
    } else if (this.repayInput) {
      this.repayInput.nativeElement.value = '';
    }
  }

  private async checkAllowance() {
    if (!this.wallet || !this.wallet.currentAccount) {
      return;
    }
    const allowance = await this.tokenService.allowance(
      this.collateralContract,
      this.wallet.currentAccount,
      this.vaultContract.address
    );
    // in case of NFT we only get a true/false
    if (typeof allowance == 'boolean') {
      this.isApproved = allowance;
    } else {
      this.isApproved = allowance.gt(ethers.utils.parseUnits('1000'));
    }
  }

  private async fetchOwnedTokens() {
    if (!this.wallet || !this.wallet.currentAccount || !this.collateralContract) {
      return [];
    }
    const ownedTokenIds = await this.tokenService.ownedTokens(
      this.collateralContract,
      this.wallet.currentAccount
    );
    this.ownedNFTs = await this.nftService.fetchNFTMetadata(
      this.collateralContract,
      ownedTokenIds
    );
  }

  private async fetchDepositedNfts() {
    if (!this.wallet || !this.wallet.currentAccount || !this.collateralContract) {
      return [];
    } 
    const depositedTokenIds = await this.vaultService.accountCollateralTokenIds(
      this.vaultContract,
      this.wallet.currentAccount,
      this.collateralContract.address
    )
    this.myNftsCollateral = await this.nftService.fetchNFTMetadata(
      this.collateralContract,
      depositedTokenIds
    ); 
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
    await this.loader?.dismiss();
  }

  private async registerCollateralEvents() {
    this.collateralContract.off('Approval');
    try {
      this.collateralApprovalListener = this.collateralContract.on(
        'Approval',
        async (account, spender, amount) => {
          if (
            account.toLowerCase() === this.wallet.currentAccount.toLowerCase()
          ) {
            this.hideLoading();
            this.isApproved = true;
          }
        }
      );
      this.collateralContract.on(
        'ApprovalForAll', async (account, spender, approved) => {
          if (account.toLowerCase() === this.wallet.currentAccount.toLowerCase() && approved) {
            this.hideLoading();
            this.isApproved = true;
          }
        }
      )
    } catch (err) {
      console.log(err)
    }
  }

  private async registerForEvents() {
    await this.registerCollateralEvents();
    this.depositListener = this.vaultContract.on(
      'OnCollateralAdded',
      async (token, by, amount, shares) => {
        if (by.toLowerCase() == this.wallet.currentAccount.toLowerCase()) {
          this.hideLoading();
          this.alert.showToast('Deposit confirmed');
          if (this.collateralContract.isNFT) {
            await this.fetchOwnedTokens()
            await this.fetchDepositedNfts()
          }
          await this.loadVaultStats()
          await this.vaultStatsService.loadStats(this.pool);
        }
      }
    );

    this.withdrawListener = this.vaultContract.on(
      'OnCollateralRemoved',
      async (token, address, type, amount) => {
        if (address.toLowerCase() == this.wallet.currentAccount.toLowerCase()) {
          this.hideLoading();
          this.alert.showToast('Withdrawal confirmed');
          if (this.collateralContract.isNFT) {
            await this.fetchDepositedNfts()
            await this.fetchOwnedTokens()
          }
          await this.loadVaultStats()
          await this.vaultStatsService.loadStats(this.pool);
        }
      }
    );

    this.borrowListener = this.vaultContract.on(
      'OnLoanOpened',
      async (from, to, amount, shares) => {
        if (from.toLowerCase() == this.wallet.currentAccount.toLowerCase()) {
          this.hideLoading();
          this.alert.showToast('Borrow confirmed');
          await this.loadVaultStats();
          await this.vaultStatsService.loadStats(this.pool);
        }
      }
    );
    this.repayListener = this.vaultContract.on(
      'OnLoanRepaid',
      async (from, to, amount, shares) => {
        if (from.toLowerCase() == this.wallet.currentAccount.toLowerCase()) {
          this.hideLoading();
          this.alert.showToast('Repayment confirmed');
          await this.loadVaultStats();
          await this.vaultStatsService.loadStats(this.pool);
    }
      }
    );

    this.wallet.accountSubject.subscribe(() => {
      this.loadVaultStats();
    });

    this.netWorkChangeSubscription = this.environmentService.environmentSubject.subscribe(async network => {
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      if(network && (network.config.networkParams.chainId.toLocaleLowerCase() !== chainId)){
        this.navigateBack();
      }
    })
  }

  selectNFT(nft: NFTMetadata) {
    let index = -1;
    this.setRepayMode(RepayMode.collateral)
    this.setBorrowMode(BorrowMode.collateral)
    for (let i = 0; i < this.selectedNfts.length; i++) {
      if (nft.edition === this.selectedNfts[i].edition) {
        index = i;
        break;
      }
    }
    if (index != -1) {
      this.selectedNfts.splice(index, 1)
      nft.isSelected = false
    } else {
      this.selectedNfts.push(nft)
      nft.isSelected = true
    }
  }

  private navigateBack() {
    this.navController.navigateBack('/borrow');
  }
}
