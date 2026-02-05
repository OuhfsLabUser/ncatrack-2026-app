// src/components/SearchPerson.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Grid,
  Link,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import SearchIcon from '@mui/icons-material/Search';
import ResetIcon from '@mui/icons-material/Refresh';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { formatSSN, unformatSSN } from '../utils/ssnFormatter';

const API_BASE_URL = 'http://localhost:5000';

const SearchPerson = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentCase } = useCase();
  
  // Search mode: people => Search People; cases => Search Cases
  // Default to 'cases' mode (Search Cases)
  const [searchMode, setSearchMode] = useState(() => {
    // If searchMode is passed from location.state, use the passed value; otherwise default to 'cases'
    return location.state?.searchMode || 'cases';
  });

  // State for search criteria (field layout consistent with old system)
  const [searchCriteria, setSearchCriteria] = useState({
    lastName: '',
    firstName: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    dateOfBirth: '',
    ssn: '',
    phoneNumber: ''
  });
  
  // State for search results and pagination
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle SSN formatting
    if (name === 'ssn') {
      const formatted = formatSSN(value);
      setSearchCriteria(prev => ({
        ...prev,
        [name]: formatted
      }));
      return;
    }
    
    setSearchCriteria(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // If initialQuery is passed from CaseSelector input, pre-fill lastName and immediately execute a search with that value
  useEffect(() => {
    if (location.state?.initialQuery) {
      const initialQuery = (location.state.initialQuery || '').trim();
      if (!initialQuery) {
        return;
      }

      setSearchCriteria(prev => ({
        ...prev,
        lastName: initialQuery
      }));
      setError(null);
      
      // Use initialQuery directly to call search, avoiding use of old state
      handleSearch(initialQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Reset search form
  const handleReset = () => {
    setSearchCriteria({
      lastName: '',
      firstName: '',
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      dateOfBirth: '',
      ssn: '',
      phoneNumber: ''
    });
    setSearchResults([]);
  };

  // Helper function to map role_id to human-readable role (aligned with CasesTab.js)
  const getPersonRole = (roleId) => {
    if (!roleId) return 'Unknown Role';
    
    const roles = {
      1: 'Alleged Co-victim',
      2: 'Alleged Offender',
      3: 'Caregiver',
      4: 'Other',
      5: 'Witness'
    };
    
    return roles[roleId] || 'Unknown Role';
  };

  // Handle search
  const handleSearch = async (overrideLastName, overrideSearchMode) => {
    const lastNameToSearch = (overrideLastName ?? searchCriteria.lastName)?.trim() || '';
    const firstNameToSearch = searchCriteria.firstName?.trim() || '';
    const currentSearchMode = overrideSearchMode ?? searchMode;

    // Validate at least one search criterion is provided
    const hasSearchCriteria = 
      lastNameToSearch ||
      firstNameToSearch ||
      searchCriteria.dateOfBirth?.trim() ||
      searchCriteria.ssn?.trim() ||
      searchCriteria.streetAddress?.trim() ||
      searchCriteria.city?.trim() ||
      searchCriteria.state?.trim() ||
      searchCriteria.zip?.trim() ||
      searchCriteria.phoneNumber?.trim();

    if (!hasSearchCriteria) {
      setError("Please enter at least one search criterion");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Build API URL - use different endpoints based on what's provided
      // If lastName is provided, use /search/:lastName endpoint
      // If only firstName is provided, use /search-by-firstname/:firstName endpoint
      let apiUrl;
      const queryParams = [];
      
      if (lastNameToSearch) {
        // Use lastName search endpoint (primary)
        apiUrl = `${API_BASE_URL}/api/people/search/${encodeURIComponent(lastNameToSearch)}`;
        if (firstNameToSearch) {
          queryParams.push(`firstName=${encodeURIComponent(firstNameToSearch)}`);
        }
      } else if (firstNameToSearch) {
        // Use firstName search endpoint (when only firstName is provided)
        apiUrl = `${API_BASE_URL}/api/people/search-by-firstname/${encodeURIComponent(firstNameToSearch)}`;
      } else {
        // Should not reach here due to validation, but handle it anyway
        setError("Please enter at least a last name or first name to search");
        setLoading(false);
        return;
      }
      
      if (queryParams.length > 0) {
        apiUrl += `?${queryParams.join('&')}`;
      }
      
      // Make direct API call to search endpoint
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Search API response:', data);
      
      // Filter results if other criteria are provided (firstName is now handled by backend)
      let filteredResults = [...data];
      
      // Note: firstName filtering is now done by the backend API
      // Only filter by other criteria that are not supported by backend
      
      if (searchCriteria.dateOfBirth) {
        const searchDate = new Date(searchCriteria.dateOfBirth).toISOString().split('T')[0];
        filteredResults = filteredResults.filter(person => {
          if (!person.date_of_birth) return false;
          const personDob = new Date(person.date_of_birth).toISOString().split('T')[0];
          return personDob === searchDate;
        });
      }
      
      if (searchCriteria.ssn) {
        // Convert formatted SSN to unformatted for comparison
        const searchSSN = unformatSSN(searchCriteria.ssn);
        filteredResults = filteredResults.filter(person => {
          if (!person.ssn) return false;
          // Compare unformatted SSNs
          const personSSN = unformatSSN(person.ssn);
          return personSSN === searchSSN;
        });
      }
      
      // For each person, get their cases / build rows based on current mode
      const enhancedResults = await Promise.all(
        filteredResults.map(async (person) => {
          try {
            const personBase = {
              id: person.person_id.toString(),
              firstName: person.first_name || '',
              lastName: person.last_name || '',
              alias: '', // No nick_name field in database
              dateOfBirth: person.date_of_birth || '',
            };

            // If the person has case_person data already, use it
            if (person.case_person && person.case_person.length > 0) {
              if (currentSearchMode === 'people') {
                const caseInfo = person.case_person[0];
                return {
                  ...personBase,
                  caseId: caseInfo?.case_id?.toString() || '',
                  caseNumber: caseInfo?.cac_case?.case_number || '',
                  role: getPersonRole(caseInfo?.role_id),
                };
              } else {
                // In cases mode, one person may correspond to multiple case records
                return person.case_person.map(cp => ({
                  id: `${person.person_id}-${cp.case_id}`,
                  personName: `${person.last_name || ''}, ${person.first_name || ''}`.trim(),
                  alias: '',
                  caseId: cp.case_id?.toString() || '',
                  caseNumber: cp.cac_case?.case_number || '',
                  role: getPersonRole(cp.role_id),
                  dateOfBirth: person.date_of_birth || '',
                }));
              }
            }
            
            // If no case_person data, try to query case separately
            const caseResponse = await fetch(`${API_BASE_URL}/api/people/case/${person.person_id}`);
            
            if (caseResponse.ok) {
              const caseData = await caseResponse.json();
              console.log(`Case data for person ${person.person_id}:`, caseData);
              
              if (caseData && caseData.length > 0) {
                if (currentSearchMode === 'people') {
                  const caseInfo = caseData[0];
                  return {
                    ...personBase,
                    caseId: caseInfo.case_id?.toString() || '',
                    caseNumber: caseInfo.cac_case?.case_number || '',
                    role: getPersonRole(caseInfo.role_id),
                  };
                } else {
                  return caseData.map(cp => ({
                    id: `${person.person_id}-${cp.case_id}`,
                    personName: `${person.last_name || ''}, ${person.first_name || ''}`.trim(),
                    alias: '',
                    caseId: cp.case_id?.toString() || '',
                    caseNumber: cp.cac_case?.case_number || '',
                    role: getPersonRole(cp.role_id),
                    dateOfBirth: person.date_of_birth || '',
                  }));
                }
              }
            }
            
            // If no case data found, return person without case info
            if (currentSearchMode === 'people') {
              return {
                ...personBase,
                caseId: '',
                caseNumber: '',
                role: 'Unknown Role',
              };
            } else {
              // In cases mode, if there's no case, don't return this person
              return null;
            }
          } catch (err) {
            console.error(`Error processing case info for person ${person.person_id}:`, err);
            
            if (currentSearchMode === 'people') {
              // Return basic person info if case info processing fails
              return {
                id: person.person_id.toString(),
                firstName: person.first_name || '',
                lastName: person.last_name || '',
                alias: '',
                caseId: '',
                caseNumber: '',
                role: 'Unknown Role',
                dateOfBirth: person.date_of_birth || '',
              };
            } else {
              return null;
            }
          }
        })
      );
      
      // Flatten arrays in cases mode and filter null
      const flattened =
        currentSearchMode === 'cases'
          ? enhancedResults.flat().filter(Boolean)
          : enhancedResults.filter(Boolean);

      console.log('Processed search results:', flattened);
      setSearchResults(flattened);
      setPage(0); // Reset to first page
    } catch (err) {
      console.error('Search error:', err);
      setError(`Failed to search for people: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press in search fields
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle clicking on a person name
  const handlePersonClick = (person) => {
    console.log('Person clicked:', person);
    navigate('/PersonBio', { 
      state: { personId: person.id } 
    });
  };

  // Handle clicking on a case
  const handleCaseClick = (caseId, caseNumber) => {
    if (!caseId) {
      console.log('No case ID available for this person');
      return;
    }
    
    console.log(`Navigating to case ${caseNumber} (ID: ${caseId})`);
    // Set the current case in context
    setCurrentCase(caseId);
    // Navigate to the General tab
    navigate('/CaseGeneral');
  };

  // Pagination handlers
  const handleChangePage = (newPage) => {
    setPage(newPage);
  };
  
  // Get current page of data
  const paginatedResults = searchResults.slice(
    page * rowsPerPage, 
    page * rowsPerPage + rowsPerPage
  );
  
  // Calculate pagination info
  const startIndex = searchResults.length > 0 ? page * rowsPerPage + 1 : 0;
  const endIndex = Math.min((page + 1) * rowsPerPage, searchResults.length);
  const totalItems = searchResults.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  // Format date for display (convert ISO to MM/DD/YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <Box sx={{ p: 2 }} data-aoi="SearchPerson Container">
      <Typography variant="h5" gutterBottom data-aoi="SearchPerson Header">
        Search
      </Typography>

      {/* Top toggle: Search People / Search Cases */}
      <Box sx={{ mb: 2 }}>
        <RadioGroup
          row
          name="searchMode"
          value={searchMode}
          onChange={(e) => {
            const newMode = e.target.value;
            setSearchMode(newMode);
            setPage(0);
            
            // If search criteria already exists (at least lastName), automatically execute search after mode switch
            if (searchCriteria.lastName?.trim()) {
              // Execute search directly with new mode
              handleSearch(undefined, newMode);
            } else {
              // If no search criteria, clear results
              setSearchResults([]);
            }
          }}
        >
          <FormControlLabel value="people" control={<Radio />} label="Search People" />
          <FormControlLabel value="cases" control={<Radio />} label="Search Cases" />
        </RadioGroup>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }} data-aoi="Search Form Paper">
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={() => handleSearch()}
            disabled={loading}
            sx={{ 
              mr: 2,
              bgcolor: '#01665e',
              color: 'white',
              '&:hover': {
                bgcolor: '#003C30'
              }
            }}
            data-aoi="Search Execute Button"
          >
            Search
          </Button>
          
          <Button
            variant="contained"
            startIcon={<ResetIcon />}
            onClick={handleReset}
            sx={{ 
              mr: 2,
              bgcolor: '#01665e',
              color: 'white',
              '&:hover': {
                bgcolor: '#003C30'
              }
            }}
            data-aoi="Search Reset Button"
          >
            Reset
          </Button>
          
          <Button
            variant="contained"
            onClick={() => navigate('/PersonBio', { state: { createMode: true } })}
            sx={{ 
              bgcolor: '#01665e',
              color: 'white',
              '&:hover': {
                bgcolor: '#003C30'
              }
            }}
            data-aoi="Add Person Button"
          >
            Add person
          </Button>
        </Box>
        
        <Typography variant="h6" gutterBottom data-aoi="Search Prompt">
          Please enter search criteria below
        </Typography>
        
        <Grid container spacing={3}>
          {/* Left column: Last Name / First Name / Street Address / City, State, Zip */}
          <Grid item xs={12} md={6}>
            {/* Last Name */}
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              value={searchCriteria.lastName}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              variant="outlined"
              required
              inputProps={{ 'data-aoi': 'Search LastName Input' }}
            />
            
            {/* First Name */}
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={searchCriteria.firstName}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                variant="outlined"
                inputProps={{ 'data-aoi': 'Search FirstName Input' }}
              />
            </Box>
            
            {/* Street Address */}
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Street Address"
                name="streetAddress"
                value={searchCriteria.streetAddress}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                variant="outlined"
                inputProps={{ 'data-aoi': 'Search StreetAddress Input' }}
              />
            </Box>
            
            {/* City, State, Zip */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <TextField
                label="City"
                name="city"
                value={searchCriteria.city}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                variant="outlined"
                inputProps={{ 'data-aoi': 'Search City Input' }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="State"
                name="state"
                value={searchCriteria.state}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                variant="outlined"
                inputProps={{ 'data-aoi': 'Search State Input' }}
                sx={{ width: 100 }}
              />
              <TextField
                label="Zip"
                name="zip"
                value={searchCriteria.zip}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                variant="outlined"
                inputProps={{ 'data-aoi': 'Search Zip Input' }}
                sx={{ width: 120 }}
              />
            </Box>
          </Grid>
          
          {/* Right column: Date of Birth / Social Security Number / Phone Number */}
          <Grid item xs={12} md={6}>
            {/* Date of Birth */}
            <TextField
              fullWidth
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={searchCriteria.dateOfBirth}
              onChange={handleInputChange}
              variant="outlined"
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{ 'data-aoi': 'Search DOB Input' }}
            />
            
            {/* Social Security Number */}
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Social Security Number"
                name="ssn"
                value={searchCriteria.ssn || ''}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                variant="outlined"
                placeholder="___-__-____"
                inputProps={{ 
                  'data-aoi': 'Search SSN Input',
                  maxLength: 11,
                  pattern: '[0-9]{3}-[0-9]{2}-[0-9]{4}'
                }}
              />
            </Box>
            
            {/* Phone Number */}
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={searchCriteria.phoneNumber}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                variant="outlined"
                inputProps={{ 'data-aoi': 'Search Phone Number Input' }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} data-aoi="Search Error Alert">
          {error}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3 }} data-aoi="Results Paper">
        <Typography variant="h6" gutterBottom data-aoi="Results Header">
          {searchMode === 'people' ? 'Search People Results' : 'Search Cases Results'}
        </Typography>
        
        <TableContainer sx={{ maxHeight: 400, mb: 2 }} data-aoi="Results Table Container">
        <Table stickyHeader data-aoi="Results Table">
        <TableHead>
          <TableRow data-aoi="Results Table Header Row">
            {searchMode === 'people' ? (
              <>
                <TableCell data-aoi="Results Table Header Name">Person's Name</TableCell>
                <TableCell data-aoi="Results Table Header Alias">Alias</TableCell>
                <TableCell data-aoi="Results Table Header Case">CAC Case</TableCell>
                <TableCell data-aoi="Results Table Header Role">Role on Case</TableCell>
                <TableCell data-aoi="Results Table Header DOB">Date of Birth</TableCell>
              </>
            ) : (
              <>
                <TableCell data-aoi="Results Table Header Case">CAC Case</TableCell>
                <TableCell data-aoi="Results Table Header Name">Person's Name</TableCell>
                <TableCell data-aoi="Results Table Header Alias">Alias</TableCell>
                <TableCell data-aoi="Results Table Header Role">Role on Case</TableCell>
                <TableCell data-aoi="Results Table Header DOB">Date of Birth</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
              {loading ? (
                <TableRow data-aoi="Results Loading Row">
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={40} sx={{ my: 2 }} data-aoi="Results Loading Spinner" />
                    <Typography variant="body2" display="block" data-aoi="Results Loading Text">
                      Searching...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedResults.length > 0 ? (
              paginatedResults.map((row, index) => (
              <TableRow 
                key={row.id} 
                sx={{ bgcolor: index % 2 !== 0 ? 'background.default' : 'white' }}
                data-aoi="Results Row"
              >
                {searchMode === 'people' ? (
                  <>
                    <TableCell data-aoi="Result Person Name">
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => handlePersonClick(row)}
                        underline="hover"
                        sx={{ cursor: 'pointer' }}
                        data-aoi="Result Person Link"
                      >
                        {`${row.lastName}, ${row.firstName}`}
                      </Link>
                    </TableCell>
                    <TableCell data-aoi="Result Alias Cell">{row.alias || ''}</TableCell>
                    <TableCell data-aoi="Result Case Cell">
                      {row.caseId ? (
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => handleCaseClick(row.caseId, row.caseNumber)}
                          underline="hover"
                          color="primary"
                          sx={{ cursor: 'pointer' }}
                          data-aoi="Result Case Link"
                        >
                          {row.caseNumber || row.caseId}
                        </Link>
                      ) : (
                        'No case assigned'
                      )}
                    </TableCell>
                    <TableCell data-aoi="Result Role Cell">{row.role}</TableCell>
                    <TableCell data-aoi="Result DOB Cell">{formatDate(row.dateOfBirth)}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell data-aoi="Result Case Cell">
                      {row.caseId ? (
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => handleCaseClick(row.caseId, row.caseNumber)}
                          underline="hover"
                          color="primary"
                          sx={{ cursor: 'pointer' }}
                          data-aoi="Result Case Link"
                        >
                          {row.caseNumber || row.caseId}
                        </Link>
                      ) : (
                        'No case assigned'
                      )}
                    </TableCell>
                    <TableCell data-aoi="Result Person Name">
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() =>
                          handlePersonClick({
                            id: row.id.split('-')[0],
                            firstName: row.firstName,
                            lastName: row.lastName,
                          })
                        }
                        underline="hover"
                        sx={{ cursor: 'pointer' }}
                        data-aoi="Result Person Link"
                      >
                        {row.personName || `${row.lastName || ''}, ${row.firstName || ''}`}
                      </Link>
                    </TableCell>
                    <TableCell data-aoi="Result Alias Cell">{row.alias || ''}</TableCell>
                    <TableCell data-aoi="Result Role Cell">{row.role}</TableCell>
                    <TableCell data-aoi="Result DOB Cell">{formatDate(row.dateOfBirth)}</TableCell>
                  </>
                )}
              </TableRow>
            ))
              ) : (
                <TableRow data-aoi="Results Empty Row">
                  <TableCell colSpan={6} align="center">
                    {searchCriteria.lastName || searchCriteria.firstName || 
                     searchCriteria.dateOfBirth || searchCriteria.phoneNumber ? 
                      'No matching results found' : (searchMode === 'people'
                        ? 'Enter search criteria to find people'
                        : 'Enter search criteria to find cases')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {paginatedResults.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} data-aoi="Pagination Section">
            <Box sx={{ display: "flex" }}>
              <Button 
                sx={{ minWidth: 40, height: 40, border: '1px solid #ccc', borderRadius: 0 }}
                onClick={() => handleChangePage(0)}
                disabled={page === 0}
                data-aoi="Pagination First Page Button"
              >
                <KeyboardDoubleArrowLeftIcon fontSize="small" />
              </Button>
              <Button 
                sx={{ minWidth: 40, height: 40, border: '1px solid #ccc', borderRadius: 0 }}
                onClick={() => handleChangePage(page - 1)}
                disabled={page === 0}
                data-aoi="Pagination Prev Page Button"
              >
                <KeyboardArrowLeftIcon fontSize="small" />
              </Button>
              
              {/* Page numbers */}
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const pageNum = page < 2 ? i : page - 2 + i;
                if (pageNum >= totalPages) return null;
                
                return (
                  <Button 
                    key={pageNum}
                    sx={{ 
                      minWidth: 40, 
                      height: 40, 
                      border: '1px solid #ccc', 
                      borderRadius: 0,
                      bgcolor: pageNum === page ? '#01665e' : 'white',
                      color: pageNum === page ? 'white' : 'inherit',
                      '&:hover': {
                        bgcolor: pageNum === page ? '#003C30' : '#f5f5f5'
                      }
                    }}
                    onClick={() => handleChangePage(pageNum)}
                    data-aoi={`Pagination Page ${pageNum + 1} Button`}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
              
              <Button 
                sx={{ minWidth: 40, height: 40, border: '1px solid #ccc', borderRadius: 0 }}
                onClick={() => handleChangePage(page + 1)}
                disabled={page >= totalPages - 1}
                data-aoi="Pagination Next Page Button"
              >
                <KeyboardArrowRightIcon fontSize="small" />
              </Button>
              <Button 
                sx={{ minWidth: 40, height: 40, border: '1px solid #ccc', borderRadius: 0 }}
                onClick={() => handleChangePage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                data-aoi="Pagination Last Page Button"
              >
                <KeyboardDoubleArrowRightIcon fontSize="small" />
              </Button>
            </Box>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }} data-aoi="Pagination Info">
              {totalItems > 0 ? `${startIndex} - ${endIndex} of ${totalItems} items` : 'No items'}
              <IconButton size="small" sx={{ ml: 1 }} onClick={handleSearch} disabled={loading} data-aoi="Pagination Refresh Button">
                <RefreshIcon />
              </IconButton>
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default SearchPerson;
