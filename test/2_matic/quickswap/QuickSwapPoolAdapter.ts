import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { getAddress } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { IUniswapV2Router02, QuickSwapPoolAdapter } from "../../../typechain";
import { TestDeFiAdapter } from "../../../typechain/TestDeFiAdapter";
import { getOverrideOptions } from "../../utils";
import { Signers } from "../types";
import { shouldBehaveLikeQuickSwapPoolAdapter } from "./QuickSwapPoolAdapter.behavior";
import { USD, BTC } from "./token.address";

const { deployContract } = hre.waffle;

describe("Unit tests", function () {
  before(async function () {
    this.qsigners = {} as Signers;
    const DAI_ADDRESS: string = getAddress("0x8f3cf7ad23cd3cadbd9735aff958023239c6a063");
    const USDT_ADDRESS: string = getAddress("0xc2132d05d31c914a87c6611c10748aeb04b58e8f");
    const USDC_ADDRESS: string = getAddress("0x2791bca1f2de4661ed88a30c99a7a9449aa84174");
    const WBTC_ADDRESS: string = getAddress("0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6");
    const PBTC_ADDRESS: string = getAddress("0xd7ecf95cf7ef5256990beaf4ac895cd9e64cb947");

    const DAI_WHALE: string = getAddress("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
    const USDT_WHALE: string = getAddress("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
    const USDC_WHALE: string = getAddress("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
    const WBTC_WHALE: string = getAddress("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
    const PBTC_WHALE: string = getAddress("0x5fDAEf0a0B11774dB68C38aB36957De8646aF1B5");

    const signers: SignerWithAddress[] = await hre.ethers.getSigners();

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [DAI_WHALE],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDT_WHALE],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_WHALE],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WBTC_WHALE],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [PBTC_WHALE],
    });
    this.qsigners.admin = signers[0];
    this.qsigners.owner = signers[1];
    this.qsigners.deployer = signers[2];
    this.qsigners.alice = signers[3];
    this.qsigners.daiWhale = await hre.ethers.getSigner(DAI_WHALE);
    this.qsigners.usdtWhale = await hre.ethers.getSigner(USDT_WHALE);
    this.qsigners.usdcWhale = await hre.ethers.getSigner(USDC_WHALE);
    this.qsigners.wbtcWhale = await hre.ethers.getSigner(WBTC_WHALE);
    this.qsigners.pbtcWhale = await hre.ethers.getSigner(PBTC_WHALE);
    const dai = await hre.ethers.getContractAt("IERC20", DAI_ADDRESS, this.qsigners.daiWhale);
    const usdt = await hre.ethers.getContractAt("IERC20", USDT_ADDRESS, this.qsigners.usdtWhale);
    const usdc = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS, this.qsigners.usdcWhale);
    const wbtc = await hre.ethers.getContractAt("IERC20", WBTC_ADDRESS, this.qsigners.wbtcWhale);
    const pbtc = await hre.ethers.getContractAt("IERC20", PBTC_ADDRESS, this.qsigners.pbtcWhale);
    // get the UniswapV2Router contract instance
    this.uniswapV2Router02 = <IUniswapV2Router02>(
      await hre.ethers.getContractAt("IUniswapV2Router02", "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff")
    );

    // deploy TestDeFiAdapter Contract
    const testDeFiAdapterArtifact: Artifact = await hre.artifacts.readArtifact("TestDeFiAdapter");
    this.testDeFiAdapter = <TestDeFiAdapter>(
      await deployContract(this.qsigners.deployer, testDeFiAdapterArtifact, [], getOverrideOptions())
    );

    // deploy QuickSwap Finance Adapter
    const quickSwapAdapterArtifact: Artifact = await hre.artifacts.readArtifact("QuickSwapPoolAdapter");
    this.quickSwapPoolAdapter = <QuickSwapPoolAdapter>(
      await deployContract(this.qsigners.deployer, quickSwapAdapterArtifact, [], getOverrideOptions())
    );

    // fund TestDeFiAdapter with 100 tokens each USD and 0.2 tokens each BTC
    await dai.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseEther("100"), getOverrideOptions());
    await usdc.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseUnits("100", 6), getOverrideOptions());
    await usdt.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseUnits("100", 6), getOverrideOptions());
    await wbtc.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseUnits("0.4", 8), getOverrideOptions());
    await pbtc.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseEther("0.4"), getOverrideOptions());
  });

  describe("QuickSwapPoolAdapter", function () {
    for (let i = 0; i < USD.length - 1; i++) {
      for (let j = i + 1; j < USD.length; j++) {
        shouldBehaveLikeQuickSwapPoolAdapter(
          USD[i].name,
          USD[i].address,
          USD[j].name,
          USD[j].address,
          USD[i].name,
          USD[i].address,
        );
        shouldBehaveLikeQuickSwapPoolAdapter(
          USD[i].name,
          USD[i].address,
          USD[j].name,
          USD[j].address,
          USD[j].name,
          USD[j].address,
        );
      }
    }

    for (let i = 0; i < BTC.length - 1; i++) {
      for (let j = i + 1; j < BTC.length; j++) {
        shouldBehaveLikeQuickSwapPoolAdapter(
          BTC[i].name,
          BTC[i].address,
          BTC[j].name,
          BTC[j].address,
          BTC[i].name,
          BTC[i].address,
        );
        shouldBehaveLikeQuickSwapPoolAdapter(
          BTC[i].name,
          BTC[i].address,
          BTC[j].name,
          BTC[j].address,
          BTC[j].name,
          BTC[j].address,
        );
      }
    }
  });
});
