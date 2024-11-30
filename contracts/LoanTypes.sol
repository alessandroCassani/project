// File: contracts/LoanTypes.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LoanTypes {
    struct LoanRequest {
        address borrower; // Who wants to borrow
        uint256 loanAmount; // How much they want to borrow
        uint256 duration; // For how long (in days)
        bool isActive; // Is this request still active?
        uint256 collateral; // Safety deposit
    }

    struct ActiveLoan {
        address borrower; // Who borrowed
        address lender; // Who lent
        uint256 loanAmount; // Amount borrowed
        uint256 collateral; // Safety deposit
        uint256 endTime; // When loan must be repaid
        uint256 interestRate; // Interest percentage
        bool isRepaid; // Has loan been repaid?
    }
}
