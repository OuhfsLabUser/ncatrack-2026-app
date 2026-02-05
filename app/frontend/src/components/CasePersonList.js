// src/components/CasePersonList.js
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
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useLocation } from 'react-router-dom';
import { peopleApi, casesApi } from '../services/api';
import { useCase } from '../context/CaseContext';
import { formatSSN } from '../utils/ssnFormatter';

const CasePersonList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCase, setCurrentCase } = useCase();

  // Get case data from location state (passed from NewCase)
  const caseData = location.state?.caseData || null;
  const selectedCacId = location.state?.selectedCacId || null;
  const caseId = location.state?.caseId || location.state?.caseData?.case_id || null;
  
  // State to track case_id
  const [currentCaseId, setCurrentCaseId] = useState(caseId);

  // State for victims/clients
  const [victims, setVictims] = useState([]);
  const [otherPeople, setOtherPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update case_id from location state if available
  useEffect(() => {
    const newCaseId = location.state?.caseId || location.state?.caseData?.case_id;
    if (newCaseId) {
      console.log('📥 CasePersonList: Received caseId from location.state:', newCaseId);
      // Ensure caseId is a number
      const caseIdNum = typeof newCaseId === 'string' ? parseInt(newCaseId, 10) : newCaseId;
      if (!isNaN(caseIdNum)) {
        setCurrentCaseId(caseIdNum);
      } else {
        console.error('❌ Invalid caseId received:', newCaseId);
      }
    } else {
      console.log('⚠️ CasePersonList: No caseId in location.state');
    }
  }, [location.state?.caseId, location.state?.caseData?.case_id]);
  
  // Load victims and other people from database when caseId is available
  useEffect(() => {
    const loadPeopleFromDatabase = async () => {
      if (!currentCaseId) {
        // No case ID yet, clear lists
        setVictims([]);
        setOtherPeople([]);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all case_person records for this case from database
        const peopleData = await peopleApi.getPeopleByCaseId(currentCaseId);
        console.log('📊 CasePersonList: Loaded people from database for case:', currentCaseId);
        console.log('📊 CasePersonList: Raw API response:', JSON.stringify(peopleData, null, 2));
        
        if (!peopleData || peopleData.length === 0) {
          console.log('⚠️ CasePersonList: No people found for case:', currentCaseId);
          setVictims([]);
          setOtherPeople([]);
          return;
        }
        
        // Separate victims (role_id = 1) and other people (role_id != 1)
        const victimsList = (peopleData || []).filter(p => p.role_id === 1);
        const otherPeopleList = (peopleData || []).filter(p => p.role_id !== 1);
        
        console.log(`📊 CasePersonList: Found ${victimsList.length} victims and ${otherPeopleList.length} other people`);
        
        // Format data for display
        // API now returns first_name, last_name, ssn directly, and also in person object
        const formatPerson = (person) => {
          // Debug logging for first person
          if (person.person_id === peopleData[0]?.person_id) {
            console.log('🔍 CasePersonList: Formatting first person data:', {
              person_id: person.person_id,
              has_first_name: !!person.first_name,
              first_name_value: person.first_name,
              has_person_object: !!person.person,
              person_first_name: person.person?.first_name,
              has_last_name: !!person.last_name,
              last_name_value: person.last_name,
              has_ssn: !!person.ssn,
              ssn_value: person.ssn
            });
          }
          
          // Try direct fields first, then nested person object, then empty string
          // Handle null values explicitly
          const first_name = person.first_name ?? person.person?.first_name ?? '';
          const last_name = person.last_name ?? person.person?.last_name ?? '';
          const ssn = person.ssn ?? person.person?.ssn ?? '';
          
          const formatted = {
            person_id: person.person_id,
            first_name: first_name,
            last_name: last_name,
            ssn: ssn,
            role_id: person.role_id,
            relationship_id: person.relationship_id
          };
          
          // Debug logging for first person
          if (person.person_id === peopleData[0]?.person_id) {
            console.log('✅ CasePersonList: Formatted first person:', formatted);
          }
          
          return formatted;
        };
        
        const formattedVictims = victimsList.map(formatPerson);
        const formattedOtherPeople = otherPeopleList.map(formatPerson);
        
        console.log('📊 CasePersonList: Formatted victims:', formattedVictims);
        console.log('📊 CasePersonList: Formatted other people:', formattedOtherPeople);
        
        setVictims(formattedVictims);
        setOtherPeople(formattedOtherPeople);
      } catch (err) {
        console.error('Error loading people from database:', err);
        setError('Failed to load people from database. Please try again.');
        setVictims([]);
        setOtherPeople([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadPeopleFromDatabase();
  }, [currentCaseId]); // Reload whenever caseId changes

  // Handle add victim - navigate to NewCase page
  const handleAddVictim = () => {
    navigate('/NewCase', {
      state: {
        returnTo: '/CasePersonList',
        caseId: currentCaseId, // Pass the case_id (if exists)
        caseData: caseData ? { ...caseData, case_id: currentCaseId } : (currentCaseId ? { case_id: currentCaseId } : null),
        selectedCacId: selectedCacId,
        personType: 'victim',
        // Pass current lists to preserve them
        victims: victims,
        otherPeople: otherPeople
      }
    });
  };

  // Handle add other person - navigate to NewCase page
  const handleAddOtherPerson = () => {
    navigate('/NewCase', {
      state: {
        returnTo: '/CasePersonList',
        caseId: currentCaseId, // Pass the case_id (must exist for other people)
        caseData: caseData ? { ...caseData, case_id: currentCaseId } : (currentCaseId ? { case_id: currentCaseId } : null),
        selectedCacId: selectedCacId,
        personType: 'other',
        // Pass current lists to preserve them
        victims: victims,
        otherPeople: otherPeople
      }
    });
  };

  // Handle edit victim - navigate to PersonBio in edit mode or NewCase for temporary persons
  const handleEditVictim = (person) => {
    // Check if this is a temporary person (not yet saved to database)
    if (person.isTemporary && person.formData) {
      // For temporary persons, navigate to NewCase with form data pre-filled
      navigate('/NewCase', {
        state: {
          prefillFormData: person.formData,
          returnTo: '/CasePersonList',
          caseData: caseData,
          selectedCacId: selectedCacId,
          personType: 'victim',
          editMode: true,
          temporaryPersonId: person.person_id,
          // Pass current lists so we can update the correct person
          victims: victims,
          otherPeople: otherPeople
        }
      });
    } else {
      // For existing persons in database, navigate to PersonBio
      navigate('/PersonBio', {
        state: {
          personId: person.person_id,
          returnTo: '/CasePersonList',
          caseData: caseData,
          selectedCacId: selectedCacId,
          personType: 'victim',
          editMode: true,
          // Pass current lists so we can update the correct person
          victims: victims,
          otherPeople: otherPeople
        }
      });
    }
  };

  // Handle edit other person - navigate to OtherPeople or PersonBio
  const handleEditOtherPerson = (person) => {
    // For now, navigate to PersonBio for editing
    navigate('/PersonBio', {
      state: {
        personId: person.person_id,
        returnTo: '/CasePersonList',
        caseData: caseData,
        selectedCacId: selectedCacId,
        personType: 'other',
        editMode: true,
        // Pass current lists so we can update the correct person
        victims: victims,
        otherPeople: otherPeople
      }
    });
  };

  // Handle remove victim - delete from database
  const handleRemoveVictim = async (personId) => {
    if (!currentCaseId) {
      setError('Case ID is missing. Cannot remove person.');
      return;
    }
    
    try {
      setLoading(true);
      // Delete case_person record from database
      await peopleApi.deletePersonFromCase(personId, currentCaseId);
      console.log('Deleted victim from database:', personId);
      
      // Reload from database (useEffect will trigger)
      // The lists will be automatically updated by the useEffect that loads from database
    } catch (err) {
      console.error('Error deleting victim:', err);
      setError(`Failed to remove victim: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle remove other person - delete from database
  const handleRemoveOtherPerson = async (personId) => {
    if (!currentCaseId) {
      setError('Case ID is missing. Cannot remove person.');
      return;
    }
    
    try {
      setLoading(true);
      // Delete case_person record from database
      await peopleApi.deletePersonFromCase(personId, currentCaseId);
      console.log('Deleted other person from database:', personId);
      
      // Reload from database (useEffect will trigger)
      // The lists will be automatically updated by the useEffect that loads from database
    } catch (err) {
      console.error('Error deleting other person:', err);
      setError(`Failed to remove person: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle save and open case(s)
  const handleSaveAndOpen = () => {
    // Final validation: ensure caseId exists and we have at least one victim
    if (!currentCaseId) {
      setError('Case ID is missing. Cannot proceed to case summary. Please ensure at least one victim has been created and saved to the database.');
      return;
    }
    
    if (victims.length === 0) {
      setError('At least one Alleged Victim/Client is required. Please add a victim first.');
      return;
    }
    
    // All data is already in database, just navigate to summary
    navigate('/CaseCreationSummary', {
      state: {
        caseId: currentCaseId, // Pass the case_id (must exist at this point)
        selectedCacId: selectedCacId
        // Do NOT pass victims/otherPeople - CaseCreationSummary will load from database if needed
      }
    });
  };

  // Handle cancel
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      navigate('/');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '20px' }}>
      <Paper elevation={3} sx={{ p: 4, my: 4 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mb: 4 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAndOpen}
            disabled={victims.length === 0}
          >
            Save and Open Case(s)
          </Button>
          <Button
            variant="contained"
            onClick={handleCancel}
            sx={{
              bgcolor: '#dc3545',
              color: 'white',
              '&:hover': {
                bgcolor: '#c82333'
              }
            }}
          >
            Cancel
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
              onClick={handleAddVictim}
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
          <TableContainer 
            component={Paper}
            sx={{ 
              border: '1px solid #d1d5db',
              borderTop: 'none',
              borderBottomLeftRadius: '4px',
              borderBottomRightRadius: '4px',
              '& .MuiPaper-root': {
                boxShadow: 'none'
              }
            }}
          >
            <Table 
              size="small"
              sx={{
                tableLayout: 'fixed',
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                '& .MuiTableCell-root': {
                  border: '1px solid #d1d5db',
                }
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', width: '170px', bgcolor: '#f5f5f5' }}></TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', width: '170px', bgcolor: '#f5f5f5' }}></TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>First Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>Last Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>SSN</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {victims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No victims/clients added yet. Click "Add" to add one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  victims.map((victim) => (
                    <TableRow key={victim.person_id} hover>
                      <TableCell align="center" sx={{ width: '170px' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditVictim(victim)}
                          sx={{
                            borderColor: '#d1d5db',
                            color: '#374151',
                            backgroundColor: 'white',
                            textTransform: 'none',
                            fontSize: '0.875rem',
                            '&:hover': {
                              backgroundColor: '#f3f4f6',
                              borderColor: '#9ca3af',
                            },
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                      <TableCell align="center" sx={{ width: '170px' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleRemoveVictim(victim.person_id)}
                          sx={{
                            borderColor: '#d1d5db',
                            color: '#374151',
                            backgroundColor: 'white',
                            textTransform: 'none',
                            fontSize: '0.875rem',
                            '&:hover': {
                              backgroundColor: '#f3f4f6',
                              borderColor: '#9ca3af',
                            },
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                      <TableCell align="center">{victim.first_name || 'N/A'}</TableCell>
                      <TableCell align="center">{victim.last_name || 'N/A'}</TableCell>
                      <TableCell align="center">{victim.ssn ? formatSSN(victim.ssn) : 'N/A'}</TableCell>
                    </TableRow>
                  ))
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
              onClick={handleAddOtherPerson}
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
          <TableContainer 
            component={Paper}
            sx={{ 
              border: '1px solid #d1d5db',
              borderTop: 'none',
              borderBottomLeftRadius: '4px',
              borderBottomRightRadius: '4px',
              '& .MuiPaper-root': {
                boxShadow: 'none'
              }
            }}
          >
            <Table 
              size="small"
              sx={{
                tableLayout: 'fixed',
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                '& .MuiTableCell-root': {
                  border: '1px solid #d1d5db',
                }
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', width: '170px', bgcolor: '#f5f5f5' }}></TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', width: '170px', bgcolor: '#f5f5f5' }}></TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>First Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>Last Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>SSN</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {otherPeople.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No other people added yet. Click "Add" to add one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  otherPeople.map((person) => (
                    <TableRow key={person.person_id} hover>
                      <TableCell align="center" sx={{ width: '170px' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditOtherPerson(person)}
                          sx={{
                            borderColor: '#d1d5db',
                            color: '#374151',
                            backgroundColor: 'white',
                            textTransform: 'none',
                            fontSize: '0.875rem',
                            '&:hover': {
                              backgroundColor: '#f3f4f6',
                              borderColor: '#9ca3af',
                            },
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                      <TableCell align="center" sx={{ width: '170px' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleRemoveOtherPerson(person.person_id)}
                          sx={{
                            borderColor: '#d1d5db',
                            color: '#374151',
                            backgroundColor: 'white',
                            textTransform: 'none',
                            fontSize: '0.875rem',
                            '&:hover': {
                              backgroundColor: '#f3f4f6',
                              borderColor: '#9ca3af',
                            },
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                      <TableCell align="center">{person.first_name || 'N/A'}</TableCell>
                      <TableCell align="center">{person.last_name || 'N/A'}</TableCell>
                      <TableCell align="center">{person.ssn ? formatSSN(person.ssn) : 'N/A'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

    </Box>
  );
};

export default CasePersonList;

