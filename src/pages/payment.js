import React, { Fragment, useState, useEffect, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';
import CartSection from './cart';
import { connectWallet, checkAccountCreated } from '../utils/Web3Utils';
import QRCode from 'qrcode'; // Import QRCode library
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import Web3 from 'web3';
import MyNFTABI from './NFTContratc.json';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

function PaymentAmt() {
    const [allFieldsFilled, setAllFieldsFilled] = useState(false);
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const [qrCodeImageBlob, setQrCodeImageBlob] = useState(null);
    const [validityStatus, setValidityStatus] = useState(''); // State to track validity status
    const [lastTransactionId, setLastTransactionId] = useState(0);
    const [qrCodeDetails, setQRCodeDetails] = useState(null);
    const [walletConnected, setWalletConnected] = useState(false);
    const [showConnectWalletPopup, setShowConnectWalletPopup] = useState(false);
    const [showFormPopup, setShowFormPopup] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
const [account, setAccount] = useState(null);
const [connectedAccount, setConnectedAccount] = useState('');
const [isAccountCreated, setIsAccountCreated] = useState(false);
const [cartItems, setCartItems] = useState(() => {
const savedCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
return savedCartItems;
});
const [totalPrice, setTotalPrice] = useState(() => {
const savedTotalPrice = parseFloat(localStorage.getItem('totalPrice')) || 0;
return savedTotalPrice;
});
const [showQR, setShowQR] = useState(false); // State to manage QR code visibility
const [userData, setUserData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    contactNumber: '',
    country: '',
});

useEffect(() => {
    const fetchData = async () => {
        try {
            const connectedAccount = await connectWallet();
            setWalletConnected(true);
            const accountExists = await checkAccountCreated(connectedAccount);
            if (accountExists) {
                const userDetails = await fetchUserDetails(connectedAccount);
                setUserData(userDetails);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    if (window.ethereum) {
        fetchData();
    }
}, []);

const updateQRCodeDataOnExpiry = async (transactionId) => {
    try {
      // Retrieve the QR code details from the database
      const qrCodeDetailsRef = firebase.database().ref(`accounts/${account}/qrCodeDetails/${transactionId}`);
      const qrCodeDetailsSnapshot = await qrCodeDetailsRef.once('value');
      const qrCodeDetails = qrCodeDetailsSnapshot.val();
  
      if (qrCodeDetails) {
        const { qrData, items, transactionDetails } = qrCodeDetails;
        const tokenValidityExpiration = new Date(qrData.validity).getTime();
        const currentTime = new Date().getTime();
  
        // Check if the token has expired
        if (currentTime > tokenValidityExpiration) {
          // Update the validity status in the qrData object
          const updatedQrData = {
            ...qrData,
            isValidToken: false,
          };
  
          // Update the QR code details in the database
          await qrCodeDetailsRef.update({
            qrData: updatedQrData,
          });
  
          console.log('QR code data updated with expired validity status');
        }
      } else {
        console.error('QR code details not found');
      }
    } catch (error) {
      console.error('Error updating QR code data on expiry:', error);
    }
  };

useEffect(() => {
    const checkConnection = async () => {
        try {
            const connectedAccount = await connectWallet(); // Connect the wallet
            setAccount(connectedAccount);
            setIsConnected(true);
            // setWalletConnected(true); // Update the connection status
            // setConnectedAccount(connectedAccount); // Store the connected wallet address
            console.log('Wallet connected successfully:', connectedAccount); // Log the connected wallet address
        // Check if the connected account already exists in the database
        const accountExists = await checkAccountCreated(connectedAccount);
        setIsAccountCreated(accountExists);
        if (!accountExists) {
            // Clear cart items and total price for a new user
            setCartItems([]);
            setTotalPrice(0);
        }
        if (accountExists) {               
            // Fetch user details from the database if the account exists
            const userDetails = await fetchUserDetails(connectedAccount);
            setUserData(userDetails);
        }
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
    }
};

    if (window.ethereum) {
        checkConnection(); // Call the function to check wallet connection
    }
}, []);

const fetchUserDetails = async (walletAddress) => {
    try {
        const userSnapshot = await firebase.database().ref(`accounts/${walletAddress}`).once('value');
        const userDataFromDB = userSnapshot.val();
        if (userDataFromDB) {
            return {
                email: userDataFromDB.email || '',
                password: userDataFromDB.password || '',
                firstName: userDataFromDB.name ? userDataFromDB.name.split(' ')[0] : '',
                lastName: userDataFromDB.name ? userDataFromDB.name.split(' ')[1] : '',
                contactNumber: userDataFromDB.contactNumber || '',
                country: userDataFromDB.country || ''
            };
        } else {
            console.error('User data not found for wallet address:', walletAddress);
            return null; // Return null if user data is not found
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
};
    // Save cart items and total price to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        localStorage.setItem('totalPrice', totalPrice.toString());
    }, [cartItems, totalPrice]);

    // Add to cart function
    const addToCart = (passType, quantity, price) => {
        const existingItemIndex = cartItems.findIndex(item => item.passType === passType);
        if (existingItemIndex !== -1) {
            const updatedCartItems = [...cartItems];
            updatedCartItems[existingItemIndex].quantity += quantity;
            setCartItems(updatedCartItems);
        } else {
            const newItem = {
                passType: passType,
                quantity: quantity,
                price: price
            };
            setCartItems([...cartItems, newItem]);
        }
        setTotalPrice(totalPrice + (quantity * price));
    };

    const removeFromCart = (passType, quantity, price) => {
        const updatedCartItems = cartItems.filter(item => item.passType !== passType);
        setCartItems(updatedCartItems);
        setTotalPrice(prevTotalPrice => prevTotalPrice - (quantity * price));
    };
     
    const calculateExpiryDate = () => {
        // Calculate the expiry date based on the current date
        const currentDate = new Date();
        const expiryDate = new Date(currentDate);
        expiryDate.setFullYear(currentDate.getFullYear() + 1); // Add one year to the current year
        return expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // const calculateExpiryDate = () => {
    //     const currentDate = new Date();
    //     const expiryDate = new Date(currentDate);
    //     expiryDate.setMinutes(currentDate.getMinutes() + 5); // Add 5 minutes to the current time
    //     return expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    // };    
    
    const handleCreateAccount = async () => {
        if (!isConnected) {
            alert('Please connect to your MetaMask wallet first.');
            return;
        }
        const walletAddress = account;
        const firstName = userData.firstName ? userData.firstName.trim() : '';
        const lastName = userData.lastName ? userData.lastName.trim() : '';
        const contactNumber = userData.contactNumber ? userData.contactNumber.trim() : '';
        const country = userData.country ? userData.country.trim() : '';
        const email = userData.email ? userData.email.trim() : '';
        const password = userData.password ? userData.password.trim() : ''; 
        // Validate form fields
    if (!firstName || !lastName || !contactNumber || !country || !email || !password) {
        alert('Please fill in all required fields.');
        return;
    }
    // Validate checkbox
    if (!document.getElementById('checked').checked) {
        alert('Please accept the terms and conditions.');
        return;
    }
        try {
        // Assuming you have a Firebase Realtime Database reference initialized
        const databaseRef = firebase.database().ref(`accounts/${walletAddress}`);

            console.log("",connectedAccount);
            // Create a new account object with email, password, name, and contact number
            const newAccount = {
                email: email,
                password: password,
                name: `${firstName} ${lastName}`,
                contactNumber: contactNumber,
                walletAddress: account,
                country :country,
                createdAt: new Date().toISOString() // Add createdAt timestamp
            };
            // Push the new account data to the database
            await databaseRef.set(newAccount);
        
        // Update userData state with the new values
        setUserData({
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName,
            contactNumber: contactNumber,
            country: country
        });
        // Clear form data after account creation
        setUserData({
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            contactNumber: '',
            country: ''
        });
        // Clear cart items
        setCartItems([]);
        setTotalPrice(0);

        setShowFormPopup(false);
        setIsAccountCreated(true);          
        alert('Account created successfully!');

           // Disable and check the checkbox
           document.getElementById('checked').checked = true;
           document.getElementById('checked').disabled = true;

        } catch (error) {
            console.error('Error creating account:', error);
            alert('Error creating account. Please try again.');
        }
        // Refresh the page after account creation
        window.location.reload();
    };
const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prevUserData => ({
        ...prevUserData,
        [name]: value
    }));

// Check if all required fields are filled
const { firstName, lastName, contactNumber, country, email, password } = userData;
const allFieldsFilled = firstName && lastName && contactNumber && country && email && password;
setAllFieldsFilled(allFieldsFilled);
};

    useEffect(() => {
        const checkConnection = async () => {
            try {
                const connectedAccount = await connectWallet(); // Connect the wallet
                setAccount(connectedAccount);
                setWalletConnected(true); // Update the connection status
                // setConnectedAccount(connectedAccount); // Store the connected wallet address
                console.log('Wallet connected successfully:', connectedAccount); // Log the connected wallet address
            // Check if the connected account already exists in the database
            const accountExists = await checkAccountCreated(connectedAccount);
            setIsAccountCreated(accountExists);
    
            if (accountExists) {
                // Fetch user details from the database if the account exists
                const userDetails = await fetchUserDetails(connectedAccount);
                setUserData(userDetails);
            }
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
        }
    };   
        if (window.ethereum) {
        checkConnection();
        }
    }, []);

    // Define a function to handle wallet connection
const handleConnectWallet = async () => {
    try {
        // Connect to wallet
        await connectWallet();
        console.log('Wallet connected successfully');
        // setWalletConnected(true);
        setIsConnected(true); // Update connected status
        console.log("wallet",connectWallet)
        // After successful connection, refresh the page
        window.location.reload();
        // Close connect wallet popup
        setShowConnectWalletPopup(false);
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        alert('Failed to connect to wallet. Please try again.');
    }
};

// Define a function to handle canceling wallet connection
const handleCancelConnectWallet = () => {
    // Close connect wallet popup
    // setShowConnectWalletPopup(false);
    navigate('/')
}; 
    useEffect(() => {
        const fetchLastTransactionId = async () => {
            try {
                // Fetch the last transaction ID from Firebase
                const snapshot = await firebase.database().ref('lastTransactionId').once('value');
                const id = snapshot.val();
                setLastTransactionId(id || 0); // Set the last transaction ID in the state
            } catch (error) {
                console.error('Error fetching last transaction ID:', error);
            }
        };

        fetchLastTransactionId(); // Fetch the last transaction ID when the component mounts
    }, []);
    // Function to generate a sequential transaction ID
    const generateTransactionId = async () => {
        try {
            // Increment the last used transaction ID
            const newTransactionId = lastTransactionId + 1;
            // Update the last used transaction ID state variable
            setLastTransactionId(newTransactionId);
            // Store the new transaction ID in Firebase
            await firebase.database().ref('lastTransactionId').set(newTransactionId);
            // Return the new transaction ID
            return newTransactionId;
        } catch (error) {
            console.error('Error generating transaction ID:', error);
            return null;
        }
    };
    const handleBuyNowClick = async (e) => {
        e.preventDefault();
        try {           
            if (!isConnected) {
                setShowConnectWalletPopup(true);
            } else if (!isAccountCreated) {
                alert('Please create an account before proceeding to buy.');
            } else if (cartItems.length === 0) {
                alert('Please add items to your cart before proceeding to buy.');
            } else {                   
                  // Mint NFT            
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Accounts:", accounts);
        const web3 = new Web3(window.ethereum);
        const contractAddress = "0x08dba9e9b254098fa6a896a9bf4588fa4d1b1adb"; // Update with your contract address
        console.log("Contract Address:", contractAddress);
        const contractABI = MyNFTABI; // Use the imported ABI
        console.log("Contract ABI:", contractABI);
        const contractInstance = new web3.eth.Contract(contractABI, contractAddress);
        console.log("Contract Instance:", contractInstance);
        console.log("Contract Methods:", contractInstance.methods);
        const mintPrice = await contractInstance.methods.MINT_PRICE().call();
        console.log("Mint Price:", mintPrice);
        setIsLoading(true);
        const tx = await contractInstance.methods.buyToken(accounts[0]).send({ from: accounts[0], value: mintPrice });
        console.log("Transaction :", tx);
        console.log("Transaction :", tx.transactionHash);
        // Extract tokenId from returnValues
        const tokenId = tx.events.TokenPurchased.returnValues.tokenId.toString();
        console.log("Token ID:", tokenId);
        // Check token validity directly from the contract
        const isValidToken = await contractInstance.methods.checkValidity(tokenId).call();       
        // Generate the QR code data      
const qrData = {
    cartItems,
    buyerName: `${userData.firstName} ${userData.lastName}`,
    totalPrice,
    validity: calculateExpiryDate(),
    tokenId, // Add tokenId to the qrData object
    isValidToken
};
        const expiryDate = new Date(qrData.validity);
        const currentDate = new Date();

        // Update the validity status based on the expiration date
        if (expiryDate > currentDate) {
            setValidityStatus('Verified');
        } else {
            setValidityStatus('Expired');
        }
// Check if the TokenPurchased event exists in the transaction logs
const tokenPurchasedEvent = tx.events.TokenPurchased;
if (tokenPurchasedEvent) {
    // Access the token ID from the event return values
    qrData.tokenId = tokenPurchasedEvent.returnValues.tokenId.toString();
} else {
    // Handle the case where the TokenPurchased event is not found
    console.error("TokenPurchased event not found in transaction logs.");
    // You may want to display an error message or handle this case differently
}
                 // Generate a sequential transaction ID
                const transactionId = await generateTransactionId();
                // Store the transaction hash and token ID in the QR code details
                qrData.transactionHash = tx.transactionHash;
                qrData.tokenId = tokenId;
    // Store the transaction details
    const transactionDetails = {
        transactionId: transactionId,
        buyDate: new Date().toISOString(), // Date of the purchase
        // Other transaction details you want to include
    };
    // Declare qrCodeImageBlob variable
    let qrCodeImageBlob;
      // Generate QR code image blob
      qrCodeImageBlob = await QRCode.toDataURL(JSON.stringify(qrData), { errorCorrectionLevel: 'H' });
      setQrCodeImageBlob(qrCodeImageBlob);
        // Store the QR code details under the account
        const qrCodeRef = firebase.database().ref(`accounts/${account}/qrCodeDetails`);
        const newQRCodeRef = qrCodeRef.push();
        await newQRCodeRef.set({
            qrData,
            items: cartItems.map(item => ({
                ...item,
                totalPrice: item.price * item.quantity
            })),
            transactionDetails,
            qrCodeDownloader: qrCodeImageBlob // Store the qrCodeDownloader here
        });
     // Update the validity status based on the expiration date and token validity
     if (isValidToken) {
        const expiryDate = new Date(qrData.validity);
        const currentDate = new Date();
        if (expiryDate > currentDate) {
            setValidityStatus('Verified');
        } else {
            setValidityStatus('Expired');
        }
    } else {
        setValidityStatus('Invalid');
    }
    // Create an array to hold the items with their total price
    const itemsWithTotalPrice = cartItems.map(item => ({
        ...item,
        totalPrice: item.price * item.quantity
    })); 
                    // Update the qrCodeDetails state with the newly stored data
                    const newQrCodeDetails = await newQRCodeRef.once('value');
                    setQRCodeDetails(newQrCodeDetails.val());
        // Show the QR code
        setShowQR(true);
                // Display success message
                alert("NFT minted successfully! Cart purchase completed.");    
                // Clear cart items and total price
                setCartItems([]);
                setTotalPrice(0);   
                // Reload the page after 3 minutes
                // setTimeout(() => {
                //     window.location.reload();
                // }, 3 * 60 * 1000); // 3 minutes in milliseconds
            } 
            setIsLoading(false);         
        } catch (error) {
            console.error("Error minting NFT:", error);
            const errorMessage = error.message || "Failed to mint NFT. Please try again.";
            alert(errorMessage);
             setIsLoading(false);
        }
    };  
    
    const formatQRData = useCallback(() => {
        if (!qrCodeDetails) return ''; // Return empty string if qrCodeDetails is not available
      
        const { buyerName, cartItems, validity, tokenId, isValidToken } = qrCodeDetails.qrData;
      
        // Format the QR code data string
        const formattedData = `Buyer Name: ${buyerName}
      ${cartItems.map(item => `Pass Type: ${item.passType}, Quantity: ${item.quantity}`).join('\n')}
      Buy Date: ${new Date(qrCodeDetails.transactionDetails.buyDate).toLocaleDateString('en-US')}
      ValidityCheck: ${isValidToken}
      Validity: ${isValidToken ? `${validity}: Verified \u2714` : `${validity}: Expired \u2718`}
      Token ID: ${tokenId}`;
      
        return formattedData;
      }, [qrCodeDetails]);
      
      useEffect(() => {
        const generateQRCode = async () => {
          try {
            const qrData = formatQRData(); // Function to format the QR code data
            const qrCodeDataUrl = await QRCode.toDataURL(qrData);
            setQrCodeImageBlob(qrCodeDataUrl);
          } catch (error) {
            console.error('Error generating QR code:', error);
          }
        };
      
        generateQRCode();
      }, [formatQRData]);
      const handleDownloadQRCode = async () => {
        try {
          if (qrCodeImageBlob) {
            const transactionId = qrCodeDetails.transactionDetails.transactionId;
      
            // Update the QR code data in the database if the token has expired
            await updateQRCodeDataOnExpiry(transactionId);
      
            // Retrieve the updated QR code details from the database
            const qrCodeDetailsRef = firebase.database().ref(`accounts/${account}/qrCodeDetails/${transactionId}`);
            const updatedQrCodeDetailsSnapshot = await qrCodeDetailsRef.once('value');
            const updatedQrCodeDetails = updatedQrCodeDetailsSnapshot.val();
      
            // Update the qrCodeDetails state with the updated data
            setQRCodeDetails(updatedQrCodeDetails);
      
            // Generate the QR code with the updated data
            const qrData = formatQRData();
            const qrCodeDataUrl = await QRCode.toDataURL(qrData);
            setQrCodeImageBlob(qrCodeDataUrl);
      
            // Trigger the download of the QR code image
            saveAs(qrCodeImageBlob, 'qr-code.png');
          } else {
            console.error('QR code image blob not available');
          }
        } catch (error) {
          console.error('Error downloading QR code:', error);
        }
      };

    const handleDisconnectWallet = () => {
        setWalletConnected(false);
        // Perform any other actions needed to disconnect the wallet
    };

    const handleBuyNow = () => {
        setShowQR(true); // Show QR code on Buy Now click
    };
  
    return (          
        <Fragment>
            <head>
                {/* <!-- Other meta tags and links --> */}
                <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/2.10.2/umd/popper.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
            </head>
            <div className="container-fluid mt-3" style={{ color: '#333', fontFamily: 'Open Sans, Arial, sans-serif', textRendering: 'optimizeLegibility', WebkitFontSmoothing: 'antialiased', fontSize: '13px'}}>
                <div className="row">
                    <div className="col-7">
                    <h5 style={{ borderBottom: '1px solid lightgray' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                {isAccountCreated ? 'ACCOUNT DETAILS' : 'CREATE ACCOUNT'}
                            </span>
                        </h5>
                        <div>
                        <div className="row mt-4">
                            <div className="col-6">
                                <div className="form-floating mb-3">
                                <input
                                            type="email"
                                            className="form-control"
                                            id="emailInput"
                                            name="email"
                                            value={userData.email}
                                            onChange={handleInputChange}
                                            disabled={isAccountCreated}
                                        />
                                    <label htmlFor="emailInput" >Email address</label>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="form-floating mb-3">
                                    <input
                                    type="password"
                                    className="form-control"
                                    id="passwordInput"
                                    name="password"
                                    value={userData.password}
                                    onChange={handleInputChange}
                                    disabled={isAccountCreated}
                                    />
                                    <label htmlFor="passwordInput">Password</label>
                                </div>
                            </div>
                        </div>  
                        <div className="row">
                            <div className="col-6">
                                <div className="form-floating mb-3">
                                <input
                                            type="text"
                                            className="form-control"
                                            id="firstNameInput"
                                            name="firstName"
                                            value={userData.firstName}
                                            onChange={handleInputChange}
                                            disabled={isAccountCreated}
                                        />
                                    <label htmlFor="firstNameInput">First Name</label>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="form-floating mb-3">
                                <input
                                            type="text"
                                            className="form-control"
                                            id="lastNameInput"
                                            name="lastName"
                                            value={userData.lastName}
                                            onChange={handleInputChange}
                                            disabled={isAccountCreated}
                                        />
                                    <label htmlFor="lastNameInput">Last Name</label>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-6">
                                <div className="form-floating mb-3">
                                <input
                                            type="text"
                                            className="form-control"
                                            id="contactInput"
                                            name="contactNumber"
                                            value={userData.contactNumber}
                                            onChange={handleInputChange}
                                            disabled={isAccountCreated}
                                        />
                                    <label htmlFor="contactInput">Contact Number</label>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="form-floating mb-3">
                                <input
                                            type="text"
                                            className="form-control"
                                            id="countryInput"
                                            name="country"
                                            value={userData.country}
                                            onChange={handleInputChange}
                                            disabled={isAccountCreated}
                                        />
                                    <label htmlFor="countryInput">Country </label>
                                </div>
                            </div>
                        </div>
                        {!isAccountCreated ?
                        <button type="button" className="btn-warning" style={{ width: '130px', height: '30px' , background: 'rgb(252, 182, 53)', fontWeight: 'bold'}} onClick={handleCreateAccount}>
                                        {isAccountCreated ? 'Update Account' : 'Create Account'}
                                    </button>
                            : null}
                    </div>
                    <div className="row mt-4">
            <div className="col d-flex justify-content-start align-items-center">
                <input type="checkbox" name="checked" id="checked" checked={allFieldsFilled} disabled style={{ height: '18px', width: '25px', marginLeft: '10px', marginRight: '5px' }} />                           
                <span>
                    I have read and accept the Terms and <a href="">Conditions</a> and <a href="">Privacy Policy</a>.
                </span>
            </div>
        </div>
                    <div>
                        <div className="addcart mt-4 ">
                <button type="button" className="btn-warning" style={{ width: '100px', height: '30px' , background: 'rgb(252, 182, 53)', fontWeight: 'bold'}}  onClick={handleBuyNowClick}>
                Buy Now
                                    </button>
        </div>                   
                        </div>
                        {showQR && qrCodeImageBlob && (
<div className="mt-4" style={{ textAlign: 'left' }}>
<img src={qrCodeImageBlob} alt="QR Code" />
                <button onClick={handleDownloadQRCode} className="btn btn-primary btn-sm">
                <i className="bi bi-download"></i>
                </button>
</div>
)}
                        <hr />
                        <div className="mb-5"></div>
                    </div>                        
                    <CartSection
                cartItems={cartItems}
                totalPrice={totalPrice}
                handleBuyNow={handleBuyNow}
                calculateExpiryDate={calculateExpiryDate}
                removeFromCart={removeFromCart}
                addToCart={addToCart}
            />
                </div>
                </div>
                                {/* Popup for connecting wallet */}
        <div> {showConnectWalletPopup && (                  
<div className="popup">
    <div className='card' style={{background: 'white', height: '200px', width: '330px'}}>    
    <div className='card-header' style={{background: '#FCB635' ,height: '30px'}}>     
    </div>
<div className='card-body'>
<div className="popup-content">
            <p className='text-center fs-6'>You need to connect your wallet to proceed.</p>
        <button className= 'popupwallet btn btn-sm ms-4 mt-3' onClick={handleConnectWallet}>Connect Wallet</button>
        <button className='popupwallet btn btn-sm mx-4 mt-3' onClick={handleCancelConnectWallet}>Maybe Later</button>
    </div>
    </div>
    </div>
</div>
)}
</div>  
{isLoading && (
                <div className="loading-backdrop">
                    <div className="loading-indicator">
                        Loading...
                    </div>
                </div>
            )}
            <div className={isLoading ? "blur-container" : ""}>
            </div>         
        </Fragment>       
    )
            }
export default PaymentAmt;