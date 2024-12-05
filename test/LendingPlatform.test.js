const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPlatform", function () {
  let lendingPlatform;
  let owner;
  let borrower;
  let lender;
  let loanAmount;
  let duration;

  beforeEach(async function () {
    [owner, borrower, lender] = await ethers.getSigners();
    
    const LendingPlatform = await ethers.getContractFactory("LendingPlatform");
    lendingPlatform = await LendingPlatform.deploy();
    await lendingPlatform.waitForDeployment();

    loanAmount = ethers.parseEther("1"); 
    duration = 30; 
  });

  describe("Loan Requests", function () {
    it("Should create a loan request", async function () {
      const stake = ethers.parseEther("2");
      
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: stake }
      );

      const request = await lendingPlatform.loanRequests(0);
      expect(request.borrower).to.equal(borrower.address);
      expect(request.loanAmount).to.equal(loanAmount);
      expect(request.duration).to.equal(duration);
      expect(request.stake).to.equal(stake);
      expect(request.isActive).to.be.true;
    });

    it("Should revert if collateral is insufficient", async function () {
      const lowCollateral = ethers.parseEther("0.5");
      
      await expect(
        lendingPlatform.connect(borrower).createLoanRequest(
          loanAmount,
          duration,
          { value: lowCollateral }
        )
      ).to.be.revertedWith("Insufficient collateral");
    });
  });

  describe("Loan Funding", function () {
    it("Should fund a loan request", async function () {
      // First create a loan request
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: ethers.parseEther("2") }
      );

      const interestRate = 5; 
      
      await lendingPlatform.connect(lender).fundLoanRequest(
        0, 
        interestRate,
        { value: loanAmount }
      );

      const loan = await lendingPlatform.activeLoans(0);
      expect(loan.lender).to.equal(lender.address);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.loanAmount).to.equal(loanAmount);
      expect(loan.interestRate).to.equal(interestRate);
    });
  });

  describe("Loan Repayment", function () {
    it("Should repay a loan successfully", async function () {
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: ethers.parseEther("2") }
      );

      const request = await lendingPlatform.loanRequests(0);
      
      await lendingPlatform.connect(lender).fundLoanRequest(
        0,
        5,
        { value: loanAmount }
      );
      
      const loan = await lendingPlatform.activeLoans(0);
      const interest = (loanAmount * BigInt(5)) / BigInt(100);
      const repaymentAmount = loanAmount + interest;
      await lendingPlatform.connect(borrower).repayLoan(
        0,
        { value: repaymentAmount }
      );
      
      const updatedLoan = await lendingPlatform.activeLoans(0);
      expect(updatedLoan.isRepaid).to.be.true;
    });
  });

  describe("Loan Status", function () {
    it("Should return correct loan status", async function () {
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: ethers.parseEther("2") }
      );

      await lendingPlatform.connect(lender).fundLoanRequest(
        0,
        5,
        { value: loanAmount }
      );

      expect(await lendingPlatform.checkLoanStatus(0)).to.equal("Loan active");
      
      // Fast forward time
      await network.provider.send("evm_increaseTime", [duration * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");

      expect(await lendingPlatform.checkLoanStatus(0)).to.equal("Loan expired");
    });
  });

  describe("Get Borrower Active Loans", function () {
    it("Should return all active loans for a borrower", async function () {
      // Create multiple loan requests
      const stake = ethers.parseEther("2");
      const loanAmount1 = ethers.parseEther("1");
      const loanAmount2 = ethers.parseEther("0.5");
      
      // Create first loan request
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount1,
        duration,
        { value: stake }
      );

      // Create second loan request
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount2,
        duration,
        { value: stake }
      );

      // Fund first loan
      await lendingPlatform.connect(lender).fundLoanRequest(
        0,
        5, 
        { value: loanAmount1 }
      );

      // Fund second loan
      await lendingPlatform.connect(lender).fundLoanRequest(
        1,
        7, 
        { value: loanAmount2 }
      );

      // Get borrower's active loans
      const [loanIds, loans] = await lendingPlatform.getBorrowerActiveLoans(borrower.address);

      // Verify the number of active loans
      expect(loanIds.length).to.equal(2);
      expect(loans.length).to.equal(2);

      expect(loanIds[0]).to.equal(0);
      expect(loans[0].borrower).to.equal(borrower.address);
      expect(loans[0].lender).to.equal(lender.address);
      expect(loans[0].loanAmount).to.equal(loanAmount1);
      expect(loans[0].interestRate).to.equal(5);
      expect(loans[0].isRepaid).to.be.false;

      expect(loanIds[1]).to.equal(1);
      expect(loans[1].borrower).to.equal(borrower.address);
      expect(loans[1].lender).to.equal(lender.address);
      expect(loans[1].loanAmount).to.equal(loanAmount2);
      expect(loans[1].interestRate).to.equal(7);
      expect(loans[1].isRepaid).to.be.false;
    });

    it("Should not return repaid loans", async function () {
      const stake = ethers.parseEther("2");
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: stake }
      );

      await lendingPlatform.connect(lender).fundLoanRequest(
        0,
        5,
        { value: loanAmount }
      );

      const interest = (loanAmount * BigInt(5)) / BigInt(100);
      const repaymentAmount = loanAmount + interest;
      await lendingPlatform.connect(borrower).repayLoan(
        0,
        { value: repaymentAmount }
      );

      const [loanIds, loans] = await lendingPlatform.getBorrowerActiveLoans(borrower.address);

      // Should return empty arrays as all loans are repaid
      expect(loanIds.length).to.equal(0);
      expect(loans.length).to.equal(0);
    });

    it("Should return empty arrays for borrower with no loans", async function () {
      const [loanIds, loans] = await lendingPlatform.getBorrowerActiveLoans(borrower.address);

      expect(loanIds.length).to.equal(0);
      expect(loans.length).to.equal(0);
    });

    it("Should only return loans for the specified borrower", async function () {
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: ethers.parseEther("2") }
      );

      await lendingPlatform.connect(lender).fundLoanRequest(
        0,
        5,
        { value: loanAmount }
      );

      // Create a loan for a different borrower
      const otherBorrower = owner; 
      await lendingPlatform.connect(otherBorrower).createLoanRequest(
        loanAmount,
        duration,
        { value: ethers.parseEther("2") }
      );

      await lendingPlatform.connect(lender).fundLoanRequest(
        1,
        5,
        { value: loanAmount }
      );

      // Check main borrower's loans
      const [loanIds, loans] = await lendingPlatform.getBorrowerActiveLoans(borrower.address);

      // Should only return one loan
      expect(loanIds.length).to.equal(1);
      expect(loans.length).to.equal(1);
      expect(loans[0].borrower).to.equal(borrower.address);
    });
  });
});