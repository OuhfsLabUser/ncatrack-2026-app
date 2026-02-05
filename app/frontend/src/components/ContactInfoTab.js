import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TablePagination,
  Checkbox,
  CircularProgress,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { peopleApi } from '../services/api';

const ContactInfoTab = ({ personId }) => {
  // Address History state
  const [addressHistory, setAddressHistory] = useState([]);
  const [addressPage, setAddressPage] = useState(0);
  const [addressRowsPerPage, setAddressRowsPerPage] = useState(10);

  // Phone Numbers state
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [phonePage, setPhonePage] = useState(0);
  const [phoneRowsPerPage, setPhoneRowsPerPage] = useState(10);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Address History handlers
  const handleAddressChangePage = (event, newPage) => {
    setAddressPage(newPage);
  };

  const handleAddressChangeRowsPerPage = (event) => {
    setAddressRowsPerPage(parseInt(event.target.value, 10));
    setAddressPage(0);
  };

  // Phone Numbers handlers
  const handlePhoneChangePage = (event, newPage) => {
    setPhonePage(newPage);
  };

  const handlePhoneChangeRowsPerPage = (event) => {
    setPhoneRowsPerPage(parseInt(event.target.value, 10));
    setPhonePage(0);
  };

  // Load data from case_person model
  useEffect(() => {
    const loadContactInfo = async () => {
      if (!personId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get all case_person records for this person
        const casesData = await peopleApi.getCasesForPerson(personId);

        // Transform case_person data into address history records
        const addressData = casesData
          .filter(cp => {
            // Only include records that have at least one address field
            return cp.address_line_1 || cp.address_line_2 || cp.city || 
                   cp.state_abbr || cp.zip || cp.county || cp.region;
          })
          .map((cp, index) => ({
            id: `${cp.case_id}-${cp.person_id}-${index}`, // Unique ID for React key
            streetAddress: cp.address_line_1 || '',
            addressLineTwo: cp.address_line_2 || '',
            city: cp.city || '',
            state: cp.state_abbr || '',
            zip: cp.zip || '',
            county: cp.county || '',
            region: cp.region || '',
            startDate: cp.start_date || null,
            endDate: cp.end_date || null,
            caseId: cp.case_id, // Keep case_id for reference
            caseNumber: cp.case_number || `Case #${cp.case_id}`
          }));

        // Transform case_person data into phone number records
        const phoneData = [];
        
        casesData.forEach(cp => {
          // Add home phone if exists
          if (cp.home_phone_number) {
            phoneData.push({
              id: `${cp.case_id}-${cp.person_id}-home`,
              countryCode: '', // Not available in case_person model
              phoneNumber: cp.home_phone_number,
              extension: '', // Not available in case_person model
              phoneType: 'Home',
              active: true, // Default to active
              caseId: cp.case_id,
              caseNumber: cp.case_number || `Case #${cp.case_id}`
            });
          }
          
          // Add cell phone if exists
          if (cp.cell_phone_number) {
            phoneData.push({
              id: `${cp.case_id}-${cp.person_id}-cell`,
              countryCode: '',
              phoneNumber: cp.cell_phone_number,
              extension: '',
              phoneType: 'Cell',
              active: true,
              caseId: cp.case_id,
              caseNumber: cp.case_number || `Case #${cp.case_id}`
            });
          }
          
          // Add work phone if exists
          if (cp.work_phone_number) {
            phoneData.push({
              id: `${cp.case_id}-${cp.person_id}-work`,
              countryCode: '',
              phoneNumber: cp.work_phone_number,
              extension: '',
              phoneType: 'Work',
              active: true,
              caseId: cp.case_id,
              caseNumber: cp.case_number || `Case #${cp.case_id}`
            });
          }
        });

        setAddressHistory(addressData);
        setPhoneNumbers(phoneData);
      } catch (err) {
        console.error('Error loading contact info:', err);
        setError('Failed to load contact information.');
      } finally {
        setLoading(false);
      }
    };

    loadContactInfo();
  }, [personId]);

  // Calculate paginated data
  const paginatedAddressHistory = addressHistory.slice(
    addressPage * addressRowsPerPage,
    addressPage * addressRowsPerPage + addressRowsPerPage
  );

  const paginatedPhoneNumbers = phoneNumbers.slice(
    phonePage * phoneRowsPerPage,
    phonePage * phoneRowsPerPage + phoneRowsPerPage
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Address History Section */}
      <Paper sx={{ mb: 4, p: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Address History
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              // TODO: Implement add new address record
              console.log('Add new address record');
            }}
          >
            + Add new record
          </Button>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="address history table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Street Address</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Address Line Two</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>City</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>State</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Zip</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>County</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Region</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>End Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedAddressHistory.length > 0 ? (
                paginatedAddressHistory.map((address) => (
                  <TableRow key={address.id} hover>
                    <TableCell sx={{ textAlign: 'center' }}>{address.streetAddress || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{address.addressLineTwo || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{address.city || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{address.state || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{address.zip || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{address.county || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{address.region || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      {address.startDate ? new Date(address.startDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      {address.endDate ? new Date(address.endDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No items to display
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {addressHistory.length > 0 && (
          <TablePagination
            component="div"
            count={addressHistory.length}
            page={addressPage}
            onPageChange={handleAddressChangePage}
            rowsPerPage={addressRowsPerPage}
            onRowsPerPageChange={handleAddressChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Items per page:"
          />
        )}
      </Paper>

      {/* Phone Numbers Section */}
      <Paper sx={{ p: 3 }} elevation={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Phone Numbers
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              // TODO: Implement add new phone record
              console.log('Add new phone record');
            }}
          >
            + Add new record
          </Button>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="phone numbers table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Country Code</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Phone Number</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Extension</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Phone Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Active</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPhoneNumbers.length > 0 ? (
                paginatedPhoneNumbers.map((phone) => (
                  <TableRow key={phone.id} hover>
                    <TableCell sx={{ textAlign: 'center' }}>{phone.countryCode || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{phone.phoneNumber || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{phone.extension || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{phone.phoneType || 'N/A'}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Checkbox checked={phone.active || false} disabled />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No items to display
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {phoneNumbers.length > 0 && (
          <TablePagination
            component="div"
            count={phoneNumbers.length}
            page={phonePage}
            onPageChange={handlePhoneChangePage}
            rowsPerPage={phoneRowsPerPage}
            onRowsPerPageChange={handlePhoneChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Items per page:"
          />
        )}
      </Paper>
    </Box>
  );
};

export default ContactInfoTab;

