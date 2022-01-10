import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

import { QuickSwapPoolAdapter, QuickSwapPoolAdapter__factory } from "../../typechain";

task("deploy-quickswap-adapter").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const quickSwapFactory: QuickSwapPoolAdapter__factory = await ethers.getContractFactory("QuickSwapPoolAdapter");
  const quickSwapPoolAdapter: QuickSwapPoolAdapter = <QuickSwapPoolAdapter>await quickSwapFactory.deploy();
  await quickSwapPoolAdapter.deployed();
  console.log("QuickSwapPoolAdapter deployed to: ", quickSwapPoolAdapter.address);
});
