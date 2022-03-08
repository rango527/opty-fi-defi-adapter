import hre from "hardhat";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { Network } from "@ethersproject/networks";
import { getAddress } from "ethers/lib/utils";
import { getOverrideOptions } from "../../utils";
import { ADDRESS, ABI } from "../pangolinFactory";
import { TOKEN_ABI } from "../token.abi";
import { default as tokens } from "../tokens.json";

chai.use(solidity);

interface tokens {
  [key: string]: string;
}

export function shouldBehaveLikePangolinPoolAdapter(token1: string, token2: string, underlyingTokenName: string): void {
  it(`${token1} - ${token2} Pool Test - underlyingToken is ${underlyingTokenName}`, async function () {
    const token1Address = (tokens as tokens)[token1];
    const token2Address = (tokens as tokens)[token2];
    const underlyingTokenAddress = (tokens as tokens)[underlyingTokenName];

    const avalanche: Network = {
      name: "Avalanche",
      chainId: 43114,
      _defaultProvider: providers => new providers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc"),
    };

    const defaultProvider = hre.ethers.getDefaultProvider(avalanche);
    const pangolinFactory = new hre.ethers.Contract(ADDRESS, ABI, defaultProvider);

    const pool = await pangolinFactory.getPair(token1Address, token2Address);

    // underlying token and instance
    const underlyingToken: string = underlyingTokenAddress;
    const tokenInstance = new hre.ethers.Contract(underlyingToken, TOKEN_ABI, defaultProvider);
    const decimals = await tokenInstance.decimals();

    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositProtocolMode(0, getOverrideOptions());
    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositAmount(pool, underlyingToken, hre.ethers.utils.parseUnits("10000", decimals), getOverrideOptions());

    // 1. deposit some underlying tokens
    let underlyingTokenBalance = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );

    const someDepositAmount = underlyingTokenBalance.div(2);

    let expectAmount = await this.pangolinPoolAdapter.calculateAmountInLPToken(
      underlyingToken,
      pool,
      someDepositAmount,
      getOverrideOptions(),
    );

    await this.testDeFiAdapter.testGetDepositSomeCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      someDepositAmount,
      getOverrideOptions(),
    );

    const actualAmount = await this.pangolinPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );

    expect(expectAmount).to.be.eq(actualAmount);

    // 2. deposit all underlying tokens
    underlyingTokenBalance = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    expectAmount = await this.pangolinPoolAdapter.calculateAmountInLPToken(
      underlyingToken,
      pool,
      underlyingTokenBalance,
      getOverrideOptions(),
    );
    const actualAmountBeforeAllDeposit = await this.pangolinPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );
    await this.testDeFiAdapter.testGetDepositAllCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      getOverrideOptions(),
    );

    const actualAmountAfterAllDeposit = await this.pangolinPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );

    expect(expectAmount).to.be.eq(actualAmountAfterAllDeposit.sub(actualAmountBeforeAllDeposit));

    // 3. Withdraw some lpToken balance
    const lpTokenBalance = await this.pangolinPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );
    const withdrawAmount = lpTokenBalance.div(2);
    let expectSomeAmount = await this.pangolinPoolAdapter.getSomeAmountInToken(underlyingToken, pool, withdrawAmount);
    let tokenBalanceBeforeWithdraw = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );

    await this.testDeFiAdapter.testGetWithdrawSomeCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      withdrawAmount,
      getOverrideOptions(),
    );

    let tokenBalanceAfterWithdraw = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );

    expect(expectSomeAmount).to.be.eq(tokenBalanceAfterWithdraw.sub(tokenBalanceBeforeWithdraw));

    // Coverage Test
    const isRedeemableAmountSufficient = await this.pangolinPoolAdapter.isRedeemableAmountSufficient(
      this.testDeFiAdapter.address,
      underlyingToken,
      pool,
      expectSomeAmount.div(2),
    );
    if (isRedeemableAmountSufficient) {
      await this.pangolinPoolAdapter.calculateRedeemableLPTokenAmount(
        this.testDeFiAdapter.address,
        underlyingToken,
        pool,
        expectSomeAmount.div(2),
      );
    }

    // 4. Withdraw all lpToken balance
    expectSomeAmount = await this.pangolinPoolAdapter.getAllAmountInToken(
      this.testDeFiAdapter.address,
      underlyingToken,
      pool,
    );

    tokenBalanceBeforeWithdraw = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );

    await this.testDeFiAdapter.testGetWithdrawAllCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      getOverrideOptions(),
    );

    tokenBalanceAfterWithdraw = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );

    expect(expectSomeAmount).to.be.eq(tokenBalanceAfterWithdraw.sub(tokenBalanceBeforeWithdraw));

    // 5. Coverage Test True case
    // 5.1 assert whether underlying token's address is correct or not
    const underlyingTokens = await this.pangolinPoolAdapter.getUnderlyingTokens(pool, pool);
    if (token1Address.toString() < token2Address.toString()) {
      expect(underlyingTokens[0]).to.be.eq(token1Address);
      expect(underlyingTokens[1]).to.be.eq(token2Address);
    } else {
      expect(underlyingTokens[0]).to.be.eq(token2Address);
      expect(underlyingTokens[1]).to.be.eq(token1Address);
    }

    // 5.2 assert whether the protocol can or not stake lpToken
    const canStake = await this.pangolinPoolAdapter.canStake(pool);
    expect(canStake).to.be.eq(false);

    // 5.3 assert whether lpToken address and rewardToken address is correct or not
    const getLiquidityPoolToken = await this.pangolinPoolAdapter.getLiquidityPoolToken(underlyingToken, pool);
    expect(getLiquidityPoolToken).to.be.eq(pool);
    const getRewardToken = await this.pangolinPoolAdapter.getRewardToken(pool);
    expect(getRewardToken).to.be.eq(getAddress("0x0000000000000000000000000000000000000000"));

    // 5.4 assert whether deposit amount is correct or not when deposit amount is more than max deposit amount
    // set maxDepositAmount is 0.01
    let setMaxDepositAmount = hre.ethers.utils.parseUnits("0.01", decimals);
    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositAmount(pool, underlyingToken, setMaxDepositAmount, getOverrideOptions());
    underlyingTokenBalance = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    await this.testDeFiAdapter.testGetDepositAllCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      getOverrideOptions(),
    );
    let underlyingTokenBalanceAfterDeposit = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    expect(underlyingTokenBalanceAfterDeposit).to.be.gte(underlyingTokenBalance.sub(setMaxDepositAmount));

    // set maxDepositProtocolMode is Pct mode
    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositProtocolMode(1, getOverrideOptions());

    // 5.5 assert whether deposit amount is correct or not when deposit amount is less than max deposit pool amount
    // set max deposit pool percent is 10%
    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositPoolPct(pool, 1000, getOverrideOptions());
    underlyingTokenBalance = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    await this.testDeFiAdapter.testGetDepositSomeCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      underlyingTokenBalance.div(10),
      getOverrideOptions(),
    );
    underlyingTokenBalanceAfterDeposit = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    expect(underlyingTokenBalanceAfterDeposit).to.be.gte(underlyingTokenBalance.sub(underlyingTokenBalance.div(10)));

    // All withdraw after deposit
    await this.testDeFiAdapter.testGetWithdrawAllCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      getOverrideOptions(),
    );

    // 5.6 assert whether deposit amount is correct or not when deposit amount is more than max deposit pool amount
    // set max deposit pool percent is 0.01%
    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositPoolPct(pool, 1, getOverrideOptions());
    underlyingTokenBalance = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    setMaxDepositAmount = await this.pangolinPoolAdapter.getPoolValue(pool, underlyingToken);
    await this.testDeFiAdapter.testGetDepositAllCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      getOverrideOptions(),
    );
    underlyingTokenBalanceAfterDeposit = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    expect(underlyingTokenBalanceAfterDeposit).to.be.gte(underlyingTokenBalance.sub(setMaxDepositAmount));

    // All withdraw after deposit
    await this.testDeFiAdapter.testGetWithdrawAllCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      getOverrideOptions(),
    );

    // 5.7 assert whether deposit amount is correct or not when maxDepositPoolPct and maxDepositProtocolPct are 0%
    // set maxDepositPoolPct is 0%
    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositPoolPct(pool, 0, getOverrideOptions());
    // set maxDepositProtocolPct is 0%
    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositProtocolPct(0, getOverrideOptions());
    underlyingTokenBalance = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    await this.testDeFiAdapter.testGetDepositSomeCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      underlyingTokenBalance.div(10),
      getOverrideOptions(),
    );
    underlyingTokenBalanceAfterDeposit = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    expect(underlyingTokenBalanceAfterDeposit).to.be.gte(underlyingTokenBalance);

    // 5.8 assert whether deposit amount is correct or not when deposit amount is less than max deposit protocol amount
    // set maxDepositProtocolPct is 10%
    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositProtocolPct(1000, getOverrideOptions());
    underlyingTokenBalance = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    await this.testDeFiAdapter.testGetDepositSomeCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      underlyingTokenBalance.div(10),
      getOverrideOptions(),
    );
    underlyingTokenBalanceAfterDeposit = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    expect(underlyingTokenBalanceAfterDeposit).to.be.gte(underlyingTokenBalance.sub(underlyingTokenBalance.div(10)));

    await this.testDeFiAdapter.testGetWithdrawAllCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      getOverrideOptions(),
    );

    // 5.9 assert whether deposit amount is correct or not when deposit amount is more than max deposit protocol amount
    // set maxDepositProtocolPct is 1%
    await this.pangolinPoolAdapter
      .connect(this.asigners.riskOperator)
      .setMaxDepositProtocolPct(1, getOverrideOptions());
    underlyingTokenBalance = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    setMaxDepositAmount = await this.pangolinPoolAdapter.getPoolValue(pool, underlyingToken);
    await this.testDeFiAdapter.testGetDepositAllCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      getOverrideOptions(),
    );
    underlyingTokenBalanceAfterDeposit = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    expect(underlyingTokenBalanceAfterDeposit).to.be.gte(underlyingTokenBalance.sub(setMaxDepositAmount));

    // All withdraw after some deposit
    await this.testDeFiAdapter.testGetWithdrawAllCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      getOverrideOptions(),
    );

    // assert whether deposit code when underlying amount is 0
    await this.testDeFiAdapter.testGetDepositSomeCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      0,
      getOverrideOptions(),
    );
    // assert whether withdraw code when lpToken amount is 0
    await this.testDeFiAdapter.testGetWithdrawSomeCodes(
      underlyingToken,
      pool,
      this.pangolinPoolAdapter.address,
      0,
      getOverrideOptions(),
    );

    // 6. Coverage Test Fail case
    // asserts whether the function caller is this contract's adjuster or not
    await expect(
      this.pangolinPoolAdapter
        .connect(this.asigners.admin)
        .setMaxDepositAmount(
          pool,
          underlyingToken,
          hre.ethers.utils.parseUnits("1000", decimals),
          getOverrideOptions(),
        ),
    ).to.be.revertedWith("caller is not the riskOperator");
    // asserts whether the function caller is this contract's adjuster or not
    await expect(
      this.pangolinPoolAdapter.connect(this.asigners.admin).setMaxDepositPoolPct(pool, 1000, getOverrideOptions()),
    ).to.be.revertedWith("caller is not the riskOperator");
    // asserts whether the function caller is this contract's adjuster or not
    await expect(
      this.pangolinPoolAdapter.connect(this.asigners.admin).setMaxDepositProtocolPct(1000, getOverrideOptions()),
    ).to.be.revertedWith("caller is not the riskOperator");
    // asserts whether the function caller is this contract's adjuster or not
    await expect(
      this.pangolinPoolAdapter.connect(this.asigners.admin).setMaxDepositProtocolMode(0, getOverrideOptions()),
    ).to.be.revertedWith("caller is not the riskOperator");
  }).timeout(100000);
}
