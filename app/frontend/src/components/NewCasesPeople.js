import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogContent,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate, useLocation } from 'react-router-dom';
import Lookup from './Lookup';
import ConfirmationModal from './ConfirmationModal';
import { peopleApi } from '../services/api';
import { formatSSN } from '../utils/ssnFormatter';

const NewCasesPeople = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get case ID and initial person from location state
  const { caseId, initialPerson } = location.state || {};
  
  // States for people and UI
  const [victims, setVictims] = useState([]);
  const [otherPeople, setOtherPeople] = useState([]);
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [addingPersonType, setAddingPersonType] = useState(null); // 'victim' or 'other'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState(null);
  
  // Effect to initialize with the initial person (if provided)
  useEffect(() => {
    if (initialPerson) {
      // Format the initial person to match our expected format
      const formattedPerson = {
        person_id: initialPerson.person_id,
        first_name: initialPerson.firstName || '',
        last_name: initialPerson.lastName || '',
        date_of_birth: initialPerson.dateOfBirth || '',
        ssn: initialPerson.ssn || '',
        role_id: 1, // Default role for initial person is Alleged Co-victim
        isNew: true // Flag to identify newly added people
      };
      
      setVictims([formattedPerson]);
    }
  }, [initialPerson]);
  
  // Open lookup modal for adding a person
  const handleAddPerson = (type) => {
    setAddingPersonType(type);
    setLookupModalOpen(true);
  };
  
  // Close lookup modal
  const handleCloseLookupModal = () => {
    setLookupModalOpen(false);
  };
  
  // Handle person selection from lookup
  const handlePersonSelect = (person) => {
    // Format the selected person
    const formattedPerson = {
      person_id: person.person_id,
      first_name: person.firstName || person.first_name || '',
      last_name: person.lastName || person.last_name || '',
      date_of_birth: person.dateOfBirth || person.date_of_birth || '',
      ssn: person.ssn || '',
      role_id: addingPersonType === 'victim' ? 1 : 5, // 1 for Alleged Co-victim, 5 for Witness
      isNew: true // Flag to identify newly added people
    };
    
    // Add the person to the appropriate list
    if (addingPersonType === 'victim') {
      setVictims(prev => [...prev, formattedPerson]);
    } else {
      setOtherPeople(prev => [...prev, formattedPerson]);
    }
    
    // Close the lookup modal
    handleCloseLookupModal();
  };
  
  // Handle edit person
  const handleEditPerson = (person) => {
    // Navigate to PersonBio page with the person ID
    navigate('/PersonBio', { 
      state: { 
        personId: person.person_id,
        returnTo: '/NewCasesPeople',
        returnState: { caseId, initialPerson }
      } 
    });
  };
  
  // Open delete confirmation modal
  const handleDeleteClick = (person, isVictim) => {
    setPersonToDelete({ person, isVictim });
    setConfirmDeleteOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!personToDelete) return;
    
    try {
      setLoading(true);
      
      const { person, isVictim } = personToDelete;
      
      // If the person is already associated with the case in the database
      if (caseId && !person.isNew) {
        await peopleApi.removePersonFromCase(person.person_id, caseId);
      }
      
      // Remove from local state
      if (isVictim) {
        setVictims(prev => prev.filter(p => p.person_id !== person.person_id));
      } else {
        setOtherPeople(prev => prev.filter(p => p.person_id !== person.person_id));
      }
      
      setConfirmDeleteOpen(false);
      setPersonToDelete(null);
    } catch (err) {
      console.error('Failed to delete person:', err);
      setError('Failed to remove person from case');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle cancel delete
  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
    setPersonToDelete(null);
  };
  
  // Handle save and open case
  const handleSaveAndOpen = async () => {
    if (!caseId) {
      setError('No case ID provided. Cannot save people to case.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Get CAC ID from the first victim (should be available from the case creation)
      const cacId = victims.length > 0 && victims[0].cac_id;
      
      // Associate all new people with the case
      const allPeople = [...victims, ...otherPeople];
      const newPeoplePromises = allPeople
        .filter(person => person.isNew)
        .map(person => 
          peopleApi.associatePersonWithCase(
            person.person_id, 
            caseId, 
            cacId || 1 // Fallback to CAC ID 1 if not available
          )
        );
      
      await Promise.all(newPeoplePromises);
      
      // Navigate to CaseCreationSummary (for "Save and Open Case(s)" flow)
      navigate('/CaseCreationSummary', {
        state: {
          caseId: caseId, // Pass the case_id
          selectedCacId: selectedCacId
          // Do NOT pass victims/otherPeople - CaseCreationSummary will load from database if needed
        }
      });
    } catch (err) {
      console.error('Failed to save people to case:', err);
      setError('Failed to save people to case');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    navigate('/');
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          New Case - People
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAndOpen}
            disabled={loading || victims.length === 0}
          >
            {loading ? <CircularProgress size={24} sx={{ mr: 1 }} /> : null}
            Save and Open Case(s)
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancel}
          >
            CANCEL
          </Button>
        </Box>
        
        {/* Alleged Victims/Clients Section */}
        <Box sx={{ mb: 4 }}>
          {/* Header Container - independent of table, contains Add button and title */}
          <Box sx={{ 
            border: '1px solid #d1d5db',
            borderBottom: 'none',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            bgcolor: '#f5f5f5',
            p: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
              Alleged Victims/Clients
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleAddPerson('victim')}
              sx={{ 
                textTransform: 'none',
                borderColor: '#d1d5db',
                backgroundColor: '#ffffff',
                alignSelf: 'flex-start',
                '&:hover': {
                  borderColor: '#9ca3af',
                  backgroundColor: '#f9fafb'
                }
              }}
            >
              Add
            </Button>
          </Box>
          {/* Table Container - only contains table element */}
          <TableContainer sx={{ 
            border: '1px solid #d1d5db',
            borderTop: 'none',
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px'
          }}>
              <Table 
                size="small"
                sx={{
                  '& .MuiTableCell-root': {
                    border: '1px solid #d1d5db',
                  }
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell width="15%" sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}></TableCell>
                    <TableCell width="30%" sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>First Name</TableCell>
                    <TableCell width="30%" sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>Last Name</TableCell>
                    <TableCell width="25%" sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>SSN</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {victims.length > 0 ? (
                    victims.map((victim) => (
                      <TableRow key={victim.person_id}>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEditPerson(victim)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(victim, true)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell>{victim.first_name}</TableCell>
                        <TableCell>{victim.last_name}</TableCell>
                        <TableCell>{victim.ssn ? formatSSN(victim.ssn) : ''}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No victims/clients added
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        
        {/* Other People Section */}
        <Box sx={{ mb: 4 }}>
          {/* Header Container - independent of table, contains Add button and title */}
          <Box sx={{ 
            border: '1px solid #d1d5db',
            borderBottom: 'none',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            bgcolor: '#f5f5f5',
            p: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
              Other People
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleAddPerson('other')}
              sx={{ 
                textTransform: 'none',
                borderColor: '#d1d5db',
                backgroundColor: '#ffffff',
                alignSelf: 'flex-start',
                '&:hover': {
                  borderColor: '#9ca3af',
                  backgroundColor: '#f9fafb'
                }
              }}
            >
              Add
            </Button>
          </Box>
          {/* Table Container - only contains table element */}
          <TableContainer sx={{ 
            border: '1px solid #d1d5db',
            borderTop: 'none',
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px'
          }}>
              <Table 
                size="small"
                sx={{
                  '& .MuiTableCell-root': {
                    border: '1px solid #d1d5db',
                  }
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell width="15%" sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}></TableCell>
                    <TableCell width="30%" sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>First Name</TableCell>
                    <TableCell width="30%" sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>Last Name</TableCell>
                    <TableCell width="25%" sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>SSN</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {otherPeople.length > 0 ? (
                    otherPeople.map((person) => (
                      <TableRow key={person.person_id}>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEditPerson(person)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(person, false)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell>{person.first_name}</TableCell>
                        <TableCell>{person.last_name}</TableCell>
                        <TableCell>{person.ssn ? formatSSN(person.ssn) : ''}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No other people added
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
      
      {/* Person Lookup Modal */}
      <Dialog
        open={lookupModalOpen}
        onClose={handleCloseLookupModal}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            height: 'auto'
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Lookup 
            onPersonSelect={handlePersonSelect} 
            onClose={handleCloseLookupModal} 
          />
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        open={confirmDeleteOpen}
        title="Remove Person"
        message={`Are you sure you want to remove ${personToDelete?.person?.first_name} ${personToDelete?.person?.last_name} from this case?`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </Box>
  );
};

export default NewCasesPeople;