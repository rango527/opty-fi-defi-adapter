import hre from "hardhat";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber, utils } from "ethers";
import { getOverrideOptions } from "../../utils";
import { PoolItem } from "../types";

chai.use(solidity);

export function shouldBehaveLikeQuickSwapPoolAdapter(name: string, token: string,  pool: string): void {
  console.log('aaaa');
  console.log('pool', pool);
  
  it(`should`, async function () {
    console.log('aaaaaaaaaaaaa');
    
    // quickSwap pool deposit vault instance
    const quickSwapDepositInstance = await hre.ethers.getContractAt("IQuickSwapDeposit", pool);
    const decimals = await quickSwapDepositInstance.decimals();
    // underlying token instance
    const underlyingTokenInstance = await hre.ethers.getContractAt("IERC20", token);
    // 1. deposit all underlying tokens
    await this.testDeFiAdapter.testGetDepositAllCodes(
      token,
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
    const expectedLPTokenBalanceAfterDeposit = await quickSwapDepositInstance.balanceOf(this.testDeFiAdapter.address);
    expect(actualLPTokenBalanceAfterDeposit).to.be.eq(expectedLPTokenBalanceAfterDeposit);

    // // 1.2 assert whether underlying token balance is as expected or not after deposit
    // const actualUnderlyingTokenBalanceAfterDeposit = await this.testDeFiAdapter.getERC20TokenBalance(
    //   (
    //     await this.quickSwapPoolAdapter.getUnderlyingTokens(pool, pool)
    //   )[0],
    //   this.testDeFiAdapter.address,
    // );
    // const expectedUnderlyingTokenBalanceAfterDeposit = await underlyingTokenInstance.balanceOf(
    //   this.testDeFiAdapter.address,
    // );
    // expect(actualUnderlyingTokenBalanceAfterDeposit).to.be.eq(expectedUnderlyingTokenBalanceAfterDeposit);

    // // 1.3 assert whether the amount in token is as expected or not after depositing
    // const actualAmountInTokenAfterDeposit = await this.harvestFinanceAdapter.getAllAmountInToken(
    //   this.testDeFiAdapter.address,
    //   token,
    //   pool,
    // );
    // const pricePerFullShareAfterDeposit = await quickSwapDepositInstance.getPricePerFullShare();
    // const expectedAmountInTokenAfterDeposit = BigNumber.from(expectedLPTokenBalanceAfterDeposit)
    //   .mul(BigNumber.from(pricePerFullShareAfterDeposit))
    //   .div(BigNumber.from("10").pow(BigNumber.from(decimals)));
    // expect(actualAmountInTokenAfterDeposit).to.be.eq(expectedAmountInTokenAfterDeposit);
    // 2. stake all lpTokens
  }).timeout(100000);
}
