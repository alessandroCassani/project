import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Card, Badge, Toast } from 'react-bootstrap';
import { ethers } from 'ethers';
import LendingPlatformABI from '../contracts/LendingPlatform.json';

const App = () => {
 const [account, setAccount] = useState('');
 const [balance, setBalance] = useState('');
 const [contract, setContract] = useState(null);
 const [activeLoans, setActiveLoans] = useState([]);
 const [formData, setFormData] = useState({ amount: '', date: '', collateral: '' });
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
       const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
       const contract = new ethers.Contract(contractAddress, LendingPlatformABI.abi, signer);
       setContract(contract);
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
  if (!contract) return;

  const amountInWei = ethers.utils.parseEther(formData.amount);
  const collateralInWei = ethers.utils.parseEther(formData.collateral);
  const durationInDays = Math.ceil((new Date(formData.date) - new Date()) / (1000 * 60 * 60 * 24));

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const nonce = await provider.getTransactionCount(account);
    
    const tx = await contract.createLoanRequest(amountInWei, durationInDays, {
      value: collateralInWei,
      nonce,
      gasLimit: ethers.utils.hexlify(1000000)
    });

    await tx.wait();
    await updateBalance();
    await loadActiveLoans();

  } catch (error) {
    console.error("Error:", error);
    showToastMessage(error.reason || "Transaction failed", 'danger');
  }
};

 const loadActiveLoans = async () => {
   if (!contract || !account) return;
   try {
     const [loanIds, loans, requestIds, requests] = await contract.getAllActiveLoans();
     const activeLoansData = requestIds.map((id, index) => ({
       loanId: id.toNumber(),
       borrower: requests[index].borrower,
       loanAmount: ethers.utils.formatEther(requests[index].loanAmount),
       duration: requests[index].duration.toNumber(),
       stake: ethers.utils.formatEther(requests[index].stake),
       state: requests[index].isActive ? "ACTIVE" : "INACTIVE"
     }));
     setActiveLoans(activeLoansData);
   } catch (error) {
     console.error("Error loading loans:", error);
     showToastMessage("Error loading loans", 'danger');
   }
 };

 const repayLoan = async (loanId) => {
   if (!contract) return;
   try {
     const loan = await contract.activeLoans(loanId);
     const interest = loan.loanAmount.mul(loan.interestRate).div(100);
     const totalDue = loan.loanAmount.add(interest);
     
     const tx = await contract.repayLoan(loanId, { value: totalDue });
     await tx.wait();
     showToastMessage("Loan repaid successfully", 'success');
     await updateBalance();
     loadActiveLoans();
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
     <Toast 
       show={showToast} 
       onClose={() => setShowToast(false)} 
       delay={3000} 
       autohide 
       style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}
     >
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
               <Form.Control 
                 type="number" 
                 step="0.01"
                 name="amount" 
                 value={formData.amount} 
                 onChange={handleInputChange} 
                 required 
               />
             </Col>
           </Form.Group>

           <Form.Group as={Row} className="mb-3">
             <Form.Label column sm={2}>Repayment Date</Form.Label>
             <Col sm={10}>
               <Form.Control 
                 type="date" 
                 name="date" 
                 value={formData.date} 
                 onChange={handleInputChange} 
                 required 
               />
             </Col>
           </Form.Group>

           <Form.Group as={Row} className="mb-3">
             <Form.Label column sm={2}>Collateral (ETH)</Form.Label>
             <Col sm={10}>
               <Form.Control 
                 type="number"
                 step="0.01" 
                 name="collateral" 
                 value={formData.collateral} 
                 onChange={handleInputChange} 
                 required 
               />
             </Col>
           </Form.Group>

           <Button variant="primary" type="submit">Create Loan Request</Button>
         </Form>
       </Card.Body>
     </Card>

     <Card>
       <Card.Header as="h5">Your Active Loans</Card.Header>
       <Card.Body>
         <Table responsive>
           <thead>
             <tr>
               <th>Loan ID</th>
               <th>Amount</th>
               <th>Duration (days)</th>
               <th>Stake</th>
               <th>Status</th>
               <th>Action</th>
             </tr>
           </thead>
           <tbody>
             {activeLoans.map((loan) => (
               <tr key={loan.loanId}>
                 <td>{loan.loanId}</td>
                 <td>{loan.loanAmount} ETH</td>
                 <td>{loan.duration}</td>
                 <td>{loan.stake} ETH</td>
                 <td>
                   <Badge bg={loan.state === 'ACTIVE' ? 'warning' : 'success'}>
                     {loan.state}
                   </Badge>
                 </td>
                 {loan.state === 'ACTIVE' && (
                   <td>
                     <Button variant="primary" onClick={() => repayLoan(loan.loanId)}>
                       Repay
                     </Button>
                   </td>
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