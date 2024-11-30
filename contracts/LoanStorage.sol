// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LoanTypes.sol";

contract LoanStorage {
    // Store all loan requests
    mapping(uint256 => LoanTypes.LoanRequest) public loanRequests;
    uint256 public totalRequests;

    // Store all active loans
    mapping(uint256 => LoanTypes.ActiveLoan) public activeLoans;
    uint256 public totalLoans;

    // Get next ID for new loan request
    function getNextRequestId() internal returns (uint256) {
        return totalRequests++;
    }

    // Get next ID for new active loan
    function getNextLoanId() internal returns (uint256) {
        return totalLoans++;
    }
}
