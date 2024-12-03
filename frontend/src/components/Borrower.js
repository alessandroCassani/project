import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Button, Badge } from 'react-bootstrap';

const LoanState = {
  0: "OPEN",
  1: "FUNDED",
  2: "ACTIVE",
  3: "CLOSED",
  4: "DEFAULTED"
};

const App = () => {
  const [account, setAccount] = useState('');
  const [availableLoans, setAvailableLoans] = useState([]);

  useEffect(() => {
    connectWallet();
    loadAvailableLoans();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    } else {
      console.log('MetaMask not detected');
    }
  };

  const loadAvailableLoans = async () => {
    // Here backedn for Available Loans
    const dummyLoans = [
      { id: 1, amount: "5", duration: 30, interestRate: 5, state: "0" },
      { id: 2, amount: "10", duration: 60, interestRate: 7, state: "0" },
      { id: 3, amount: "15", duration: 90, interestRate: 8, state: "0" },
    ];
    setAvailableLoans(dummyLoans);
  };

  const applyForLoan = async (loanId) => {
    // Here the backend for sign a loan
    console.log(`Applying for loan ${loanId}`);
  };

  return (
    <Container className="mt-5">
      <Card className="mb-4">
        <Card.Header as="h5">Borrower Dashboard</Card.Header>
        <Card.Body>
          <Card.Text>Connected Account: {account}</Card.Text>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header as="h5">Available Loans</Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Amount (ETH)</th>
                <th>Duration (days)</th>
                <th>Interest Rate</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {availableLoans.map((loan) => (
                <tr key={loan.id}>
                  <td>{loan.id}</td>
                  <td>{loan.amount}</td>
                  <td>{loan.duration}</td>
                  <td>{loan.interestRate}%</td>
                  <td>
                    <Badge bg={loan.state === '0' ? 'success' : 'secondary'}>
                      {LoanState[loan.state]}
                    </Badge>
                  </td>
                  <td>
                    <Button 
                      variant="primary" 
                      onClick={() => applyForLoan(loan.id)}
                      disabled={loan.state !== '0'}
                    >
                      Apply
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export {App};
