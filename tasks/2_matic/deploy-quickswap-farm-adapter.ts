import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

import { QuickSwapFarmAdapter, QuickSwapFarmAdapter__factory } from "../../typechain";

task("deploy-quickswap-farm-adapter").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const quickSwapFactory: QuickSwapFarmAdapter__factory = await ethers.getContractFactory("QuickSwapFarmAdapter");
  const quickSwapFarmAdapter: QuickSwapFarmAdapter = <QuickSwapFarmAdapter>await quickSwapFactory.deploy();
  await quickSwapFarmAdapter.deployed();
  console.log("QuickSwapFarmAdapter deployed to: ", quickSwapFarmAdapter.address);
});
