// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Crowdfund {
    mapping(address => uint) pledges;
    uint256 sum = 0;
    uint256 goal = 100 ether;
    bool campaignLive = true;

    function getGoal() external view returns (uint256) {
        return goal;
    }

    function getSum() external view returns (uint256) {
        return sum;
    }

    function donate() external payable {
        require(msg.value > 0 && msg.sender != address(0) && campaignLive);
        sum += msg.value;
        pledges[msg.sender] += msg.value;
    }

    function endCampaign(address payable beneficiary) external returns (bool) {
        require(campaignLive);
        campaignLive = false;
        beneficiary.transfer(sum);
        return sum >= goal;
    }
}
