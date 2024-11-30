import React, { useState } from "react";

const LoanRequest = ({ onSubmit }) => {
  const [amount, setAmount] = useState("");
  const [collateral, setCollateral] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ amount, collateral });
    setAmount("");
    setCollateral("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="amount">Loan Amount</label>
        <input
          type="number"
          className="form-control"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="collateral">Collateral</label>
        <input
          type="text"
          className="form-control"
          id="collateral"
          value={collateral}
          onChange={(e) => setCollateral(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Submit Loan Request
      </button>
    </form>
  );
};

export default LoanRequest;