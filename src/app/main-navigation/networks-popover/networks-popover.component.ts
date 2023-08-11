import { Component, HostListener, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { EnvironmentProviderService } from 'src/app/providers/environment-provider.service';
import { VaultStatsService } from 'src/app/providers/vault-stats.service';
import { WalletProviderService } from 'src/app/providers/wallet-provider.service';
import { environments } from 'src/environments/environments';

@Component({
  selector: 'app-networks-popover',
  templateUrl: './networks-popover.component.html',
  styleUrls: ['./networks-popover.component.scss'],
})

export class NetworksPopoverComponent implements OnInit {

  env 
  networkList = [
    // {
    //   name: 'Avalanche Testnet',
    //   url: 'https://testnet-avalanche.chedda.store',
    //   icon: '/assets/logos/avalanche-avax-logo.png'
    // },
    // {
    //   name: 'Harmony Testnet',
    //   url: 'https://testnet-harmony.chedda.store',
    //   icon: '/assets/logos/harmony-logo.png'
    // },
    {
      name: 'Oasis',
      url: 'https://testnet-oasis.chedda.store',
      icon: '/assets/logos/wrose-logo.png'
    },
    {
      name: 'Polygon',
      url: 'https://testnet-polygon.chedda.store',
      icon: '/assets/logos/matic-logo.png'
    },
    {
      name: 'Arbitrum Goerli',
      url: 'https://testnet-app.chedda.finance',
      icon: '/assets/logos/arbitrum-logo.png'
    },
  ]
  isOpenNetworkMenu: boolean;
  netWorkChangeSubscription: Subscription;
  selectedNetwork: string;
  loader: any;
  networkSwitched: boolean = false

  constructor(
    private environmentService: EnvironmentProviderService,
    private vaultStatsService: VaultStatsService,
    private provider: WalletProviderService,
    ) { 
    this.env = this.environmentService.environment;
    this.selectedNetwork = this.env.config.ui.chainName
  }

  ngOnInit() {
    this.listenToEvents();
  }

  ngOnDestroy(){
    this.netWorkChangeSubscription?.unsubscribe;
  }

  openNetworkMenu(){
    this.isOpenNetworkMenu = !this.isOpenNetworkMenu
  }

  async onNetworkSelected(network){
    const selectedEnvironment = environments.find(item => item.identifier === network);
    let eth:any = window.ethereum
    if(eth){
      await this.provider.addNetwork(selectedEnvironment)
    }else{
      this.environmentService.loadEnvironment(selectedEnvironment)
    }
    this.isOpenNetworkMenu = false;
  }

  private async listenToEvents(){
    this.netWorkChangeSubscription = this.environmentService.environmentSubject.subscribe(async network => {
      if(network){
        this.env = network
        this.vaultStatsService.loadVaultStats();
      }
    })
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.network-menu-container')) {
      this.isOpenNetworkMenu = false;
    }
  }
}
