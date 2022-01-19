// SPDX-License-Identifier: MIT

pragma solidity >0.6.0 <=0.9.0;

interface IStakingRewards {
    function stake(uint256 _value) external;

    function exit() external;

    function earned(address _holder) external view returns (uint256);

    function balanceOf(address _holder) external view returns (uint256);

    function rewardsToken() external view returns (address);

    function totalSupply() external view returns (uint256);

    function getReward() external;
}
