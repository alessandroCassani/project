import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Button, Badge, Form } from 'react-bootstrap';
import { ethers } from 'ethers';

import LendingPlatformABI from '../contracts/LendingPlatform.sol/LendingPlatform.json';

const LoanState = {
  0: "REPAID",
  1: "ACCEPTED",
  2: "WAITING",
  3: "PAID",
  4: "FAILED",
};

const App = () => {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [contract, setContract] = useState(null);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loanProposals, setLoanProposals] = useState([]);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDuration, setLoanDuration] = useState('');

  useEffect(() => {
    connectWallet();
    loadContract();
  }, []);

  useEffect(() => {
    if (contract && account) {
      loadActiveLoans();
      loadLoanProposals();
    }
  }, [contract, account]);

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
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    } else {
      console.log('MetaMask not detected');
    }
  };

  const loadContract = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
      const contractABI = LendingPlatformABI.abi;
      const lendingPlatform = new ethers.Contract(contractAddress, contractABI, signer);
      setContract(lendingPlatform);
      console.log("Contract loaded:", lendingPlatform);
    } catch (error) {
      console.error("Error loading contract:", error);
    }
  };

  const loadActiveLoans = async () => {
    if (!contract || !account) return;
    try {
      const loans = await contract.getActiveLoansRequest(account);
      setActiveLoans(loans);
    } catch (error) {
      console.error("Loading Active Loans Error: ", error);
    }
  };

  const loadLoanProposals = async () => {
    if (!contract) return;
    try {
      const proposals = await contract.getActiveLoanRequests();
      console.log("Proposals received:", proposals);
      
      const formattedProposals = proposals.map((proposal, index) => ({
        id: index,
        borrower: proposal.borrower,
        loanAmount: ethers.utils.formatEther(proposal.loanAmount),
        duration: proposal.duration.toString(),
        stake: ethers.utils.formatEther(proposal.stake),
        isActive: proposal.isActive
      }));

      setLoanProposals(formattedProposals);
    } catch (error) {
      console.error("Loading Loan Proposals Error: ", error);
    }
  };

  const claimRepayment = async (loanId) => {
    if (!contract) return;
    try {
      const tx = await contract.liquidateExpiredLoan(loanId);
      await tx.wait();
      loadActiveLoans();
    } catch (error) {
      console.error("Claim error: ", error);
    }
  };

  const handleLendMoney = async (proposalId, amount, interestRate) => {
    if (!contract) return;
    try {
      const tx = await contract.fundLoanRequest(proposalId, interestRate, {
        value: ethers.utils.parseEther(amount)
      });
      await tx.wait();
      loadLoanProposals();
      loadActiveLoans();
    } catch (error) {
      console.error("Lending error: ", error);
    }
  };

  const createLoanRequest = async (e) => {
    e.preventDefault();
    if (!contract) return;
    try {
      const tx = await contract.createLoanRequest(
        ethers.utils.parseEther(loanAmount),
        loanDuration,
        { value: ethers.utils.parseEther((parseFloat(loanAmount) * 2).toString()) }
      );
      await tx.wait();
      loadLoanProposals();
      setLoanAmount('');
      setLoanDuration('');
    } catch (error) {
      console.error("Create loan request error: ", error);
    }
  };

  return (
    <Container className="mt-5">
      <Card className="mb-4">
        <Card.Header as="h5">Lender Dashboard</Card.Header>
        <Card.Body>
          <Card.Text>Connected Account: {account}</Card.Text>
          <Card.Text>Balance: {parseFloat(balance).toFixed(4)} ETH</Card.Text>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header as="h5">Create Loan Request</Card.Header>
        <Card.Body>
          <Form onSubmit={createLoanRequest}>
            <Form.Group className="mb-3">
              <Form.Label>Loan Amount (ETH)</Form.Label>
              <Form.Control 
                type="number" 
                value={loanAmount} 
                onChange={(e) => setLoanAmount(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Loan Duration (Days)</Form.Label>
              <Form.Control 
                type="number" 
                value={loanDuration} 
                onChange={(e) => setLoanDuration(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Create Loan Request
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header as="h5">Your Active Loans</Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Borrower Address</th>
                <th>Amount</th>
                <th>Interest Rate</th>
                <th>Repayment Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeLoans.map((loan) => (
                <tr key={loan.loanId}>
                  <td>{loan.loanId}</td>
                  <td>{loan.borrower}</td>
                  <td>{ethers.utils.formatEther(loan.loanAmount)} ETH</td>
                  <td>{loan.interestRate}%</td>
                  <td>{new Date(loan.endTime * 1000).toLocaleDateString()}</td>
                  <td>
                    <Badge bg={
                      loan.isRepaid ? 'success' : 
                      Date.now() / 1000 > loan.endTime ? 'danger' : 'primary'
                    }>
                      {loan.isRepaid ? 'Repaid' : 
                       Date.now() / 1000 > loan.endTime ? 'Expired' : 'Active'}
                    </Badge>
                  </td>
                  <td>
                    <Button 
                      variant="warning" 
                      onClick={() => claimRepayment(loan.loanId)}
                      disabled={loan.isRepaid || Date.now() / 1000 <= loan.endTime}
                    >
                      Claim Repayment
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header as="h5">Available Loan Proposals</Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Proposal ID</th>
                <th>Borrower Address</th>
                <th>Requested Amount (ETH)</th>
                <th>Duration (Days)</th>
                <th>Stake (ETH)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
            {loanProposals.map((proposal) => (
              <tr key={proposal.id}>
                <td>{proposal.id}</td>
                <td>{proposal.borrower}</td>
                <td>{proposal.loanAmount}</td>
                <td>{proposal.duration}</td>
                <td>{proposal.stake}</td>
                <td>
                  <Button
                    variant="primary"
                    onClick={() => handleLendMoney(proposal.id, proposal.loanAmount, 5)}
                    disabled={!proposal.isActive}
                  >
                    Lend
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