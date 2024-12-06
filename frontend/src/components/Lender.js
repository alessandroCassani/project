import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Card, Badge, Toast } from 'react-bootstrap';
import { ethers } from 'ethers';
import LendingPlatformABI from '../contracts/LendingPlatform.json';

const LoanState = { REPAID: "Repaid", ACTIVE: "Active", EXPIRED: "Expired" };

const App = () => {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [contract, setContract] = useState(null);
  const [activeLoans, setActiveLoans] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    const init = async () => {
      try {
        await connectWallet();
        await loadContract();
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
        console.log("Wallet connected successfully");
      } catch (error) {
        console.error("Error connecting wallet:", error);
        showToast("Error connecting to wallet", 'danger');
      }
    } else {
      console.error("Metamask not detected");
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
        console.log("Contract loaded successfully");
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
      console.log("Balance updated:", ethers.utils.formatEther(balance));
    }
  };

  const loadActiveLoans = async () => {
    
    if (!contract) {
      console.log("Contract not initialized");
      return;
    }
    try {
      console.log("Calling getAllActiveLoans...");
      
      // Check if the function exists
      if (typeof contract.getAllActiveLoans !== 'function') {
        console.error("getAllActiveLoans function does not exist on the contract");
        showToast("Contract function not found", 'danger');
        return;
      }

      const [loanIds, loans] = await contract.getAllActiveLoans();
      console.log("Raw loanIds:", loanIds);
      console.log("Raw loans:", loans);

      if (loanIds.length === 0) {
        console.log("No active loans found");
        setActiveLoans([]);
        return;
      }

      const activeLoansData = loans.map((loan, index) => ({
        loanId: loanIds[index].toString(),
        borrower: loan.borrower,
        lender: loan.lender,
        loanAmount: ethers.utils.formatEther(loan.loanAmount),
        stake: ethers.utils.formatEther(loan.stake),
        endTime: new Date(Number(loan.endTime) * 1000).toLocaleString(),
        interestRate: loan.interestRate.toString(),
        state: loan.isRepaid ? LoanState.REPAID : (Date.now() > Number(loan.endTime) * 1000 ? LoanState.EXPIRED : LoanState.ACTIVE)
      }));
      console.log("Processed activeLoansData:", activeLoansData);
      setActiveLoans(activeLoansData);
    } catch (error) {
      console.error("Error loading active loans:", error);
      // Log more details about the error
      if (error.reason) console.error("Error reason:", error.reason);
      if (error.code) console.error("Error code:", error.code);
      if (error.method) console.error("Error method:", error.method);
      if (error.transaction) console.error("Error transaction:", error.transaction);
      showToast("Error loading active loans", 'danger');
    }
  };

  const showToast = (message, variant) => setToast({ show: true, message, variant });

  const repayLoan = async (loanId) => {
    if (!contract) return;
    try {
      const loan = activeLoans.find(loan => loan.loanId === loanId);
      const totalDue = ethers.utils.parseEther(loan.loanAmount).mul(100 + parseInt(loan.interestRate)).div(100);
      const tx = await contract.repayLoan(loanId, { value: totalDue });
      await tx.wait();
      showToast("Loan repaid successfully", 'success');
      await updateBalance(account);
      await loadActiveLoans();
    } catch (error) {
      console.error("Error repaying loan:", error);
      showToast("Error repaying loan", 'danger');
    }
  };

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
        <Card.Header as="h5">Borrower Dashboard</Card.Header>
        <Card.Body>
          <Card.Text>Connected Account: {account}</Card.Text>
          <Card.Text>Balance: {parseFloat(balance).toFixed(4)} ETH</Card.Text>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
          Active Loans
          <Button variant="outline-primary" onClick={loadActiveLoans}>Refresh Loans</Button>
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Borrower</th>
                <th>Lender</th>
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
                  <td>{loan.lender}</td>
                  <td>{loan.loanAmount} ETH</td>
                  <td>{loan.stake} ETH</td>
                  <td>{loan.endTime}</td>
                  <td>{loan.interestRate}%</td>
                  <td><Badge bg={loan.state === LoanState.ACTIVE ? 'warning' : (loan.state === LoanState.REPAID ? 'success' : 'danger')}>{loan.state}</Badge></td>
                  {loan.state === LoanState.ACTIVE && loan.borrower === account && (
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