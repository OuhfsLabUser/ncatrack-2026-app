import React, { useState, useEffect } from "react";
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
  Checkbox,
  IconButton,
  CircularProgress,
  Alert
} from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { useNavigate } from 'react-router-dom';
import { peopleApi } from "../services/api";
import PersonProfile from "./PersonProfile"; 

function Lookup({ onPersonSelect, onClose, currentCaseId, returnTo, initialSearchTerm, initialFirstName, autoSearch }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  
  // Add states for PersonProfile dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  
  // Auto-search when component mounts if autoSearch is true
  useEffect(() => {
    if (autoSearch && (searchTerm.trim() || initialFirstName)) {
      handleSearch();
    }
  }, []); // Only run on mount
  
  const handleSearch = async () => {
    // If we have both firstName and lastName, use searchByName
    // Otherwise, use searchByLastName
    if (!searchTerm.trim() && !initialFirstName) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let data;
      if (initialFirstName && searchTerm.trim()) {
        // Search by both first name and last name
        data = await peopleApi.searchByName(initialFirstName, searchTerm.trim());
      } else if (searchTerm.trim()) {
        // Search by last name only
        data = await peopleApi.searchByLastName(searchTerm.trim());
      } else {
        data = [];
      }
      setSearchResults(data);
      setPage(0); // Reset to first page
    } catch (err) {
      setError("Failed to search people. Please try again.");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNoMatchFound = () => {
    // Close the lookup modal
    if (onClose) {
      onClose();
    }
    
    // If currentCaseId exists, navigate to AddNewPerson page to add a new person to the current case
    // If currentCaseId doesn't exist (e.g., creating a new case), just close the modal
    // and let the user fill in the person information on the current page (NewCase)
    if (currentCaseId) {
      navigate('/AddNewPerson', {
        state: {
          caseId: currentCaseId,
          returnTo: returnTo || '/CasePeople'
        }
      });
    }
    // If no currentCaseId, just close the modal - user can fill in person info on NewCase page
  };

  const handleSelect = (person) => {
    if (onPersonSelect) {
      // Make sure we're passing all the data the NewCase form needs
      const personData = {
        person_id: person.person_id,
        first_name: person.first_name,
        middle_name: person.middle_name,
        last_name: person.last_name,
        date_of_birth: person.date_of_birth,
        gender: person.gender,
        prior_convictions: person.prior_convictions,
        convicted_against_children: person.convicted_against_children,
        sex_offender: person.sex_offender,
        sex_predator: person.sex_predator
      };
      
      onPersonSelect(personData);
    }
  };

  const handleView = async (person) => {
    try {
      setSelectedPerson(person);
 
      setViewDialogOpen(true);
    } catch (err) {
      console.error("Error viewing person details:", err);
      setError("Failed to load person details. Please try again.");
    }
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
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, searchResults.length);
  const totalItems = searchResults.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  return (
    <Box sx={{ p: 2, overflow: "hidden" }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 'normal' }}>
        {autoSearch ? 'Duplicate Names Found' : 'Lookup Person'}
      </Typography>
      
      <Box sx={{ display: "flex", mb: 2, alignItems: "flex-end" }}>
        <Typography variant="body1" sx={{ mr: 2, fontWeight: 'bold' }}>
          Last Name
        </Typography>
        <TextField 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, mr: 2 }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleSearch}
          sx={{ mr: 1, textTransform: 'uppercase' }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Search"}
        </Button>
        <Button
          variant="contained"
          onClick={handleNoMatchFound}
          sx={{ mr: 1, bgcolor: '#d32f2f', textTransform: 'uppercase', '&:hover': { bgcolor: '#b71c1c' } }}
        >
          No Match Found
        </Button>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ bgcolor: '#d32f2f', textTransform: 'uppercase', '&:hover': { bgcolor: '#b71c1c' } }}
        >
          Close
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ maxHeight: 400, mb: 2 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={100}></TableCell>
              <TableCell width={100}></TableCell>
              <TableCell>Last Name</TableCell>
              <TableCell>First Name</TableCell>
              <TableCell>Middle Name</TableCell>
              <TableCell>Alias</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : paginatedResults.length > 0 ? (
              paginatedResults.map((person, index) => (
                <TableRow key={person.person_id} sx={{ bgcolor: index % 2 !== 0 ? '#f5f5f5' : 'white' }}>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleSelect(person)}
                      sx={{ textTransform: 'none' }}
                    >
                      Select
                    </Button>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleView(person)}
                      sx={{ textTransform: 'none' }}
                    >
                      View
                    </Button>
                  </TableCell>
                  <TableCell>{person.last_name}</TableCell>
                  <TableCell>{person.first_name}</TableCell>
                  <TableCell>{person.middle_name}</TableCell>
                  <TableCell>
                    <Checkbox size="small" disabled />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {searchTerm ? "No results found" : "Enter a last name to search"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {paginatedResults.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex" }}>
            <Button 
              sx={{ minWidth: 40, height: 40, border: '1px solid #ccc', borderRadius: 0 }}
              onClick={() => handleChangePage(0)}
              disabled={page === 0}
            >
              <KeyboardDoubleArrowLeftIcon fontSize="small" />
            </Button>
            <Button 
              sx={{ minWidth: 40, height: 40, border: '1px solid #ccc', borderRadius: 0 }}
              onClick={() => handleChangePage(page - 1)}
              disabled={page === 0}
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
                    bgcolor: pageNum === page ? '#1976d2' : 'white',
                    color: pageNum === page ? 'white' : 'inherit'
                  }}
                  onClick={() => handleChangePage(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            
            <Button 
              sx={{ minWidth: 40, height: 40, border: '1px solid #ccc', borderRadius: 0 }}
              onClick={() => handleChangePage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <KeyboardArrowRightIcon fontSize="small" />
            </Button>
            <Button 
              sx={{ minWidth: 40, height: 40, border: '1px solid #ccc', borderRadius: 0 }}
              onClick={() => handleChangePage(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              <KeyboardDoubleArrowRightIcon fontSize="small" />
            </Button>
          </Box>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
            {totalItems > 0 ? `${startIndex} - ${endIndex} of ${totalItems} items` : 'No items'}
            <IconButton size="small" sx={{ ml: 1 }} onClick={handleSearch}>
              <RefreshIcon />
            </IconButton>
          </Typography>
        </Box>
      )}
      
      {/* Person Profile Dialog */}
      <PersonProfile 
        open={viewDialogOpen}
        person={selectedPerson}
        onClose={() => setViewDialogOpen(false)}
      />
    </Box>
  );
}

export default Lookup;