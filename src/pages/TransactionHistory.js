import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Pagination from '@mui/material/Pagination';
import { connectWallet } from '../utils/Web3Utils';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';
import DownloadIcon from '@mui/icons-material/Download';
// import PaymentAmt from './payment';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const TransactionHistory = ({ connectedAccount,qrCodeImageBlob }) => {
  const [connectedWalletAddress, setConnectedWalletAddress] = useState('');
  const [qrCodeDetails, setQRCodeDetails] = useState([]);
  const [buyerName, setBuyerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const connectedAccount = await connectWallet(); // Connect the wallet
        setConnectedWalletAddress(connectedAccount); // Set the connected wallet address
        console.log('Wallet connected successfully:', connectedAccount); // Log the connected wallet address

        // Fetch all accounts from Firebase
        const accountsSnapshot = await firebase.database().ref('accounts').once('value');
        const accountsData = accountsSnapshot.val();

        // Check if accountsData exists and is an object
        if (accountsData && typeof accountsData === 'object') {
          let qrCodeDetailsArray = [];

          // Iterate over each account
          Object.entries(accountsData).forEach(([accountKey, accountData]) => {
            const { qrCodeDetails, name } = accountData;

            // Check if the account key matches the connected wallet address
            if (accountKey === connectedAccount) {
              // Check if qrCodeDetails exists and is an object
              if (qrCodeDetails && typeof qrCodeDetails === 'object') {
                // Iterate over each qrCodeDetail
                Object.entries(qrCodeDetails).forEach(([qrCodeKey, qrCodeDetail]) => {
                  const { qrData, items, transactionDetails } = qrCodeDetail;

                  // Iterate over each item
                  (items || []).forEach((item, itemIndex) => {
                    const { passType, price, quantity, totalPrice } = item;
                    const { buyDate, transactionId } = transactionDetails || {};
                    const { buyerName, validity, tokenId, transactionHash } = qrData || {};

                    // Parse the buyDate string to get only the date part
                    const formattedBuyDate = buyDate
                      ? new Date(buyDate).toLocaleDateString()
                      : 'N/A';

                    // Add the qrCodeDetail to the qrCodeDetailsArray
                    qrCodeDetailsArray.push({
                      id: `${qrCodeKey}-${itemIndex}`,
                      buyerName: buyerName || '',
                      cartItems: [
                        {
                          passType: passType || 'N/A',
                          price: price || 0,
                          quantity: quantity || 0,
                          totalPrice: totalPrice || 0,
                        },
                      ],
                      totalPrice: totalPrice || 0,
                      validity: validity || 'N/A',
                      walletaddress: connectedAccount,
                      transactionId: transactionId || 'N/A',
                      transactionHash: transactionHash || '',
                      buyDate: formattedBuyDate,
                      qrCodeDownloader: qrCodeDetail.qrCodeDownloader || '',
                    });
                  });
                });
              }
            }
          });

           // Sort qrCodeDetailsArray based on buyDate in descending order
           qrCodeDetailsArray.sort((a, b) => {
            // First, compare by buyDate
            const dateComparison = new Date(b.buyDate) - new Date(a.buyDate);
            // If buyDate is the same, compare by transactionId
            if (dateComparison === 0) {
              return b.transactionId - a.transactionId;
            }
            return dateComparison;
          });
          setQRCodeDetails(qrCodeDetailsArray);

          // Find the buyer name associated with the connected wallet address
          const connectedWalletDetails = qrCodeDetailsArray.find(
            (details) => details.walletaddress === connectedAccount
          );
          setBuyerName(connectedWalletDetails?.buyerName || '');
        } else {
          setQRCodeDetails([]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data. Please try again later.');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  
  const handleDownloadQRCode = async (transactionId, qrCodeDownloader) => {
    if (qrCodeDownloader) {
      try {
        // Trigger the download of the QR code image
        saveAs(qrCodeDownloader, 'qr-code.png');
  
        // Update the qrCodeDownloader in the Firebase Realtime Database
        const qrCodeDetailsRef = firebase.database().ref(`accounts/${connectedAccount}/qrCodeDetails/${transactionId}`);
        await qrCodeDetailsRef.update({ qrCodeDownloader });
  
        console.log('QR code downloader stored in database successfully');
      } catch (error) {
        console.error('Error storing QR code downloader in database:', error);
      }
    } else {
      console.error('QR code downloader not available');
    }
  };
  
  

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connectedAccount = await connectWallet(); // Connect the wallet
        setAccount(connectedAccount);
        setIsConnected(true);
        setConnectedWalletAddress(connectedAccount); // Set the connected wallet address
        console.log('Wallet connected successfully:', connectedAccount); // Log the connected wallet address
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
      }
    };
  
    if (window.ethereum) {
      checkConnection(); // Call the function to check wallet connection
    }
  }, []);
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredQRCodeDetails = qrCodeDetails.filter(details =>
    details.buyerName.trim().toLowerCase().includes(searchTerm.toLowerCase()) ||
    details.cartItems.some(item =>
      item.passType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.quantity.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.totalPrice.toString().toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    details.validity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    details.transactionId.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredQRCodeDetails.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredQRCodeDetails.slice(startIndex, endIndex);

  const handleChangePage = (event, page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <Typography variant="h6">Loading...</Typography>;
  }

  if (error) {
    return <Typography variant="h6" color="error">{error}</Typography>;
  }

  const getTransactionLink = (transactionHash) => {
    console.log(transactionHash);
    return `https://sepolia.etherscan.io/tx/${transactionHash}`;
  };

  return (
    <div>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h5" component="h2">
          Transaction History
        </Typography>
        <TextField
          label="Search by Buyer or Cart Items"
          value={searchTerm}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
        />
      </Box>
     <Typography variant="subtitle1" gutterBottom>
     <span style={{ fontWeight: 'bold' }}>Connected Wallet Address:</span> {connectedWalletAddress}
</Typography>
<Typography variant="subtitle1" gutterBottom>
<span style={{ fontWeight: 'bold' }}>Buyer Name: </span>
{buyerName}
</Typography>
      <TableContainer component={Paper}>
        <Table aria-label="transaction history table">
          <TableHead className='MuiTableCell-root.MuiTableCell-head'>
            <TableRow>
              <StyledTableCell>Buy Date</StyledTableCell>
              <StyledTableCell>Pass Type</StyledTableCell>
              <StyledTableCell>Quantity</StyledTableCell>
              <StyledTableCell>Total Price</StyledTableCell>
              <StyledTableCell>Valid Until</StyledTableCell>
              <StyledTableCell>Transaction ID</StyledTableCell>
              <StyledTableCell>Transaction</StyledTableCell>
              <StyledTableCell>QRCode</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody className='MuiTableCell-root'>
            {filteredQRCodeDetails.length > 0 ? (
              filteredQRCodeDetails.slice(startIndex, endIndex).map((details) => (
                details.cartItems.map((item, itemIndex) => (
                  <StyledTableRow key={`${details.id}-${itemIndex}`}>
                    <StyledTableCell>{details.buyDate}</StyledTableCell>
                    <StyledTableCell>{item.passType}</StyledTableCell>
                    <StyledTableCell>{item.quantity}</StyledTableCell>
                    <StyledTableCell>{item.totalPrice}</StyledTableCell>
                    <StyledTableCell>{details.validity}</StyledTableCell>
                    <StyledTableCell>{details.transactionId}</StyledTableCell>
                    <StyledTableCell>
                      <IconButton
                        href={getTransactionLink(details.transactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </StyledTableCell>
                    <StyledTableCell>
                    <div className="qr-code-container">
    {details.qrCodeDownloader && (
      <IconButton onClick={() => handleDownloadQRCode(details.transactionId, details.qrCodeDownloader)}>
        <DownloadIcon />
      </IconButton>
    )}
  </div>
</StyledTableCell>
                  </StyledTableRow>
                ))
              ))
            ) : (
              <StyledTableRow>
                <StyledTableCell colSpan={8}>No transactions found.</StyledTableCell>
              </StyledTableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box mt={2} display="flex" justifyContent="center">
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handleChangePage}
          variant="outlined"
          shape="rounded"
        />
      </Box>
    </div>
  );
};

export default TransactionHistory;