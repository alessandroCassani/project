import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Card, Badge } from 'react-bootstrap';
import { ethers } from 'ethers';

const LoanState = {
  0: "REPAID",
  1: "ACCEPTED",
  2: "WAITING",
  3: "PAID",
  4: "FAILED",
};

const App = () => {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [lenders, setLenders] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    date: '',
    mortgage: ''
  });

  useEffect(() => {
    connectWallet();
    //loadContract();
    loadLenders();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]);
        });
      } catch (error) {
        console.error("Error connection ", error);
      }
    } else {
      console.log('Errore Metamask');
    }
  };

  const loadLenders = async () => {
    if (!contract) return;
    try {
      const allPotentialLenders = await contract.getAllPotentialLenders();
      const lendersData = await Promise.all(allPotentialLenders.map(async lender => {
        const borrower = await contract.proposalToBorrower(lender.proposalId);
        return { ...lender, borrower };
      }));
      setLenders(lendersData);
    } catch (error) {
      console.error("Loading Error: ", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const createProposal = async (e) => {
      <React.StrictMode>
        <App />
      </React.StrictMode>
  };

  const getLoan = async (loanId, proposalId) => {
    if (!contract) return;
    try {
      const tx = await contract.acceptLender(loanId, proposalId);
      await tx.wait();
      loadLenders();
    } catch (error) {
      console.error("Lend error ", error);
    }
  };

  const repay = async (loanId) => {
    if (!contract) return;
    try {
      const tx = await contract.loanPaid(loanId);
      await tx.wait();
      loadLenders();
    } catch (error) {
      console.error("Lend error ", error);
    }
  };

  return (
    <Container className="mt-5">
      <Card className="mb-4">
        <Card.Header as="h5">Borrower Dashboard</Card.Header>
        <Card.Body>
          <Card.Text>Connected Account: {account}</Card.Text>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header as="h5">Create Loan</Card.Header>
        <Card.Body>
          <Form onSubmit={createProposal}>
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={2}>Amount (ETH)</Form.Label>
              <Col sm={10}>
                <Form.Control type="number" name="amount" value={formData.amount} onChange={handleInputChange} required />
              </Col>
            </Form.Group>

            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={2}>Refund date</Form.Label>
              <Col sm={10}>
                <Form.Control type="date" name="date" value={formData.date} onChange={handleInputChange} required />
              </Col>
            </Form.Group>

            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={2}>Interest</Form.Label>
              <Col sm={10}>
                <Form.Control type="text" name="mortgage" value={formData.mortgage} onChange={handleInputChange} required />
              </Col>
            </Form.Group>

            <Button variant="primary" type="submit">Create proposal</Button>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header as="h5">Active Loans</Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Address</th>
                <th>Amount</th>
                <th>Interest</th>
                <th>Active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lenders.map((lender) => (
                lender.borrower === account && (
                  <tr key={lender.loanId}>
                    <td>{lender.lender}</td>
                    <td>{ethers.utils.formatEther(lender.loanAmount)} ETH</td>
                    <td>{lender.interestRate}%</td>
                    <td>
                      <Button 
                        variant="success" 
                        onClick={() => getLoan(lender.loanId, lender.proposalId)}
                        disabled={lender.state !== '2'}
                        className="me-2"
                      >
                        Get loan
                      </Button>
                      <Button 
                        variant="warning" 
                        onClick={() => repay(lender.loanId)}
                        disabled={lender.state !== '1' && lender.state !== '3'}
                      >
                        Refund
                      </Button>
                    </td>
                    <td>
                      <Badge bg={
                        lender.state === '0' ? 'success' :
                        lender.state === '1' ? 'primary' :
                        lender.state === '2' ? 'warning' :
                        lender.state === '3' ? 'info' :
                        'danger'
                      }>
                        {LoanState[lender.state]}
                      </Badge>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export {App};
