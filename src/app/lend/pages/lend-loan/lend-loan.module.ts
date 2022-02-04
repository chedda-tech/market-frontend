import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LendLoanPageRoutingModule } from './lend-loan-routing.module';

import { LendLoanPage } from './lend-loan.page';
import { SharedComponentsModule } from 'src/app/components/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedComponentsModule,
    LendLoanPageRoutingModule
  ],
  declarations: [LendLoanPage]
})
export class LendLoanPageModule {}
