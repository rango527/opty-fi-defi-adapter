import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { Network } from "@ethersproject/networks";
import chai, { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { getAddress } from "ethers/lib/utils";
import { IUniswapV2Router02, QuickSwapPoolAdapter } from "../../../typechain";
import { TestDeFiAdapter } from "../../../typechain/TestDeFiAdapter";
import { getOverrideOptions } from "../../utils";
import { Signers } from "../types";
import { shouldBehaveLikeQuickSwapPoolAdapter } from "./QuickSwapPoolAdapter.behavior";
import { default as QuickSwapPools } from "./quickswap-pools.json";
import { ADDRESS, ABI } from "./quickSwapFactory";
import { pool_address, pool_abi } from "./daiusdc";

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
    // this.qsigners.usdtWhale = await hre.ethers.getSigner(USDT_WHALE);
    this.qsigners.usdcWhale = await hre.ethers.getSigner(USDC_WHALE);
    // this.qsigners.wbtcWhale = await hre.ethers.getSigner(WBTC_WHALE);
    // this.qsigners.pbtcWhale = await hre.ethers.getSigner(PBTC_WHALE);
    const dai = await hre.ethers.getContractAt("IERC20", DAI_ADDRESS, this.qsigners.daiWhale);
    // const usdt = await hre.ethers.getContractAt("IERC20", USDT_ADDRESS, this.qsigners.usdtWhale);
    const usdc = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS, this.qsigners.usdcWhale);
    // const wbtc = await hre.ethers.getContractAt("IERC20", USDT_ADDRESS, this.qsigners.wbtcWhale);
    // const pbtc = await hre.ethers.getContractAt("IERC20", USDT_ADDRESS, this.qsigners.pbtcWhale);
    // get the UniswapV2Router contract instance
    this.uniswapV2Router02 = <IUniswapV2Router02>(
      await hre.ethers.getContractAt("IUniswapV2Router02", "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff")
    );
// console.log('dai', dai);

    // deploy TestDeFiAdapter Contract
    const testDeFiAdapterArtifact: Artifact = await hre.artifacts.readArtifact("TestDeFiAdapter");
    this.testDeFiAdapter = <TestDeFiAdapter>(
      await deployContract(this.qsigners.deployer, testDeFiAdapterArtifact, [], getOverrideOptions())
    );
// console.log('this.testDeFiAdapter', this.testDeFiAdapter.address);

    // deploy QuickSwap Finance Adapter
    const quickSwapAdapterArtifact: Artifact = await hre.artifacts.readArtifact("QuickSwapPoolAdapter");
    this.quickSwapPoolAdapter = <QuickSwapPoolAdapter>(
      await deployContract(this.qsigners.deployer, quickSwapAdapterArtifact, [], getOverrideOptions())
    );

    // fund the whale's wallet with gas
    // await this.qsigners.admin.sendTransaction({
    //   to: DAI_WHALE,
    //   value: hre.ethers.utils.parseEther("100"),
    //   ...getOverrideOptions(),
    // });
    // await this.qsigners.admin.sendTransaction({
    //   to: USDC_WHALE,
    //   value: hre.ethers.utils.parseEther("100"),
    //   ...getOverrideOptions(),
    // });

    // fund TestDeFiAdapter with 10000 tokens each
    await dai.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseEther("10000"), getOverrideOptions());
    console.log('dai');
    
    await usdc.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseUnits("10000", 6), getOverrideOptions());
    console.log('usdc');

  });

  describe("QuickSwapPoolAdapter", function () {
    

    // const matic: Network = {
    //   name: 'matic',
    //   chainId: 137,
    //   _defaultProvider: (providers) => new providers.JsonRpcProvider('https://rpc-mainnet.maticvigil.com/')
    // }

    // const defaultProvider = hre.ethers.getDefaultProvider(matic);
    // const quickSwapFactory = new hre.ethers.Contract(ADDRESS, ABI, defaultProvider);
    
    // const daiAndUsdcPoolAddress = await quickSwapFactory.getPair("0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f");
    // const usdcAndUsdtPoolAddress = await quickSwapFactory.getPair(USDC_ADDRESS, USDT_ADDRESS);
    // const daiAndUsdtPoolAddress = await quickSwapFactory.getPair(DAI_ADDRESS, USDT_ADDRESS);
    // const pbtcAndWbtcPoolAddress = await quickSwapFactory.getPair(PBTC_ADDRESS, WBTC_ADDRESS); 
// console.log('daiAndUsdcPoolAddress', daiAndUsdcPoolAddress);

  // QuickSwapPools.map(async (pool: string) => {
  //   console.log('pool', pool);
  //   for (let i = 0; i < pool.length; i++) {
  //     for (let j = 1; j < pool.length +1; j++) {
  //       console.log('pool[i]', pool[i]);
        
  //       const poolAddress = await quickSwapFactory.getPair(pool[i], pool[j]);
  //       console.log('poolAddress', poolAddress);
        
  //     }
  //   }
  // });

    // dai and usdc
    // shouldBehaveLikeQuickSwapPoolAdapter("dai and usdc", DAI_ADDRESS, daiAndUsdcPoolAddress);
    it(`should dai and usdc`, async function () {
      const matic: Network = {
        name: 'matic',
        chainId: 137,
        _defaultProvider: (providers) => new providers.JsonRpcProvider('https://polygon-rpc.com/')
      }
  
      const defaultProvider = hre.ethers.getDefaultProvider(matic);
      const quickSwapFactory = new hre.ethers.Contract(ADDRESS, ABI, defaultProvider);
      
      const pool = await quickSwapFactory.getPair("0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f");
      const daiToken: string = getAddress("0x8f3cf7ad23cd3cadbd9735aff958023239c6a063");
      
      // quickSwap pool deposit vault instance
      // const quickSwapDepositInstance = await hre.ethers.getContractAt("IUniswapV2Router02", pool);
      const quickSwapDepositInstance = new hre.ethers.Contract(pool_address, pool_abi, defaultProvider);
      const decimals = await quickSwapDepositInstance.decimals();
      // underlying token instance
      const underlyingTokenInstance = await hre.ethers.getContractAt("IERC20", daiToken);
      // 1. deposit all underlying tokens
      await this.testDeFiAdapter.testGetDepositAllCodes(
        daiToken,
        pool,
        this.quickSwapPoolAdapter.address,
        getOverrideOptions(),
      );
      // 1.1 assert whether token balance is as expected or not after deposit
      const actualLPTokenBalanceAfterDeposit = await this.quickSwapPoolAdapter.getLiquidityPoolTokenBalance(
        this.testDeFiAdapter.address,
        this.testDeFiAdapter.address, // placeholder of type address
        pool,
      );
      console.log('actualLPTokenBalanceAfterDeposit', actualLPTokenBalanceAfterDeposit);
      
      const expectedLPTokenBalanceAfterDeposit = await quickSwapDepositInstance.balanceOf(this.testDeFiAdapter.address);
      expect(actualLPTokenBalanceAfterDeposit).to.be.eq(expectedLPTokenBalanceAfterDeposit);

      // 1.2 assert whether underlying token balance is as expected or not after deposit
      const actualUnderlyingTokenBalanceAfterDeposit = await this.testDeFiAdapter.getERC20TokenBalance(
        (
          await this.quickSwapPoolAdapter.getUnderlyingTokens(pool, pool)
        )[0],
        this.testDeFiAdapter.address,
      );
      const expectedUnderlyingTokenBalanceAfterDeposit = await underlyingTokenInstance.balanceOf(
        this.testDeFiAdapter.address,
      );
      expect(actualUnderlyingTokenBalanceAfterDeposit).to.be.eq(expectedUnderlyingTokenBalanceAfterDeposit);

      // 1.3 assert whether the amount in token is as expected or not after depositing
      const actualAmountInTokenAfterDeposit = await this.quickSwapPoolAdapter.getAllAmountInToken(
        this.testDeFiAdapter.address,
        daiToken,
        pool,
      );
      console.log('actualAmountInTokenAfterDeposit', actualAmountInTokenAfterDeposit.toString());
      console.log('expectedLPTokenBalanceAfterDeposit', expectedLPTokenBalanceAfterDeposit.toString());
      // const pricePerFullShareAfterDeposit = await quickSwapDepositInstance.getPricePerFullShare();
      // uint256 _totalSupply = IUniswapV2Pair(_liquidityPool).totalSupply();
      //   (uint256 reserve0, uint256 reserve1,) = IUniswapV2Pair(_liquidityPool).getReserves();
      //   if (IUniswapV2Pair(_liquidityPool).token0() != _underlyingToken) {
      //       (reserve0, reserve1) = (reserve1, reserve0);
      //   }
      //   return _totalSupply.mul(
      //           _liquidityPoolTokenAmount.mul(3) + reserve0.mul(1997) + Babylonian.sqrt(
      //                   (_liquidityPoolTokenAmount.mul(3) + reserve0.mul(1997)).mul(
      //                       _liquidityPoolTokenAmount.mul(3) + reserve0.mul(1997))
      //                   - _liquidityPoolTokenAmount.mul(reserve0).mul(4000000)
      //               )
      //       ).div(reserve0) / 2000;

      // const expectedAmountInTokenAfterDeposit = BigNumber.from(expectedLPTokenBalanceAfterDeposit)
      //   .mul(BigNumber.from(pricePerFullShareAfterDeposit))
      //   .div(BigNumber.from("10").pow(BigNumber.from(decimals)));
      // expect(actualAmountInTokenAfterDeposit).to.be.eq(expectedAmountInTokenAfterDeposit);
      // 2. stake all lpTokens
    }).timeout(100000);
  });
});
