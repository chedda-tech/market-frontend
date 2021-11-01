export interface Dapp {
  contractAddress: string;
  name: string;
  metadataURI: string;
  metadata: DappMetadata;
}

export interface DappMetadata {
  logoURI: string;
  developer: string;
  homePageURI: string;
  bannerImageURI: string;
  summary: string;
  category: string;
  description: string;
  backgroundImageURI: string;
  primaryColor: string; // html color code used for branding dapp page
  secondaryColor: string; // html color code can used for branding dapp page.
  socials: [{
    name: string;
    profileURI: string;
    iconURI?: string; // this is optional as iconURI is normally uses standard social network logos.
  }];
  screenshots: [{
    text: string;
    imageURI: string;
  }];
}
