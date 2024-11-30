// File: contracts/LendingPlatform.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LoanTypes.sol";
import "./LoanStorage.sol";

contract LendingPlatform is LoanStorage {
    // Events to notify frontend
    event RequestCreated(uint256 requestId, address borrower, uint256 amount);
    event LoanFunded(uint256 requestId, address lender, uint256 amount);
    event LoanRepaid(uint256 loanId);

    // Create new loan request
    function createLoanRequest(
        uint256 _loanAmount,
        uint256 _durationInDays
    ) external payable {
        // Check basic conditions
        require(_loanAmount > 0, "Loan amount must be greater than 0");
        require(_durationInDays > 0, "Duration must be greater than 0");
        require(msg.value > 0, "Must send collateral");

        // Create new request
        uint256 requestId = getNextRequestId();
        LoanTypes.LoanRequest storage request = loanRequests[requestId];

        request.borrower = msg.sender;
        request.loanAmount = _loanAmount;
        request.duration = _durationInDays;
        request.isActive = true;
        request.collateral = msg.value;

        emit RequestCreated(requestId, msg.sender, _loanAmount);
    }

    // Lender funds a loan request
    function fundLoanRequest(
        uint256 _requestId,
        uint256 _interestRate
    ) external payable {
        LoanTypes.LoanRequest storage request = loanRequests[_requestId];

        // Check conditions
        require(request.isActive, "Request is not active");
        require(msg.value == request.loanAmount, "Must send exact loan amount");

        // Create active loan
        uint256 loanId = getNextLoanId();
        LoanTypes.ActiveLoan storage loan = activeLoans[loanId];

        loan.borrower = request.borrower;
        loan.lender = msg.sender;
        loan.loanAmount = request.loanAmount;
        loan.collateral = request.collateral;
        loan.endTime = block.timestamp + (request.duration * 1 days);
        loan.interestRate = _interestRate;

        // Mark request as inactive
        request.isActive = false;

        // Send loan amount to borrower
        payable(request.borrower).transfer(msg.value);

        emit LoanFunded(_requestId, msg.sender, msg.value);
    }

    // Borrower repays loan
    function repayLoan(uint256 _loanId) external payable {
        LoanTypes.ActiveLoan storage loan = activeLoans[_loanId];

        // Check conditions
        require(msg.sender == loan.borrower, "Only borrower can repay");
        require(!loan.isRepaid, "Loan already repaid");

        // Calculate total due (loan + interest)
        uint256 interest = (loan.loanAmount * loan.interestRate) / 100;
        uint256 totalDue = loan.loanAmount + interest;
        require(msg.value >= totalDue, "Must send full amount plus interest");

        // Mark loan as repaid
        loan.isRepaid = true;

        // Return collateral to borrower
        payable(loan.borrower).transfer(loan.collateral);

        // Send repayment to lender
        payable(loan.lender).transfer(totalDue);

        emit LoanRepaid(_loanId);
    }

    // Check if loan is expired and can be liquidated
    function checkLoanStatus(
        uint256 _loanId
    ) external view returns (string memory) {
        LoanTypes.ActiveLoan storage loan = activeLoans[_loanId];

        if (loan.isRepaid) {
            return "Loan is repaid";
        } else if (block.timestamp > loan.endTime) {
            return "Loan is expired";
        } else {
            return "Loan is active";
        }
    }

    // Liquidate expired loan
    function liquidateExpiredLoan(uint256 _loanId) external {
        LoanTypes.ActiveLoan storage loan = activeLoans[_loanId];

        require(!loan.isRepaid, "Loan is already repaid");
        require(block.timestamp > loan.endTime, "Loan is not expired yet");

        // Mark as repaid to prevent further actions
        loan.isRepaid = true;

        // Send collateral to lender
        payable(loan.lender).transfer(loan.collateral);
    }
}
