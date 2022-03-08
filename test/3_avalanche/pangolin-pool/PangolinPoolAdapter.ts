import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { getAddress } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { IUniswapV2Router02, PangolinPoolAdapter } from "../../../typechain";
import { TestDeFiAdapter } from "../../../typechain/TestDeFiAdapter";
import { getOverrideOptions } from "../../utils";
import { Signers } from "../types";
import { shouldBehaveLikePangolinPoolAdapter } from "./PangolinPoolAdapter.behavior";
import { default as tokens } from "../tokens.json";

const { deployContract, deployMockContract } = hre.waffle;

const assetPairs = [
  ["USDC", "USDC.e"],
  ["USDC", "USDT.e"],
  ["USDC.e", "USDT.e"],
  ["USDC.e", "DAI.e"],
  ["USDC.e", "MIM"],
  ["USDT.e", "DAI.e"],
  ["USDT.e", "TUSD"],
  ["USDT.e", "MIM"],
  ["DAI.e", "TUSD"],
];

describe("Unit tests", function () {
  before(async function () {
    this.asigners = {} as Signers;
    const DAI_ADDRESS: string = getAddress(tokens["DAI.e"]);
    const USDT_ADDRESS: string = getAddress(tokens["USDT.e"]);
    const USDC_ADDRESS: string = getAddress(tokens.USDC);
    const USDC_E_ADDRESS: string = getAddress(tokens["USDC.e"]);
    const TUSD_ADDRESS: string = getAddress(tokens.TUSD);
    const MIM_ADDRESS: string = getAddress(tokens.MIM);

    const DAI_WHALE: string = getAddress("0xEf22c14F46858d5aC61326497b056974167F2eE1");
    const USDT_WHALE: string = getAddress("0xd2B9Aa758e4C3c33052E7053C5aBB8E70Bf9D090");
    const USDC_WHALE: string = getAddress("0xBF14DB80D9275FB721383a77C00Ae180fc40ae98");
    const USDC_E_WHALE: string = getAddress("0xce2cc46682e9c6d5f174af598fb4931a9c0be68e");
    const TUSD_WHALE: string = getAddress("0xD6216fC19DB775Df9774a6E33526131dA7D19a2c");
    const MIM_WHALE: string = getAddress("0xf4F46382C2bE1603Dc817551Ff9A7b333Ed1D18f");

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
      params: [USDC_E_WHALE],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [TUSD_WHALE],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [MIM_WHALE],
    });

    this.asigners.admin = signers[0];
    this.asigners.owner = signers[1];
    this.asigners.deployer = signers[2];
    this.asigners.alice = signers[3];
    this.asigners.riskOperator = signers[4];

    this.asigners.daiWhale = await hre.ethers.getSigner(DAI_WHALE);
    this.asigners.usdtWhale = await hre.ethers.getSigner(USDT_WHALE);
    this.asigners.usdcWhale = await hre.ethers.getSigner(USDC_WHALE);
    this.asigners.usdceWhale = await hre.ethers.getSigner(USDC_E_WHALE);
    this.asigners.tusdWhale = await hre.ethers.getSigner(TUSD_WHALE);
    this.asigners.mimWhale = await hre.ethers.getSigner(MIM_WHALE);

    const dai = await hre.ethers.getContractAt("IERC20", DAI_ADDRESS, this.asigners.daiWhale);
    const usdt = await hre.ethers.getContractAt("IERC20", USDT_ADDRESS, this.asigners.usdtWhale);
    const usdc = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS, this.asigners.usdcWhale);
    const usdce = await hre.ethers.getContractAt("IERC20", USDC_E_ADDRESS, this.asigners.usdceWhale);
    const tusd = await hre.ethers.getContractAt("IERC20", TUSD_ADDRESS, this.asigners.tusdWhale);
    const mim = await hre.ethers.getContractAt("IERC20", MIM_ADDRESS, this.asigners.mimWhale);
    // get the UniswapV2Router contract instance
    this.uniswapV2Router02 = <IUniswapV2Router02>(
      await hre.ethers.getContractAt("IUniswapV2Router02", "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106")
    );

    // deploy TestDeFiAdapter Contract
    const testDeFiAdapterArtifact: Artifact = await hre.artifacts.readArtifact("TestDeFiAdapter");
    this.testDeFiAdapter = <TestDeFiAdapter>(
      await deployContract(this.asigners.deployer, testDeFiAdapterArtifact, [], getOverrideOptions())
    );

    const registryArtifact: Artifact = await hre.artifacts.readArtifact("IAdapterRegistryBase");
    this.mockRegistry = await deployMockContract(this.asigners.deployer, registryArtifact.abi);
    await this.mockRegistry.mock.getRiskOperator.returns(this.asigners.riskOperator.address);

    // deploy Pangolin Finance Adapter
    const pangolinAdapterArtifact: Artifact = await hre.artifacts.readArtifact("PangolinPoolAdapter");
    this.pangolinPoolAdapter = <PangolinPoolAdapter>(
      await deployContract(
        this.asigners.deployer,
        pangolinAdapterArtifact,
        [this.mockRegistry.address],
        getOverrideOptions(),
      )
    );

    // fund the whale's wallet with gas
    await this.asigners.admin.sendTransaction({
      to: DAI_WHALE,
      value: hre.ethers.utils.parseEther("1000"),
      ...getOverrideOptions(),
    });
    await this.asigners.admin.sendTransaction({
      to: USDT_WHALE,
      value: hre.ethers.utils.parseEther("1000"),
      ...getOverrideOptions(),
    });
    await this.asigners.admin.sendTransaction({
      to: USDC_WHALE,
      value: hre.ethers.utils.parseEther("1000"),
      ...getOverrideOptions(),
    });
    await this.asigners.admin.sendTransaction({
      to: USDC_E_WHALE,
      value: hre.ethers.utils.parseEther("1000"),
      ...getOverrideOptions(),
    });
    await this.asigners.admin.sendTransaction({
      to: TUSD_WHALE,
      value: hre.ethers.utils.parseEther("1000"),
      ...getOverrideOptions(),
    });
    await this.asigners.admin.sendTransaction({
      to: MIM_WHALE,
      value: hre.ethers.utils.parseEther("1000"),
      ...getOverrideOptions(),
    });

    await dai.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseEther("100"), getOverrideOptions());
    await usdc.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseUnits("100", 6), getOverrideOptions());
    await usdce.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseUnits("100", 6), getOverrideOptions());
    await usdt.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseUnits("100", 6), getOverrideOptions());
    await tusd.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseEther("100"), getOverrideOptions());
    await mim.transfer(this.testDeFiAdapter.address, hre.ethers.utils.parseEther("100"), getOverrideOptions());
  });

  describe("PangolinPoolAdapter", function () {
    assetPairs.map(pair => {
      shouldBehaveLikePangolinPoolAdapter(pair[0], pair[1], pair[0]);
      shouldBehaveLikePangolinPoolAdapter(pair[0], pair[1], pair[1]);
    });
  });
});
