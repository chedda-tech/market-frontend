import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-loading-modal',
  templateUrl: './loading-modal.component.html',
  styleUrls: ['./loading-modal.component.scss'],
})
export class LoadingModalComponent implements OnInit {
  @Input() message:string
  constructor() { }

  ngOnInit() {}

}
