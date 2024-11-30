import React from "react";

const LoanApproval = ({ request, onApprove }) => {
  return (
    <div className="loan-request">
      <p>Amount: {request.amount} ETH</p>
      <p>Collateral: {request.collateral}</p>
      <button
        className="btn btn-success"
        onClick={() => onApprove(request.id)}
      >
        Approve Loan
      </button>
    </div>
  );
};

export default LoanApproval;