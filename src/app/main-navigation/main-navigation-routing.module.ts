import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MainNavigationPage } from './main-navigation.page';

const routes: Routes = [
  {
    path: '',
    component: MainNavigationPage,
    children: [
      {
        path: 'dapps',
        loadChildren: () => import('../dapps/dapps.module').then( m => m.DappsPageModule)
      },
      {
        path: 'nfts',
        loadChildren: () => import('../nfts/nfts.module').then( m => m.NftsPageModule)
      },
      {
        path: 'governance',
        loadChildren: () => import('../governance/governance.module').then( m => m.GovernancePageModule)
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainNavigationPageRoutingModule {}
