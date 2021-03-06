import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DappDetailsPageRoutingModule } from './dapp-details-routing.module';

import { DappDetailsPage } from './dapp-details.page';
import { SwiperModule } from 'swiper/angular';
import { SharedComponentsModule } from 'src/app/components/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SwiperModule,
    SharedComponentsModule,
    DappDetailsPageRoutingModule
  ],
  declarations: [DappDetailsPage]
})
export class DappDetailsPageModule {}
