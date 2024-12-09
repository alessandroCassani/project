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

    it("Should revert if loan amount is 0", async function () {
      const stake = ethers.parseEther("2");
      await expect(
        lendingPlatform.connect(borrower).createLoanRequest(
          0,
          duration,
          { value: stake }
        )
      ).to.be.revertedWith("Loan amount must be greater than 0");
    });

    it("Should revert if duration is 0", async function () {
      const stake = ethers.parseEther("2");
      await expect(
        lendingPlatform.connect(borrower).createLoanRequest(
          loanAmount,
          0,
          { value: stake }
        )
      ).to.be.revertedWith("Duration must be greater than 0");
    });

    it("Should increment totalRequests counter", async function () {
      const stake = ethers.parseEther("2");
      const initialRequests = await lendingPlatform.totalRequests();
      
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: stake }
      );

      expect(await lendingPlatform.totalRequests()).to.equal(initialRequests + BigInt(1));
    });
  });

  describe("Loan Funding", function () {
    it("Should fund a loan request", async function () {
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

    it("Should revert if request is not active", async function () {
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

      await expect(
        lendingPlatform.connect(lender).fundLoanRequest(
          0,
          5,
          { value: loanAmount }
        )
      ).to.be.revertedWith("Request is not active");
    });

    it("Should revert if sent amount doesn't match loan amount", async function () {
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: ethers.parseEther("2") }
      );

      await expect(
        lendingPlatform.connect(lender).fundLoanRequest(
          0,
          5,
          { value: ethers.parseEther("0.5") }
        )
      ).to.be.revertedWith("Must send exact loan amount");
    });

    it("Should increment totalLoans counter", async function () {
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: ethers.parseEther("2") }
      );

      const initialLoans = await lendingPlatform.totalLoans();
      
      await lendingPlatform.connect(lender).fundLoanRequest(
        0,
        5,
        { value: loanAmount }
      );

      expect(await lendingPlatform.totalLoans()).to.equal(initialLoans + BigInt(1));
    });

    it("Should transfer loan amount to borrower", async function () {
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: ethers.parseEther("2") }
      );

      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);
      
      await lendingPlatform.connect(lender).fundLoanRequest(
        0,
        5,
        { value: loanAmount }
      );

      const borrowerBalanceAfter = await ethers.provider.getBalance(borrower.address);
      expect(borrowerBalanceAfter - borrowerBalanceBefore).to.equal(loanAmount);
    });
  });

  describe("Loan Repayment", function () {
    beforeEach(async function () {
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
    });

    it("Should repay a loan successfully", async function () {
      const interest = (loanAmount * BigInt(5)) / BigInt(100);
      const repaymentAmount = loanAmount + interest;
      
      await lendingPlatform.connect(borrower).repayLoan(
        0,
        { value: repaymentAmount }
      );
      
      const updatedLoan = await lendingPlatform.activeLoans(0);
      expect(updatedLoan.isRepaid).to.be.true;
    });

    it("Should revert if non-borrower tries to repay", async function () {
      const interest = (loanAmount * BigInt(5)) / BigInt(100);
      const repaymentAmount = loanAmount + interest;

      await expect(
        lendingPlatform.connect(lender).repayLoan(
          0,
          { value: repaymentAmount }
        )
      ).to.be.revertedWith("Only borrower can repay");
    });

    it("Should revert if payment amount is insufficient", async function () {
      const insufficientAmount = loanAmount;

      await expect(
        lendingPlatform.connect(borrower).repayLoan(
          0,
          { value: insufficientAmount }
        )
      ).to.be.revertedWith("Must send full amount plus interest");
    });

    it("Should revert if loan is already repaid", async function () {
      const interest = (loanAmount * BigInt(5)) / BigInt(100);
      const repaymentAmount = loanAmount + interest;

      await lendingPlatform.connect(borrower).repayLoan(
        0,
        { value: repaymentAmount }
      );

      await expect(
        lendingPlatform.connect(borrower).repayLoan(
          0,
          { value: repaymentAmount }
        )
      ).to.be.revertedWith("Loan already repaid");
    });

    it("Should transfer stake back to borrower and payment to lender", async function () {
      const interest = (loanAmount * BigInt(5)) / BigInt(100);
      const repaymentAmount = loanAmount + interest;

      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);
      const lenderBalanceBefore = await ethers.provider.getBalance(lender.address);

      const tx = await lendingPlatform.connect(borrower).repayLoan(
        0,
        { value: repaymentAmount }
      );
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const borrowerBalanceAfter = await ethers.provider.getBalance(borrower.address);
      const lenderBalanceAfter = await ethers.provider.getBalance(lender.address);

      const expectedBorrowerChange = ethers.parseEther("2") - repaymentAmount - gasCost;
      expect(borrowerBalanceAfter - borrowerBalanceBefore).to.be.closeTo(
        expectedBorrowerChange,
        ethers.parseEther("0.0001")
      );

      expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(repaymentAmount);
    });
  });

  describe("Loan Status", function () {
    beforeEach(async function () {
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
    });

    it("Should return 'Loan active' for active loans", async function () {
      expect(await lendingPlatform.checkLoanStatus(0)).to.equal("Loan active");
    });

    it("Should return 'Loan expired' for expired loans", async function () {
      await network.provider.send("evm_increaseTime", [duration * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");

      expect(await lendingPlatform.checkLoanStatus(0)).to.equal("Loan expired");
    });

    it("Should return 'Loan repaid' for repaid loans", async function () {
      const interest = (loanAmount * BigInt(5)) / BigInt(100);
      const repaymentAmount = loanAmount + interest;
      
      await lendingPlatform.connect(borrower).repayLoan(
        0,
        { value: repaymentAmount }
      );

      expect(await lendingPlatform.checkLoanStatus(0)).to.equal("Loan repaid");
    });
  });

  describe("Loan Liquidation", function () {
    beforeEach(async function () {
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
    });

    it("Should liquidate expired loan", async function () {
      await network.provider.send("evm_increaseTime", [duration * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");

      const lenderBalanceBefore = await ethers.provider.getBalance(lender.address);
      
      await lendingPlatform.connect(owner).liquidateExpiredLoan(0);

      const lenderBalanceAfter = await ethers.provider.getBalance(lender.address);
      const loan = await lendingPlatform.activeLoans(0);

      expect(loan.isRepaid).to.be.true;
      expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(ethers.parseEther("2")); // stake amount
    });

    it("Should revert if loan is not expired", async function () {
      await expect(
        lendingPlatform.connect(owner).liquidateExpiredLoan(0)
      ).to.be.revertedWith("Loan is not expired yet");
    });

    it("Should revert if loan is already repaid", async function () {
      await network.provider.send("evm_increaseTime", [duration * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");

      await lendingPlatform.connect(owner).liquidateExpiredLoan(0);

      await expect(
        lendingPlatform.connect(owner).liquidateExpiredLoan(0)
      ).to.be.revertedWith("Loan is already repaid");
    });
  });

  describe("Get Borrower Active Loans", function () {
    it("Should return all active loan requests for a borrower", async function () {
      const stake = ethers.parseEther("2");
      const loanAmount1 = ethers.parseEther("1");
      const loanAmount2 = ethers.parseEther("0.5");
      
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount1,
        duration,
        { value: stake }
      );
  
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount2,
        duration,
        { value: stake }
      );
  
      const [requestIds, requests] = await lendingPlatform.getBorrowerActiveLoans(borrower.address);
  
      expect(requestIds.length).to.equal(2);
      expect(requests.length).to.equal(2);
  
      expect(requestIds[0]).to.equal(0);
      expect(requests[0].borrower).to.equal(borrower.address);
      expect(requests[0].loanAmount).to.equal(loanAmount1);
      expect(requests[0].duration).to.equal(duration);
      expect(requests[0].isActive).to.be.true;
      expect(requests[0].stake).to.equal(stake);
  
      expect(requestIds[1]).to.equal(1);
      expect(requests[1].borrower).to.equal(borrower.address);
      expect(requests[1].loanAmount).to.equal(loanAmount2);
      expect(requests[1].duration).to.equal(duration);
      expect(requests[1].isActive).to.be.true;
      expect(requests[1].stake).to.equal(stake);
    });
  
  
    it("Should return empty arrays for borrower with no loan requests", async function () {
      const [requestIds, requests] = await lendingPlatform.getBorrowerActiveLoans(borrower.address);
  
      expect(requestIds.length).to.equal(0);
      expect(requests.length).to.equal(0);
    });
  
    it("Should only return loan requests for the specified borrower", async function () {
      const stake = ethers.parseEther("2");
      const loanAmount = ethers.parseEther("1");
      
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount,
        duration,
        { value: stake }
      );
  
      const otherBorrower = owner;
      await lendingPlatform.connect(otherBorrower).createLoanRequest(
        loanAmount,
        duration,
        { value: stake }
      );
  
      const [requestIds, requests] = await lendingPlatform.getBorrowerActiveLoans(borrower.address);
  
      expect(requestIds.length).to.equal(1);
      expect(requests.length).to.equal(1);
      expect(requests[0].borrower).to.equal(borrower.address);
    });
  
    it("Should handle loan requests with different amounts and durations", async function () {
      const stake1 = ethers.parseEther("2");
      const stake2 = ethers.parseEther("4");
      const loanAmount1 = ethers.parseEther("1");
      const loanAmount2 = ethers.parseEther("2");
      const duration1 = 30;
      const duration2 = 60;
      
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount1,
        duration1,
        { value: stake1 }
      );
  
      await lendingPlatform.connect(borrower).createLoanRequest(
        loanAmount2,
        duration2,
        { value: stake2 }
      );
  
      const [requestIds, requests] = await lendingPlatform.getBorrowerActiveLoans(borrower.address);
  
      expect(requestIds.length).to.equal(2);
      expect(requests.length).to.equal(2);
      expect(requests[0].loanAmount).to.equal(loanAmount1);
      expect(requests[0].duration).to.equal(duration1);
      expect(requests[0].stake).to.equal(stake1);
      expect(requests[1].loanAmount).to.equal(loanAmount2);
      expect(requests[1].duration).to.equal(duration2);
      expect(requests[1].stake).to.equal(stake2);
    });
  });

  describe("Get All Active Loans", function () {
    beforeEach(async function () {
      await lendingPlatform.connect(borrower).createLoanRequest(
        ethers.parseEther("1"),
        30,
        { value: ethers.parseEther("2") }
      );
      await lendingPlatform.connect(owner).createLoanRequest(
        ethers.parseEther("0.5"),
        60,
        { value: ethers.parseEther("1") }
      );
  
      await lendingPlatform.connect(lender).fundLoanRequest(
        0,
        5,
        { value: ethers.parseEther("1") }
      );
      await lendingPlatform.connect(lender).fundLoanRequest(
        1,
        7,
        { value: ethers.parseEther("0.5") }
      );
    });
  
    it("Should return all active loans", async function () {
      const [loanIds, loans] = await lendingPlatform.getAllActiveLoans();
      
      expect(loanIds.length).to.equal(2);
      expect(loans.length).to.equal(2);
      
      expect(loanIds[0]).to.equal(0);
      expect(loans[0].borrower).to.equal(borrower.address);
      expect(loans[0].loanAmount).to.equal(ethers.parseEther("1"));
      expect(loans[0].interestRate).to.equal(5);
      
      expect(loanIds[1]).to.equal(1);
      expect(loans[1].borrower).to.equal(owner.address);
      expect(loans[1].loanAmount).to.equal(ethers.parseEther("0.5"));
      expect(loans[1].interestRate).to.equal(7);
    });
  
    it("Should not return repaid loans", async function () {
      const interest = (ethers.parseEther("1") * BigInt(5)) / BigInt(100);
      const repaymentAmount = ethers.parseEther("1") + interest;
      
      await lendingPlatform.connect(borrower).repayLoan(
        0,
        { value: repaymentAmount }
      );
  
      const [loanIds, loans] = await lendingPlatform.getAllActiveLoans();
      
      expect(loanIds.length).to.equal(1);
      expect(loans.length).to.equal(1);
      expect(loanIds[0]).to.equal(1);
      expect(loans[0].borrower).to.equal(owner.address);
    });
  
    it("Should return empty arrays when no active loans", async function () {
      const interest1 = (ethers.parseEther("1") * BigInt(5)) / BigInt(100);
      const repaymentAmount1 = ethers.parseEther("1") + interest1;
      await lendingPlatform.connect(borrower).repayLoan(
        0,
        { value: repaymentAmount1 }
      );
  
      const interest2 = (ethers.parseEther("0.5") * BigInt(7)) / BigInt(100);
      const repaymentAmount2 = ethers.parseEther("0.5") + interest2;
      await lendingPlatform.connect(owner).repayLoan(
        1,
        { value: repaymentAmount2 }
      );
  
      const [loanIds, loans] = await lendingPlatform.getAllActiveLoans();
      
      expect(loanIds.length).to.equal(0);
      expect(loans.length).to.equal(0);
    });
  
    it("Should not return expired loans", async function () {
      await network.provider.send("evm_increaseTime", [61 * 24 * 60 * 60]);
      await network.provider.send("evm_mine");
  
      await lendingPlatform.connect(owner).liquidateExpiredLoan(0);
      await lendingPlatform.connect(owner).liquidateExpiredLoan(1);
  
      const [loanIds, loans] = await lendingPlatform.getAllActiveLoans();
      
      expect(loanIds.length).to.equal(0);
      expect(loans.length).to.equal(0);
    });
  });
});