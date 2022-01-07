import hre from "hardhat";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { Network } from "@ethersproject/networks";
import { getOverrideOptions } from "../../utils";
import { ADDRESS, ABI } from "./quickSwapFactory";
import { POOL_ABI } from "./pool.abi";
import { TOKEN_ABI } from "./token.abi";

chai.use(solidity);

export function shouldBehaveLikeQuickSwapPoolAdapter(
  token1Name: string,
  token1Address: string,
  token2Name: string,
  token2Address: string,
): void {
  it(`should ${token1Name} and ${token2Name}`, async function () {
    const matic: Network = {
      name: "matic",
      chainId: 137,
      _defaultProvider: providers => new providers.JsonRpcProvider("https://polygon-rpc.com/"),
    };

    const defaultProvider = hre.ethers.getDefaultProvider(matic);
    const quickSwapFactory = new hre.ethers.Contract(ADDRESS, ABI, defaultProvider);

    const pool = await quickSwapFactory.getPair(token1Address, token2Address);

    // quickSwap pool deposit vault instance
    const quickSwapInstance = new hre.ethers.Contract(pool, POOL_ABI, defaultProvider);

    // underlying token and instance
    const underlyingToken: string = await quickSwapInstance.token0();
    const tokenInstance = new hre.ethers.Contract(underlyingToken, TOKEN_ABI, defaultProvider);
    const decimals = await tokenInstance.decimals();
    const underlyingTokenInstance = await hre.ethers.getContractAt("IERC20", underlyingToken);
    await this.quickSwapPoolAdapter.connect(this.qsigners.deployer).setMaxDepositProtocolMode(0, getOverrideOptions());
    await this.quickSwapPoolAdapter
      .connect(this.qsigners.deployer)
      .setMaxDepositAmount(pool, underlyingToken, hre.ethers.utils.parseUnits("1000", decimals), getOverrideOptions());

    // 1. deposit some underlying tokens
    // assert whether the some amount in token is as expected or not after depositing
    const expectAmount = await this.quickSwapPoolAdapter.calculateAmountInLPToken(
      underlyingToken,
      pool,
      hre.ethers.utils.parseUnits("10", decimals),
      getOverrideOptions(),
    );
    console.log("expectAmount", expectAmount.toString());

    await this.testDeFiAdapter.testGetDepositSomeCodes(
      underlyingToken,
      pool,
      this.quickSwapPoolAdapter.address,
      hre.ethers.utils.parseUnits("10", decimals),
      getOverrideOptions(),
    );
    const actualAmount = await this.quickSwapPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      pool,
      pool,
      getOverrideOptions(),
    );
    console.log("actualAmount", actualAmount.toString());

    // 2. deposit all underlying tokens
    await this.testDeFiAdapter.testGetDepositAllCodes(
      underlyingToken,
      pool,
      this.quickSwapPoolAdapter.address,
      getOverrideOptions(),
    );

    // 2.1 assert whether underlying token balance is as expected or not after deposit
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

    // 3. Withdraw some lpToken balance
    const poolBalanceBeforeWithdraw = await this.quickSwapPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );
    const withdrawAmount = poolBalanceBeforeWithdraw.div(2);
    await this.testDeFiAdapter.testGetWithdrawSomeCodes(
      underlyingToken,
      pool,
      this.quickSwapPoolAdapter.address,
      withdrawAmount,
      getOverrideOptions(),
    );

    // 3.1 assert whether lpToken balance is as expected or not
    const poolBalanceAfterWithdraw = await this.quickSwapPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );

    expect(poolBalanceBeforeWithdraw.sub(poolBalanceAfterWithdraw)).to.be.eq(withdrawAmount);

    // 4. Withdraw all lpToken balance
    await this.testDeFiAdapter.testGetWithdrawAllCodes(
      underlyingToken,
      pool,
      this.quickSwapPoolAdapter.address,
      getOverrideOptions(),
    );

    // 4.1 assert whether lpToken balance is as expected or not
    const actualLPTokenBalanceAfterWithdraw = await this.quickSwapPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );

    expect(actualLPTokenBalanceAfterWithdraw).to.be.eq(0);

    const expectedLPTokenBalanceAfterWithdraw = await quickSwapInstance.balanceOf(this.testDeFiAdapter.address);
    expect(actualLPTokenBalanceAfterWithdraw).to.be.eq(expectedLPTokenBalanceAfterWithdraw);

    // 4.2 assert whether underlying token balance is as expected or not after withdraw
    const actualUnderlyingTokenBalanceAfterWithdraw = await this.testDeFiAdapter.getERC20TokenBalance(
      (
        await this.quickSwapPoolAdapter.getUnderlyingTokens(pool, pool)
      )[0],
      this.testDeFiAdapter.address,
    );
    const expectedUnderlyingTokenBalanceAfterWithdraw = await underlyingTokenInstance.balanceOf(
      this.testDeFiAdapter.address,
    );

    expect(actualUnderlyingTokenBalanceAfterWithdraw).to.be.eq(expectedUnderlyingTokenBalanceAfterWithdraw);
  }).timeout(100000);
}
