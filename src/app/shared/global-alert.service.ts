import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { WalletProviderService } from '../providers/wallet-provider.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalAlertService {

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private provider: WalletProviderService,
    ) { }

  async presentNoConnectionAlert() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'No Connection',
      message: 'No Web3 wallet was detected. To continue please install Metamask or another Web3 compatible wallet.',
      buttons: [ {
        text: 'Cancel',
        role: 'cancel',
        cssClass: 'secondary',
        handler: () => {
          console.log('Confirm Canceled');
        }
      }, {
        text: 'Go To Metamask',
        handler: () => {
          window.open('https://metamask.io/', '_blank').focus()
          console.log('Confirm Okay');
        }
      }]
    })
    alert.present()

    const { role } = await alert.onDidDismiss();
    console.log('onDidDismiss resolved with role', role);
  }

  async showConnectAlert() {
    const alert = await this.alertController.create({
      header: 'Connect!',
      message: 'Please connect your wallet to proceed.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
        }, {
          text: 'Connect',
          handler: () => {
            console.log('Confirm Okay')
            this.connect()
          }
        }
      ]
    });

    await alert.present();
  }

  async showInsufficientBalanceAlert() {
    const alert = await this.alertController.create({
      header: 'Insufficient Balance',
      message: 'The balance in your account is less than the required amount to proceed.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
        }, {
          text: 'Get More Tokens',
          handler: () => {
            window.open('https://faucet.polygon.technology/', '_blank').focus()
          }
        }
      ]
    });

    await alert.present();
  }

  async showPurchaseConfirmationAlert(txHash: string) {
    const alert = await this.alertController.create({
      header: 'Transaction sent',
      message: 'Your purchased NFT will show up in your owned items once the transaction is confirmed.',
      buttons: [
        {
          text: 'Okay',
          role: 'okay',
        }, {
          text: 'View transaction',
          handler: () => {
            window.open('https://mumbai.polygonscan.com/tx/' + txHash, '_blank').focus
          }
        }
      ]
    });

    await alert.present(); 
  }

  async showRewardConfirmationAlert(amount) {
    const alert = await this.alertController.create({
      header: 'Reward!',
      message: `Thanks for rating. 
      Your reward of ${amount} Chedda XP will be posted to your account once the transaction confirms on the blockchain.`,
      buttons: [
        {
          text: 'Okay',
          role: 'okay',
        }
      ]
    });

    await alert.present(); 
  }
  async showRewardReceivedToast(amount) {
    const toast =  await this.toastController.create({
      header: 'Chedda XP earned',
      message: `You just earned ${amount} XP`,
      position: 'bottom',
      duration: 5000
    })

    await toast.present()
  }

  async connect() {
    let isConected = await this.provider.connect()
    console.log('connect clicked with result: ', isConected)
    if (isConected) {
      this.provider.getAccounts()
    } else {
      this.presentNoConnectionAlert()
    }
  }

}