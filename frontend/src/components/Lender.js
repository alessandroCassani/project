import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Card, Badge, Toast } from 'react-bootstrap';
import { ethers } from 'ethers';
import LendingPlatformABI from '../contracts/LendingPlatform.json';

const LoanState = {
  REPAID: "Repaid",
  ACTIVE: "Active",
  EXPIRED: "Expired"
};

const App = () => {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [contract, setContract] = useState(null);
  const [activeLoans, setActiveLoans] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    duration: '',
    collateral: ''
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  useEffect(() => {
    const init = async () => {
      await connectWallet();
      await loadContract();
      await loadActiveLoans();
    };
    init();
  }, []);

  const loadContract = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contractAddress = "YOUR_CONTRACT_ADDRESS_HERE";
        const contract = new ethers.Contract(contractAddress, LendingPlatformABI.abi, signer);
        setContract(contract);
        console.log("Contract loaded successfully");
      } catch (error) {
        console.error("Error loading contract:", error);
        showToastMessage("Error loading contract", 'danger');
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(accounts[0]);
        setBalance(ethers.utils.formatEther(balance));
        window.ethereum.on('accountsChanged', async (accounts) => {
          setAccount(accounts[0]);
          const newBalance = await provider.getBalance(accounts[0]);
          setBalance(ethers.utils.formatEther(newBalance));
        });
        console.log("Wallet connected successfully");
      } catch (error) {
        console.error("Error connecting:", error);
        showToastMessage("Error connecting to wallet", 'danger');
      }
    } else {
      showToastMessage('Metamask not detected', 'danger');
    }
  };

  const updateBalance = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const newBalance = await provider.getBalance(account);
      setBalance(ethers.utils.formatEther(newBalance));
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const createLoanRequest = async (e) => {
    e.preventDefault();
    const amountInWei = ethers.utils.parseEther(formData.amount);
    const collateralInWei = ethers.utils.parseEther(formData.collateral);
    const durationInDays = parseInt(formData.duration);

    if (collateralInWei.lt(amountInWei.mul(2))) {
      showToastMessage("Collateral must be at least double the loan amount", 'danger');
      return;
    }

    try {
      const tx = await contract.createLoanRequest(amountInWei, durationInDays, { value: collateralInWei });
      await tx.wait();
      showToastMessage("Loan request created successfully", 'success');
      await updateBalance();
      await loadActiveLoans();
    } catch (error) {
      console.error("Detailed error:", error);
      if (error.code === 'ACTION_REJECTED') {
        showToastMessage("Transaction rejected by user", 'warning');
      } else {
        showToastMessage("Error: " + error.message, 'danger');
      }
    }
  };

  const loadActiveLoans = async () => {
    if (!contract || !account) return;
    try {
      const [loanIds, loans] = await contract.getBorrowerActiveLoans(account);
      const activeLoansData = loans.map((loan, index) => ({
        loanId: loanIds[index].toString(),
        borrower: loan.borrower,
        lender: loan.lender,
        loanAmount: ethers.utils.formatEther(loan.loanAmount),
        stake: ethers.utils.formatEther(loan.stake),
        endTime: new Date(loan.endTime.toNumber() * 1000).toLocaleString(),
        interestRate: loan.interestRate.toString(),
        isRepaid: loan.isRepaid,
        state: loan.isRepaid ? LoanState.REPAID : (Date.now() > loan.endTime.toNumber() * 1000 ? LoanState.EXPIRED : LoanState.ACTIVE)
      }));
      setActiveLoans(activeLoansData);
      console.log("Active loans loaded successfully:", activeLoansData);
    } catch (error) {
      console.error("Error loading active loans:", error);
      showToastMessage("Error loading active loans", 'danger');
    }
  };

  const repayLoan = async (loanId) => {
    if (!contract) return;
    try {
      const loan = activeLoans.find(loan => loan.loanId === loanId);
      const interest = ethers.utils.parseEther(loan.loanAmount).mul(loan.interestRate).div(100);
      const totalDue = ethers.utils.parseEther(loan.loanAmount).add(interest);
      const tx = await contract.repayLoan(loanId, { value: totalDue });
      await tx.wait();
      showToastMessage("Loan repaid successfully", 'success');
      await updateBalance();
      await loadActiveLoans();
    } catch (error) {
      console.error("Error repaying loan:", error);
      showToastMessage("Error repaying loan", 'danger');
    }
  };

  const showToastMessage = (message, variant) => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  return (
    <Container className="mt-5">
      <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
        <Toast.Header>
          <strong className="me-auto">Notification</strong>
        </Toast.Header>
        <Toast.Body className={`bg-${toastVariant} text-white`}>{toastMessage}</Toast.Body>
      </Toast>

      <Card className="mb-4">
        <Card.Header as="h5">Borrower Dashboard</Card.Header>
        <Card.Body>
          <Card.Text>Connected Account: {account}</Card.Text>
          <Card.Text>Balance: {parseFloat(balance).toFixed(4)} ETH</Card.Text>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header as="h5">Create Loan Request</Card.Header>
        <Card.Body>
          <Form onSubmit={createLoanRequest}>
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={2}>Amount (ETH)</Form.Label>
              <Col sm={10}>
                <Form.Control type="number" name="amount" value={formData.amount} onChange={handleInputChange} required />
              </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={2}>Duration (days)</Form.Label>
              <Col sm={10}>
                <Form.Control type="number" name="duration" value={formData.duration} onChange={handleInputChange} required />
              </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={2}>Collateral (ETH)</Form.Label>
              <Col sm={10}>
                <Form.Control type="number" name="collateral" value={formData.collateral} onChange={handleInputChange} required />
              </Col>
            </Form.Group>
            <Button variant="primary" type="submit">Create Loan Request</Button>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header as="h5">Active Loans</Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Amount</th>
                <th>Stake</th>
                <th>End Time</th>
                <th>Interest Rate</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeLoans.map((loan) => (
                <tr key={loan.loanId}>
                  <td>{loan.loanId}</td>
                  <td>{loan.loanAmount} ETH</td>
                  <td>{loan.stake} ETH</td>
                  <td>{loan.endTime}</td>
                  <td>{loan.interestRate}%</td>
                  <td><Badge bg={loan.state === LoanState.ACTIVE ? 'warning' : (loan.state === LoanState.REPAID ? 'success' : 'danger')}>{loan.state}</Badge></td>
                  {loan.state === LoanState.ACTIVE && (
                    <td><Button variant="primary" onClick={() => repayLoan(loan.loanId)}>Repay</Button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export { App };