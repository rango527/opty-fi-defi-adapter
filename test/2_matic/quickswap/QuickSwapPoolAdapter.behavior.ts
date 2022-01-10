import hre from "hardhat";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { Network } from "@ethersproject/networks";
import { getOverrideOptions } from "../../utils";
import { ADDRESS, ABI } from "./quickSwapFactory";
import { TOKEN_ABI } from "./token.abi";

chai.use(solidity);

export function shouldBehaveLikeQuickSwapPoolAdapter(
  token1Name: string,
  token1Address: string,
  token2Name: string,
  token2Address: string,
  underlyingTokenName: string,
  underlyingTokenAddress: string,
): void {
  it(`${token1Name} - ${token2Name} Pool Test - underlyingToken is ${underlyingTokenName}`, async function () {
    const matic: Network = {
      name: "matic",
      chainId: 137,
      _defaultProvider: providers => new providers.JsonRpcProvider("https://polygon-rpc.com/"),
    };

    const defaultProvider = hre.ethers.getDefaultProvider(matic);
    const quickSwapFactory = new hre.ethers.Contract(ADDRESS, ABI, defaultProvider);

    const pool = await quickSwapFactory.getPair(token1Address, token2Address);

    // underlying token and instance
    const underlyingToken: string = underlyingTokenAddress;
    const tokenInstance = new hre.ethers.Contract(underlyingToken, TOKEN_ABI, defaultProvider);
    const decimals = await tokenInstance.decimals();
    await this.quickSwapPoolAdapter.connect(this.qsigners.deployer).setMaxDepositProtocolMode(0, getOverrideOptions());
    await this.quickSwapPoolAdapter
      .connect(this.qsigners.deployer)
      .setMaxDepositAmount(pool, underlyingToken, hre.ethers.utils.parseUnits("100", decimals), getOverrideOptions());

    // 1. deposit some underlying tokens
    let underlyingTokenBalance = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );
    const someDepositAmount = underlyingTokenBalance.div(2);

    let expectAmount = await this.quickSwapPoolAdapter.calculateAmountInLPToken(
      underlyingToken,
      pool,
      someDepositAmount,
      getOverrideOptions(),
    );

    await this.testDeFiAdapter.testGetDepositSomeCodes(
      underlyingToken,
      pool,
      this.quickSwapPoolAdapter.address,
      someDepositAmount,
      getOverrideOptions(),
    );

    const actualAmount = await this.quickSwapPoolAdapter.getLiquidityPoolTokenBalance(
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
    expectAmount = await this.quickSwapPoolAdapter.calculateAmountInLPToken(
      underlyingToken,
      pool,
      underlyingTokenBalance,
      getOverrideOptions(),
    );
    const actualAmountBeforeAllDeposit = await this.quickSwapPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );
    await this.testDeFiAdapter.testGetDepositAllCodes(
      underlyingToken,
      pool,
      this.quickSwapPoolAdapter.address,
      getOverrideOptions(),
    );

    const actualAmountAfterAllDeposit = await this.quickSwapPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );

    expect(expectAmount).to.be.eq(actualAmountAfterAllDeposit.sub(actualAmountBeforeAllDeposit));

    // 3. Withdraw some lpToken balance
    const lpTokenBalance = await this.quickSwapPoolAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool,
    );
    const withdrawAmount = lpTokenBalance.div(2);
    let expectSomeAmount = await this.quickSwapPoolAdapter.getSomeAmountInToken(underlyingToken, pool, withdrawAmount);

    let tokenBalanceBeforeWithdraw = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );

    await this.testDeFiAdapter.testGetWithdrawSomeCodes(
      underlyingToken,
      pool,
      this.quickSwapPoolAdapter.address,
      withdrawAmount,
      getOverrideOptions(),
    );

    let tokenBalanceAfterWithdraw = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );

    expect(expectSomeAmount).to.be.eq(tokenBalanceAfterWithdraw.sub(tokenBalanceBeforeWithdraw));

    // 4. Withdraw all lpToken balance
    expectSomeAmount = await this.quickSwapPoolAdapter.getAllAmountInToken(
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
      this.quickSwapPoolAdapter.address,
      getOverrideOptions(),
    );

    tokenBalanceAfterWithdraw = await this.testDeFiAdapter.getERC20TokenBalance(
      underlyingToken,
      this.testDeFiAdapter.address,
    );

    expect(expectSomeAmount).to.be.eq(tokenBalanceAfterWithdraw.sub(tokenBalanceBeforeWithdraw));
  }).timeout(100000);
}
