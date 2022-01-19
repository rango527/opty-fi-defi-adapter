import hre from "hardhat";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { Network } from "@ethersproject/networks";
import { STAKING_FACTORY_ADDRESS, STAKING_FACTORY_ABI } from "./StakingRewardsFactory";
import { getOverrideOptions } from "../../utils";
import { ADDRESS, ABI } from "../quickSwapFactory";
import { TOKEN_ABI } from "../token.abi";
import { getAddress } from "ethers/lib/utils";

chai.use(solidity);

export function shouldBehaveLikeQuickSwapFarmAdapter(
  token1Name: string,
  token1Address: string,
  token2Name: string,
  token2Address: string,
): void {
  it(`${token1Name} - ${token2Name} Farm Test`, async function () {
    const matic: Network = {
      name: "matic",
      chainId: 137,
      _defaultProvider: providers => new providers.JsonRpcProvider("https://polygon-rpc.com/"),
    };

    const defaultProvider = hre.ethers.getDefaultProvider(matic);
    const quickSwapFactory = new hre.ethers.Contract(ADDRESS, ABI, defaultProvider);

    const pool = await quickSwapFactory.getPair(token1Address, token2Address);
    const liquidityPoolInstance = await hre.ethers.getContractAt("IERC20", pool);
    const underlyingToken = pool;

    const stakingRewardsFactory = new hre.ethers.Contract(
      STAKING_FACTORY_ADDRESS,
      STAKING_FACTORY_ABI,
      defaultProvider,
    );
    const farmAddress = await stakingRewardsFactory.stakingRewardsInfoByStakingToken(underlyingToken);
    const liquidityPool = farmAddress[0];

    // const rewardsTokenAddress = await this.quickSwapFarmAdapter.getRewardToken(liquidityPool);
    const farmInstance = await hre.ethers.getContractAt("IERC20", liquidityPool);
    const quickTokenAddress: string = getAddress("0x831753DD7087CaC61aB5644b308642cc1c33Dc13");
    const quickTokenInstance = await hre.ethers.getContractAt("IERC20", quickTokenAddress);

    await this.quickSwapFarmAdapter.connect(this.qsigners.deployer).setMaxDepositProtocolMode(0, getOverrideOptions());
    await this.quickSwapFarmAdapter
      .connect(this.qsigners.deployer)
      .setMaxDepositAmount(pool, underlyingToken, hre.ethers.utils.parseEther("100"), getOverrideOptions());

    // 1. Deposit Some underlying tokens
    const token1Balance = await this.testDeFiAdapter.getERC20TokenBalance(token1Address, this.qsigners.alice.address);
    const token2Balance = await this.testDeFiAdapter.getERC20TokenBalance(token2Address, this.qsigners.alice.address);
    const token1DepositAmount = token1Balance.div(2);
    const token2DepositAmount = token2Balance.div(2);

    const token1Instance = new hre.ethers.Contract(token1Address, TOKEN_ABI, defaultProvider);
    const token2Instance = new hre.ethers.Contract(token2Address, TOKEN_ABI, defaultProvider);

    await token1Instance.connect(this.qsigners.alice).approve(this.uniswapV2Router02.address, token1DepositAmount);
    await token2Instance.connect(this.qsigners.alice).approve(this.uniswapV2Router02.address, token2DepositAmount);

    const block = await hre.ethers.provider.getBlock("latest");
    await this.uniswapV2Router02
      .connect(this.qsigners.alice)
      .addLiquidity(
        token1Address,
        token2Address,
        token1DepositAmount,
        token2DepositAmount,
        0,
        0,
        this.qsigners.alice.address,
        block.timestamp + 2,
        getOverrideOptions(),
      );

    // 1.1 Transfer all amount of lpToken from test address to testDeFiAapter
    let lpTokenAmount = await this.quickSwapFarmAdapter.getLiquidityPoolTokenBalance(
      this.qsigners.alice.address,
      underlyingToken,
      underlyingToken, // placeholder of type address
    );

    await liquidityPoolInstance.connect(this.qsigners.alice).transfer(this.testDeFiAdapter.address, lpTokenAmount);
    lpTokenAmount = await this.quickSwapFarmAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      underlyingToken,
      underlyingToken, // placeholder of type address
    );

    // 2. stake all lpTokens
    await this.testDeFiAdapter.testGetDepositAllCodes(
      underlyingToken,
      liquidityPool,
      this.quickSwapFarmAdapter.address,
      getOverrideOptions(),
    );

    // 2.1 assert whether the staked lpToken balance is as expected or not after staking lpToken
    const actualStakedLPTokenBalanceAfterStake = await this.quickSwapFarmAdapter.getLiquidityPoolTokenBalanceStake(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      liquidityPool,
    );
    const expectStakedLPTokenBalanceAfterStake = lpTokenAmount;

    expect(actualStakedLPTokenBalanceAfterStake).to.be.eq(expectStakedLPTokenBalanceAfterStake);

    // 2.2 make a transaction for mining a block to get finite unclaimed reward amount
    await this.qsigners.admin.sendTransaction({
      value: hre.ethers.utils.parseEther("0"),
      to: await this.qsigners.admin.getAddress(),
      ...getOverrideOptions(),
    });

    // Coverage Test
    // 2.3 getAllAmountInToken
    const expectUnderlyingTokenBalanceBeforeClaim = await this.quickSwapFarmAdapter.getAllAmountInToken(
      this.testDeFiAdapter.address,
      token1Address,
      liquidityPool,
    );
    const actualUnderlyingTokenBalanceBeforeClaim = await this.testDeFiAdapter.getERC20TokenBalance(
      token1Address,
      this.testDeFiAdapter.address,
    );
    expect(expectUnderlyingTokenBalanceBeforeClaim).to.be.eq(actualUnderlyingTokenBalanceBeforeClaim);

    // 3. claim the reward token
    await this.testDeFiAdapter.testClaimRewardTokenCode(
      liquidityPool,
      this.quickSwapFarmAdapter.address,
      getOverrideOptions(),
    );

    // 3.1 assert whether the reward token's balance is as expected or not after claiming
    const actualRewardTokenBalanceAfterClaim = await this.testDeFiAdapter.getERC20TokenBalance(
      quickTokenAddress,
      this.testDeFiAdapter.address,
    );
    const expectedRewardTokenBalanceAfterClaim = await quickTokenInstance.balanceOf(this.testDeFiAdapter.address);
    expect(actualRewardTokenBalanceAfterClaim).to.be.eq(expectedRewardTokenBalanceAfterClaim);

    // 3.2 Underlying token balance
    const expectUnderlyingTokenBalanceAfterHarvest = await this.quickSwapFarmAdapter.getAllAmountInToken(
      this.testDeFiAdapter.address,
      token1Address,
      liquidityPool,
    );

    // 3.3 Coverage Test
    if (expectUnderlyingTokenBalanceAfterHarvest > 0) {
      const isRedeemableAmountSufficient = await this.quickSwapFarmAdapter.isRedeemableAmountSufficient(
        this.testDeFiAdapter.address,
        token1Address,
        liquidityPool,
        expectUnderlyingTokenBalanceAfterHarvest.div(2),
      );
      if (isRedeemableAmountSufficient) {
        await this.quickSwapFarmAdapter.calculateRedeemableLPTokenAmount(
          this.testDeFiAdapter.address,
          token1Address,
          liquidityPool,
          expectUnderlyingTokenBalanceAfterHarvest.div(2),
        );
      }
    }

    // 4. Swap the reward token into underlying token
    await this.testDeFiAdapter.testGetHarvestAllCodes(
      liquidityPool,
      token1Address,
      this.quickSwapFarmAdapter.address,
      getOverrideOptions(),
    );

    // 4.1 assert whether the reward token is swapped to underlying token or not
    const actualRewardTokenBalanceAfterHarvest = await this.testDeFiAdapter.getERC20TokenBalance(
      quickTokenAddress,
      this.testDeFiAdapter.address,
    );

    expect(actualRewardTokenBalanceAfterHarvest).to.be.gte(0);

    // 4.2 underlying token balance
    const actualUnderlyingTokenBalanceAfterHarvest = await this.testDeFiAdapter.getERC20TokenBalance(
      token1Address,
      this.testDeFiAdapter.address,
    );

    expect(expectUnderlyingTokenBalanceAfterHarvest).to.be.eq(actualUnderlyingTokenBalanceAfterHarvest);

    // 5. Unstake all staked lpTokens
    const expectedLPTokenBalanceAfterUnstake = await this.quickSwapFarmAdapter.getLiquidityPoolTokenBalanceStake(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      liquidityPool,
    );
    const LPTokenBalanceBeforeUnstake = await this.quickSwapFarmAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      underlyingToken,
      underlyingToken, // placeholder of type address
    );

    await this.testDeFiAdapter.testGetWithdrawAllCodes(
      underlyingToken,
      liquidityPool,
      this.quickSwapFarmAdapter.address,
      getOverrideOptions(),
    );

    // 5.1 assert whether staked lpToken balance is as expected or not
    const LPTokenBalanceAfterUnstake = await this.quickSwapFarmAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      underlyingToken,
      underlyingToken, // placeholder of type address
    );
    const actualLPTokenBalanceAfterUnstake = LPTokenBalanceAfterUnstake.sub(LPTokenBalanceBeforeUnstake);

    expect(expectedLPTokenBalanceAfterUnstake).to.be.eq(actualLPTokenBalanceAfterUnstake);

    // 6. Coverage Test True case
    // 6.1 underlying token
    const underlyingTokens = await this.quickSwapFarmAdapter.getUnderlyingTokens(underlyingToken, liquidityPool);
    if (token1Address.toString() < token2Address.toString()) {
      expect(underlyingTokens[0]).to.be.eq(token1Address);
      expect(underlyingTokens[1]).to.be.eq(token2Address);
    } else {
      expect(underlyingTokens[0]).to.be.eq(token2Address);
      expect(underlyingTokens[1]).to.be.eq(token1Address);
    }
    // 6.2 calculateAmountInLPToken
    const calculateAmountInLPToken = await this.quickSwapFarmAdapter.calculateAmountInLPToken(
      liquidityPool,
      underlyingToken,
      100,
    );
    expect(calculateAmountInLPToken).to.be.eq(100);
    // 6.3 canStake
    const canStake = await this.quickSwapFarmAdapter.canStake(pool);
    expect(canStake).to.be.eq(true);
    // 6.4 setMaxDepositPoolPct and setMaxDepositProtocolPct
    await this.quickSwapFarmAdapter
      .connect(this.qsigners.deployer)
      .setMaxDepositPoolPct(pool, 1000, getOverrideOptions());
    await this.quickSwapFarmAdapter
      .connect(this.qsigners.deployer)
      .setMaxDepositProtocolPct(1000, getOverrideOptions());
    // getPoolValue
    const getPoolValue = await this.quickSwapFarmAdapter.getPoolValue(liquidityPool, underlyingToken);
    const farmTotalSupply = await farmInstance.totalSupply();
    expect(getPoolValue).to.be.eq(farmTotalSupply);
    // getAddLiquidityCodes
    await this.quickSwapFarmAdapter.getAddLiquidityCodes(this.testDeFiAdapter.address, underlyingToken);
    // getLiquidityPoolToken
    const getLiquidityPoolToken = await this.quickSwapFarmAdapter.getLiquidityPoolToken(
      underlyingToken,
      underlyingToken,
    );
    expect(getLiquidityPoolToken).to.be.eq(underlyingToken);
    // getHarvestSomeCodes
    await this.testDeFiAdapter.testGetHarvestSomeCodes(
      liquidityPool,
      underlyingToken,
      this.quickSwapFarmAdapter.address,
      0,
      getOverrideOptions(),
    );

    // 7. Coverage Test Fail case
    await expect(
      this.quickSwapFarmAdapter
        .connect(this.qsigners.admin)
        .setMaxDepositAmount(pool, underlyingToken, hre.ethers.utils.parseEther("100"), getOverrideOptions()),
    ).to.be.revertedWith("Not adjuster");
    await expect(
      this.quickSwapFarmAdapter.connect(this.qsigners.admin).setMaxDepositPoolPct(pool, 1000, getOverrideOptions()),
    ).to.be.revertedWith("Not adjuster");
    await expect(
      this.quickSwapFarmAdapter.connect(this.qsigners.admin).setMaxDepositProtocolPct(1000, getOverrideOptions()),
    ).to.be.revertedWith("Not adjuster");
    await expect(
      this.quickSwapFarmAdapter.connect(this.qsigners.admin).setMaxDepositProtocolMode(0, getOverrideOptions()),
    ).to.be.revertedWith("Not adjuster");
    await this.testDeFiAdapter.testGetDepositSomeCodes(
      underlyingToken,
      liquidityPool,
      this.quickSwapFarmAdapter.address,
      0,
      getOverrideOptions(),
    );
    // when withdraw amount is 0
    await this.testDeFiAdapter.testGetWithdrawSomeCodes(
      underlyingToken,
      liquidityPool,
      this.quickSwapFarmAdapter.address,
      0,
      getOverrideOptions(),
    );
  }).timeout(100000);
}
