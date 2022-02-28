import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

import { PangolinPoolAdapter, PangolinPoolAdapter__factory } from "../../typechain";

task("deploy-pangolin-pool-adapter").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const pangolinFactory: PangolinPoolAdapter__factory = await ethers.getContractFactory("PangolinPoolAdapter");
  const pangolinPoolAdapter: PangolinPoolAdapter = <PangolinPoolAdapter>await pangolinFactory.deploy();
  await pangolinPoolAdapter.deployed();
  console.log("PangolinPoolAdapter deployed to: ", pangolinPoolAdapter.address);
});
