import React, { Fragment, useState, useEffect } from "react";
import { Link } from "react-router-dom"; // Import Link from react-router-dom
import "bootstrap/dist/css/bootstrap.min.css";
import { connectWallet, disconnectWallet,fetchUserDetails } from "../utils/Web3Utils"; // Import connectWallet and disconnectWallet functions
import { FaUser } from 'react-icons/fa';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';


const NavbarMain = ({ handleBuyNow }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userData, setUserData] = useState(null);
  const [connectedWalletAddress, setConnectedWalletAddress] = useState('');
  const [showConnectWalletPopup, setShowConnectWalletPopup] = useState(false);

  useEffect(() => {
    const fetchConnectedWalletAddress = async () => {
      try {
        const snapshot = await firebase.database().ref('connectedWallets').once('value');
        const walletData = snapshot.val();
        const addresses = Object.keys(walletData || {}).sort();
        const latestAddress = addresses.pop();
        const isConnected = walletData[latestAddress] === true;
        setIsConnected(isConnected);
        setConnectedWalletAddress(isConnected ? latestAddress : '');
      } catch (error) {
        console.error('Error fetching connected wallet address:', error);
      }
    };

    fetchConnectedWalletAddress();
  }, []);

  useEffect(() => {
    if (connectedWalletAddress) {
      fetchUserData();
    }
  }, [connectedWalletAddress]);

  const fetchUserData = async () => {
    try {
      const userSnapshot = await firebase.database().ref(`accounts/${connectedWalletAddress}`).once('value');
      const userData = userSnapshot.val();
      setUserData(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleConnectWallet = async () => {
    try {
      const connectedAddress = await connectWallet();
      setConnectedWalletAddress(connectedAddress);
      setIsConnected(true);
      await firebase.database().ref(`connectedWallets/${connectedAddress}`).set(true);
  
      // Fetch user data only if connected
      await fetchUserData();
  
      setShowConnectWalletPopup(false);
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      alert('Failed to connect to wallet. Please try again.');
    }
  };
  

  const handleDisconnectWallet = async () => {
    try {
      // Remove the connected wallet address from Firebase
      await firebase.database().ref(`connectedWallets/${connectedWalletAddress}`).remove();
  
      // Update states to reflect disconnection
      setConnectedWalletAddress('');
      setIsConnected(false);
  
      // Clear user data when disconnecting
      setUserData(null);
  
      // Reload the page
      window.location.reload();
  
      return 'Wallet disconnected successfully';
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw new Error('Failed to disconnect wallet. Please try again.');
    }
  };
  
  
// Helper function to check if the account is already created
const checkAccountCreated = async (account) => {
  try {
    // Check if the account exists in the Firebase Realtime Database
    const snapshot = await firebase.database().ref('accounts').child(account).once('value');
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking account:', error);
    throw error;
  }
};
  const handleCancelConnectWallet = () => {
    setShowConnectWalletPopup(false);
  };

  return (
    <Fragment>
      <nav className="navbar navbar-expand-lg navbar-dark bg-white">
        <div className="container-fluid d-flex justify-content-end">
          {/* Your existing navbar content */}
              {/* Profile dropdown */}
       
         
          <div className="nav-item dropdown " style={{paddingRight: "10px"}}>
            <button
              className="btn btn-secondary dropdown-toggle"
              onClick={() => setShowDropdown(!showDropdown)}
            >
            <FaUser/>
             
            </button>
            <ul
              className={`dropdown-menu dropdown-menu-end ${
                showDropdown ? "show" : ""
              }`}
              style={{ minWidth: "150px" }}
            >
              <li>
                {isConnected ? (
                  <button
                    className="dropdown-item"
                    onClick={handleDisconnectWallet}
                    style={{ fontSize: "14px" }}
                  >
                    Disconnect Wallet
                  </button>
                ) : (
                  <button
                    className="dropdown-item"
                    onClick={() => setShowConnectWalletPopup(true)}
                    style={{ fontSize: "14px" }}
                  >
                    Connect Wallet
                  </button>
                )}
              </li>
              <li>
                <Link
                  className="dropdown-item"
                  to="/transaction-history"
                  style={{ fontSize: "14px" }}
                >
                  Transaction History
                </Link>
              </li>
            </ul>
          </div>
          <span
                  className={`dropdown-item ${
                    isConnected ? "text-success" : "text-danger"
                  }`}
                  style={{width: '100px', fontSize: "14px" }}
                >
                  {isConnected
                    ? `Connected`
                    : "Disconnected"}
                </span>
        </div>
      </nav>
      {showConnectWalletPopup && (
        <div className="popup">
          <div className="card" style={{ background: 'white', height: '200px', width: '330px' }}>
            <div className="card-header" style={{ background: '#FCB635', height: '30px' }}></div>
            <div className="card-body">
              <div className="popup-content">
                <p className="text-center fs-6">You need to connect your wallet to proceed.</p>
                <button className="popupwallet btn btn-sm ms-4 mt-3" onClick={handleConnectWallet}>
                  Connect Wallet
                </button>
                <button className="popupwallet btn btn-sm mx-4 mt-3" onClick={handleCancelConnectWallet}>
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <nav
        className="navbar navbar-expand-lg"
        style={{ backgroundColor: "rgb(252, 182, 53)", height: "60px" }}
      >
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            <img
              src="assets/MiralLog.svg"
              alt="Logo"
              style={{ maxWidth: "100%" }}
            />
          </Link>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item">
                <Link
                  className="nav-link active"
                  to="/"
                  style={{
                    fontWeight: "600",
                    lineHeight: "30px",
                    fontFamily: '"Norwester", "Open Sans", Arial, sans-serif',
                    hovercolor: "white",
                  }}
                >
                  TICKETS
                </Link>
              </li>
              <li className="nav-item mx-5">
                <Link
                  className="nav-link active"
                  to="/payment"
                  style={{
                    fontWeight: "600",
                    lineHeight: "30px",
                    fontFamily: '"Norwester", "Open Sans", Arial, sans-serif',
                    hovercolor: "white",
                  }}
                >
                  PAYMENTS
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </Fragment>
  );
};

export default NavbarMain;
