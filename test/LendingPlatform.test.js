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
});