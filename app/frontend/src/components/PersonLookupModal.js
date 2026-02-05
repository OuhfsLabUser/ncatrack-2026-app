// src/components/PersonLookupModal.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Box,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { peopleApi, casesApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

const PersonLookupModal = ({ open, onClose, currentCaseId, onPersonAdded }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [associating, setAssociating] = useState(false);

  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a last name to search');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      // Use the search API endpoint with lastName
      const data = await peopleApi.searchByLastName(searchTerm.trim());
      // The API returns an array of people with case information
      const peopleList = Array.isArray(data) ? data : [];
      
      setSearchResults(peopleList);
      if (peopleList.length === 0) {
        setError('No matching persons found');
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search people. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle select person - associate with current case
  const handleSelect = async (person) => {
    if (!currentCaseId || currentCaseId === 'create-new' || currentCaseId === 'search-case') {
      setError('Please select a valid case first');
      return;
    }

    setAssociating(true);
    setError(null);

    try {
      // Get the case to obtain cac_id
      const caseData = await casesApi.getCaseById(currentCaseId);
      
      if (!caseData || !caseData.cac_id) {
        throw new Error('Failed to get case information');
      }

      // Associate person with case
      await peopleApi.associatePersonWithCase(
        person.person_id,
        parseInt(currentCaseId),
        caseData.cac_id
      );

      // Close modal and refresh the people list
      handleClose();
      if (onPersonAdded) {
        onPersonAdded();
      }
    } catch (err) {
      console.error('Error associating person with case:', err);
      setError(`Failed to add person to case: ${err.message}`);
    } finally {
      setAssociating(false);
    }
  };

  // Handle view person details
  const handleView = (person) => {
    navigate('/PersonBio', {
      state: { personId: person.person_id }
    });
  };

  // Handle No Match Found - navigate to create new person
  const handleNoMatchFound = () => {
    handleClose();
    // Navigate to PersonBio in create mode
    // If we're in the context of adding a person to a case, return to CasePersonList
    navigate('/PersonBio', {
      state: {
        createMode: true,
        returnTo: '/CasePersonList',
        caseId: currentCaseId,
        personType: 'victim'
      }
    });
  };

  // Handle close modal
  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    setError(null);
    setLoading(false);
    setAssociating(false);
    onClose();
  };

  // Handle Enter key in search input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '500px'
        }
      }}
      data-aoi="Lookup Person Modal"
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Lookup Person
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3, mt: 2 }}>
          {/* Search Form */}
          <Box sx={{ display: 'flex', mb: 3, alignItems: 'flex-end' }}>
            <Typography variant="body1" sx={{ mr: 2, fontWeight: 'bold' }}>
              Last Name
            </Typography>
            <TextField 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              size="small"
              sx={{ flexGrow: 1, mr: 2 }}
              placeholder="Enter last name"
              InputProps={{
                'data-aoi': 'Last Name Search Input'
              }}
            />
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              sx={{ mr: 1, textTransform: 'uppercase' }}
              disabled={loading || associating}
              data-aoi="Search Button"
            >
              {loading ? <CircularProgress size={24} /> : 'Search'}
            </Button>
          </Box>

          {error && (
            <Alert severity={error.includes('No matching') ? 'info' : 'error'} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Last Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>First Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Middle Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Alias</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : searchResults.length > 0 ? (
                  searchResults.map((person) => (
                    <TableRow 
                      key={person.person_id} 
                      hover
                      onClick={() => handleSelect(person)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{person.last_name || ''}</TableCell>
                      <TableCell>{person.first_name || ''}</TableCell>
                      <TableCell>{person.middle_name || ''}</TableCell>
                      <TableCell>{person.nick_name || ''}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      {searchTerm ? 'No results found' : 'Enter a last name to search'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          onClick={handleNoMatchFound}
          sx={{ bgcolor: '#d32f2f', textTransform: 'uppercase', '&:hover': { bgcolor: '#b71c1c' } }}
          data-aoi="No Match Found Button"
        >
          No Match Found
        </Button>
        <Button
          variant="contained"
          onClick={handleClose}
          disabled={associating}
          sx={{ bgcolor: '#d32f2f', textTransform: 'uppercase', '&:hover': { bgcolor: '#b71c1c' } }}
          data-aoi="Close Modal Button"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PersonLookupModal;

