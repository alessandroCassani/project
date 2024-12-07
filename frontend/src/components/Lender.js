import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Card, Badge, Toast } from 'react-bootstrap';
import { ethers } from 'ethers';
import LendingPlatformABI from '../contracts/LendingPlatform.json';

const LoanState = { REPAID: "Repaid", ACTIVE: "Active", EXPIRED: "Expired" };

const Lender = () => {
  // Core state management
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [contract, setContract] = useState(null);
  const [loanRequests, setLoanRequests] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  // Initialize component
  useEffect(() => {
    const init = async () => {
      try {
        await connectWallet();
        await loadContract();
        await loadLoanRequests();
        await loadActiveLoans();
      } catch (error) {
        console.error("Initialization error:", error);
        showToast("Error initializing app", 'danger');
      }
    };
    init();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        await updateBalance(accounts[0]);
        window.ethereum.on('accountsChanged', async (newAccounts) => {
          setAccount(newAccounts[0]);
          await updateBalance(newAccounts[0]);
        });
      } catch (error) {
        console.error("Error connecting wallet:", error);
        showToast("Error connecting to wallet", 'danger');
      }
    } else {
      showToast('Metamask not detected', 'danger');
    }
  };

  const loadContract = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
        const contractInstance = new ethers.Contract(contractAddress, LendingPlatformABI.abi, signer);
        setContract(contractInstance);
      } catch (error) {
        console.error("Error loading contract:", error);
        showToast("Error loading contract", 'danger');
      }
    }
  };

  const updateBalance = async (address) => {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(address);
      setBalance(ethers.utils.formatEther(balance));
    }
  };

  // Load active loan requests that can be funded
  const loadLoanRequests = async () => {
    if (!contract || !account) return;
    try {
      const [, , requestIds, requests] = await contract.getAllActiveLoans();
      const requestsData = requestIds.map((id, index) => ({
        requestId: id.toString(),
        borrower: requests[index].borrower,
        amount: ethers.utils.formatEther(requests[index].loanAmount),
        duration: requests[index].duration.toString(),
        stake: ethers.utils.formatEther(requests[index].stake),
        interestRate: requests[index].interestRate.toString(), // Display borrower's requested rate
        isActive: requests[index].isActive
      }));
      // Filter out inactive requests and the lender's own requests
      setLoanRequests(requestsData.filter(req => 
        req.isActive && req.borrower.toLowerCase() !== account.toLowerCase()
      ));
    } catch (error) {
      console.error("Error loading requests:", error);
      showToast("Error loading loan requests", 'danger');
    }
  };

  // Load loans funded by this lender
  const loadActiveLoans = async () => {
    if (!contract || !account) return;
    try {
      const [loanIds, loans] = await contract.getAllActiveLoans();

      const activeLoansData = loans
        .map((loan, index) => ({
          loanId: loanIds[index].toString(),
          borrower: loan.borrower,
          lender: loan.lender,
          loanAmount: ethers.utils.formatEther(loan.loanAmount),
          stake: ethers.utils.formatEther(loan.stake),
          endTime: new Date(Number(loan.endTime) * 1000).toLocaleString(),
          interestRate: loan.interestRate.toString(),
          state: loan.isRepaid ? LoanState.REPAID : 
                 (Date.now() > Number(loan.endTime) * 1000 ? LoanState.EXPIRED : LoanState.ACTIVE)
        }))
        .filter(loan => loan.lender.toLowerCase() === account.toLowerCase());

      setActiveLoans(activeLoansData);
    } catch (error) {
      console.error("Error loading active loans:", error);
      showToast("Error loading active loans", 'danger');
    }
  };

  const fundLoan = async (requestId, amount) => {
    if (!contract) return;
  
    try {
      const amountInWei = ethers.utils.parseEther(amount);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const nonce = await provider.getTransactionCount(account);
  
      const tx = await contract.fundLoanRequest(
        requestId, 
        { 
          value: amountInWei,
          nonce,
          gasLimit: ethers.utils.hexlify(1000000) 
        }
      );
      
      await tx.wait();
      await updateBalance(account);
      await loadLoanRequests();
      await loadActiveLoans();
    } catch (error) {
      console.error("Error funding loan:", error);
      showToast(error.reason || "Error funding loan", 'danger');
    }
  };

  // Liquidate an expired loan
  const liquidateExpiredLoan = async (loanId) => {
    if (!contract) return;
    try {
      const tx = await contract.liquidateExpiredLoan(loanId);
      showToast("Processing liquidation...", 'info');
      await tx.wait();
      showToast("Loan liquidated successfully", 'success');
      await updateBalance(account);
      await loadActiveLoans();
    } catch (error) {
      console.error("Error liquidating loan:", error);
      showToast(error.reason || "Error liquidating loan", 'danger');
    }
  };

  const showToast = (message, variant) => setToast({ show: true, message, variant });

  return (
    <Container className="mt-5">
      <Toast 
        show={toast.show} 
        onClose={() => setToast({ ...toast, show: false })} 
        delay={3000} 
        autohide 
        style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}
      >
        <Toast.Header><strong className="me-auto">Notification</strong></Toast.Header>
        <Toast.Body className={`bg-${toast.variant} text-white`}>{toast.message}</Toast.Body>
      </Toast>

      <Card className="mb-4">
        <Card.Header as="h5">Lender Dashboard</Card.Header>
        <Card.Body>
          <Card.Text>Connected Account: {account}</Card.Text>
          <Card.Text>Balance: {parseFloat(balance).toFixed(4)} ETH</Card.Text>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
          Available Loan Requests
          <Button variant="outline-primary" onClick={loadLoanRequests}>Refresh Requests</Button>
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Borrower</th>
                <th>Amount</th>
                <th>Duration (days)</th>
                <th>Stake</th>
                <th>Interest Rate</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loanRequests.map((request) => (
                <tr key={request.requestId}>
                  <td>{request.requestId}</td>
                  <td>{request.borrower}</td>
                  <td>{request.amount} ETH</td>
                  <td>{request.duration}</td>
                  <td>{request.stake} ETH</td>
                  <td>{request.interestRate}%</td>
                  <td>
                    <Button
                      variant="primary"
                      onClick={() => fundLoan(request.requestId, request.amount)}
                    >
                      Fund
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
          Your Funded Loans
          <Button variant="outline-primary" onClick={loadActiveLoans}>Refresh Loans</Button>
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Borrower</th>
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
                  <td>{loan.borrower}</td>
                  <td>{loan.loanAmount} ETH</td>
                  <td>{loan.stake} ETH</td>
                  <td>{loan.endTime}</td>
                  <td>{loan.interestRate}%</td>
                  <td>
                    <Badge bg={loan.state === LoanState.ACTIVE ? 'warning' : 
                              (loan.state === LoanState.REPAID ? 'success' : 'danger')}>
                      {loan.state}
                    </Badge>
                  </td>
                  <td>
                    {loan.state === LoanState.EXPIRED && (
                      <Button 
                        variant="danger" 
                        onClick={() => liquidateExpiredLoan(loan.loanId)}
                      >
                        Liquidate
                      </Button>
                    )}
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

export { Lender };