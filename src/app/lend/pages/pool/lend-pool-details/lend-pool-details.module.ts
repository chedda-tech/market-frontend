import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LendPoolDetailsPageRoutingModule } from './lend-pool-details-routing.module';

import { LendPoolDetailsPage } from './lend-pool-details.page';
import { SharedComponentsModule } from 'src/app/components/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LendPoolDetailsPageRoutingModule,
    SharedComponentsModule,
  ],
  declarations: [LendPoolDetailsPage]
})
export class LendPoolDetailsPageModule {}
