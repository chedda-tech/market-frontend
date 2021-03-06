import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Dapp } from '../../models/dapp.model';

@Component({
  selector: 'app-dapp-card',
  templateUrl: './dapp-card.component.html',
  styleUrls: ['./dapp-card.component.scss'],
})
export class DappCardComponent implements OnInit {

  @Input() dapp: Dapp

  constructor(private router: Router) { }

  ngOnInit() {}


  onDappSelected(dapp: Dapp) {
    this.naviagteToDapp(dapp)
  }

  naviagteToDapp(dapp: Dapp) {
    this.router.navigate(['/dapps', 'details', dapp.contractAddress])
  }

}
