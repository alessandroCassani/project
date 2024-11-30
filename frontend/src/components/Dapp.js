import React from "react";
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import LoanRequest from '../Functions/LoanRequest';
import LoanApproval from '../Functions/LoanApproval';
import LoanRepayment from '../Functions/LoanRepayment';

import { Container, Row, Col, Card, Button, Alert, Nav, Navbar } from 'react-bootstrap';

const HARDHAT_NETWORK_ID = '31337';

export class Dapp extends React.Component {
  constructor(props) {
    super(props);

    this.initialState = {
      selectedAddress: undefined,
      loanRequests: [], // Inizializza loanRequests come array vuoto
      approvedLoans: [], // Inizializza approvedLoans come array vuoto
      userRole: undefined,
      networkError: undefined,
    };

    this.state = this.initialState;
  }

  render() {
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    const { selectedAddress, userRole, loanRequests, approvedLoans } = this.state;

    return (
      <div className="dapp-wrapper">
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container>
            <Navbar.Brand href="#home">DLoan Platform</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link href="#home">Home</Nav.Link>
                <Nav.Link href="#loans">My Loans</Nav.Link>
                <Nav.Link href="#profile">Profile</Nav.Link>
              </Nav>
              <Navbar.Text>
                Signed in as: <a href="#login">{selectedAddress}</a>
              </Navbar.Text>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container className="mt-4">
          {!userRole ? (
            <Card className="text-center">
              <Card.Header as="h5">Welcome to DLoan</Card.Header>
              <Card.Body>
                <Card.Title>Choose Your Role</Card.Title>
                <Card.Text>
                  Select your role to get started with our decentralized loan platform.
                </Card.Text>
                <Button 
                  variant="primary" 
                  className="me-2"
                  onClick={() => this.setState({ userRole: 'borrower' })}
                >
                  I'm a Borrower
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => this.setState({ userRole: 'lender' })}
                >
                  I'm a Lender
                </Button>
              </Card.Body>
            </Card>
          ) : (
            <>
              <Alert variant="info">
                You are logged in as: <strong>{userRole}</strong>
              </Alert>

              {userRole === 'borrower' && (
                <Card className="mb-4">
                  <Card.Header as="h5">Request a Loan</Card.Header>
                  <Card.Body>
                    <LoanRequest 
                      onSubmit={(loanDetails) => {
                        this.setState(prevState => ({
                          loanRequests: [...prevState.loanRequests, loanDetails]
                        }));
                      }}
                    />
                  </Card.Body>
                </Card>
              )}

              {userRole === 'lender' && (
                <Row xs={1} md={2} className="g-4">
                  {loanRequests.map((request, index) => (
                    <Col key={index}>
                      <LoanApproval 
                        request={request}
                        onApprove={(id) => {
                          this.setState(prevState => ({
                            approvedLoans: [...prevState.approvedLoans, request],
                            loanRequests: prevState.loanRequests.filter((_, i) => i !== index)
                          }));
                        }}
                      />
                    </Col>
                  ))}
                </Row>
              )}

              {approvedLoans.length > 0 && (
                <Card className="mt-4">
                  <Card.Header as="h5">Approved Loans</Card.Header>
                  <Card.Body>
                    <Row xs={1} md={2} className="g-4">
                      {approvedLoans.map((loan, index) => (
                        <Col key={index}>
                          <LoanRepayment 
                            loan={loan}
                            onRepay={(id, amount) => {
                              // Repayment backend logic here
                            }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </Container>
      </div>
    );
  }


  async _connectWallet() {
    const [selectedAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    this._checkNetwork();
    this._initialize(selectedAddress);

    window.ethereum.on("accountsChanged", ([newAddress]) => {
      if (newAddress === undefined) {
        return this._resetState();
      }
      this._initialize(newAddress);
    });
  }

  _initialize(userAddress) {
    this.setState({ selectedAddress: userAddress });
    // Initialize ethers and fetch data specific to loan management
  }

  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  _resetState() {
    this.setState(this.initialState);
  }

  async _switchChain() {
    const chainIdHex = `0x${HARDHAT_NETWORK_ID.toString(16)}`;
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    await this._initialize(this.state.selectedAddress);
  }

  _checkNetwork() {
    if (window.ethereum.networkVersion !== HARDHAT_NETWORK_ID) {
      this._switchChain();
    }
  }
}