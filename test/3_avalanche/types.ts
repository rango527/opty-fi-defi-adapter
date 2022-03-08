import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Fixture } from "ethereum-waffle";
import { PangolinPoolAdapter } from "../../typechain/PangolinPoolAdapter";
import { IUniswapV2Router02 } from "../../typechain/IUniswapV2Router02";
import { TestDeFiAdapter } from "../../typechain/TestDeFiAdapter";

export interface Signers {
  admin: SignerWithAddress;
  owner: SignerWithAddress;
  deployer: SignerWithAddress;
  alice: SignerWithAddress;
  riskOperator: SignerWithAddress;
  daiWhale: SignerWithAddress;
  usdtWhale: SignerWithAddress;
  usdcWhale: SignerWithAddress;
  usdceWhale: SignerWithAddress;
  tusdWhale: SignerWithAddress;
  mimWhale: SignerWithAddress;
}

declare module "mocha" {
  export interface Context {
    pangolinPoolAdapter: PangolinPoolAdapter;
    testDeFiAdapter: TestDeFiAdapter;
    uniswapV2Router02: IUniswapV2Router02;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    asigners: Signers;
  }
}
