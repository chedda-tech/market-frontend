// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: false,
    environmentName: "Harmony ONE Testnet",
    jsonRpcUrl: 'https://api.s0.b.hmny.io',
    config: {
        contracts: {
            CheddaAddressRegistry: '0x94562B7899fdFd58fDD3a7cc98Ec928568e19aD6',
            CheddaXP: '0x5D0d03A506F2df4Bcf8fa022027FCcEd7fF639d1',
            CheddaDappStore: '0x3266275A2D62BE0634146DF767E8505A2173708E',
            CheddaDappExplorer: '0x1b98a92c14773416fB53766F16BC3f20bAcAfd3c',
            CheddaMarket: '0x67CcB23977336be1eA1E65B8e85Dda525ebC8EaA',
            CheddaMarketExplorer: '0xB2037Aa280cd945FAEa2FCd934DcA25B8809133d',
            CheddaRewards: '0xe407314af2Fb93c0B53322727774Dd79DEC3854d',
            CheddaDropManager: '0x9c2915CDF4b412EDb4EDe8F61DB9E433adaf8098',
            CheddaLoanManager: '0xF0449d23A101bAA981EDf03152e70877139Ce51F',
            ChainlinkPriceConsumer: '0xD992662A5E886336Ba42A1925AB584a30e4BeB7C',
          },
          networkParams: {
            chainId: '0x6357D2E0',
            chainName: 'Harmony ONE Testnet',
            nativeCurrency: {
                name: 'ONE',
                symbol: 'ONE',
                decimals: 18,
                image: ''
            },
            rpcUrls: ['https://api.s0.b.hmny.io'],
            blockExplorerUrls: ['https://explorer.pops.one/']
          },
          faucets: [
            {
              name: 'Harmony ONE Faucet',
              icon: '',
              url: 'https://faucet.pops.one/',
            }
          ],
          ui: {
              chainName: 'Harmony',
              logo: '/assets/logos/harmony-logo.png',
              txUrlPrefix: 'https://explorer.pops.one/tx/'
          }
    },
}
  
  /*
   * For easier debugging in development mode, you can import the following file
   * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
   *
   * This import should be commented out in production mode because it will have a negative impact
   * on performance if an error is thrown.
   */
import 'zone.js/dist/zone-error';  // Included with Angular CLI.
  