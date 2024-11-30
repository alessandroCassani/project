import React, { useState } from "react";

const LoanRepayment = ({ loan, onRepay }) => {
  const [repaymentAmount, setRepaymentAmount] = useState("");

  const handleRepay = (event) => {
    event.preventDefault();
    onRepay(loan.id, repaymentAmount);
    setRepaymentAmount("");
  };

  return (
    <div className="active-loan">
      <p>Loan ID: {loan.id}</p>
      <p>Amount Due: {loan.amountDue} ETH</p>
      <form onSubmit={handleRepay}>
        <div className="form-group">
          <label htmlFor={`repayment-${loan.id}`}>Repayment Amount</label>
          <input
            type="number"
            className="form-control"
            id={`repayment-${loan.id}`}
            value={repaymentAmount}
            onChange={(e) => setRepaymentAmount(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-warning">
          Repay Loan
        </button>
      </form>
    </div>
  );
};

export default LoanRepayment;