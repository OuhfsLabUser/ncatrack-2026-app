// src/components/PeopleInterface.js
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
  Checkbox,
  TextField,
  Container,
  Grid,
  CircularProgress,
  Alert,
  InputAdornment,
  Stack,
  Dialog,
  DialogContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCase } from '../context/CaseContext';
import { peopleApi, pickListsApi, casesApi } from '../services/api';
import Lookup from './Lookup';
import DocumentUploadSection from './DocumentUploadSection';

const PeopleInterface = () => {
  const navigate = useNavigate();
  const { currentCase } = useCase();
  
  // State for people associated with the case
  const [people, setPeople] = useState([]);
  const [filteredPeople, setFilteredPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [firstVictimPersonId, setFirstVictimPersonId] = useState(null);
  
  // Picklist mappings for Role and Relationship
  const [roleMap, setRoleMap] = useState({});
  const [relationshipMap, setRelationshipMap] = useState({});
  const [loadingMappings, setLoadingMappings] = useState(false);
  
  // Default Role mapping (aligned with CasesTab.js)
  const ROLE_MAP = {
    1: 'Alleged Co-victim',
    2: 'Alleged Offender',
    3: 'Caregiver',
    4: 'Other',
    5: 'Witness'
  };
  
  // Default Relationship mapping (aligned with CasesTab.js)
  const RELATIONSHIP_MAP = {
    1: 'Biological Parent',
    2: 'Adoptive Parent',
    3: 'Foster Parent',
    4: "Father's Boyfriend",
    5: "Father's Girlfriend",
    6: "Mother's boyfriend",
    7: "Mother's Girlfriend",
    8: 'Stepfather',
    9: 'Stepmother',
    10: 'Birth Father',
    11: 'Brother',
    12: 'Grandfather',
    13: 'Half-Brother',
    14: 'Half-Sister',
    15: 'Paternal Grandmother',
    16: 'Sister',
    17: 'Stepbrother',
    18: 'Uncle',
    19: 'Stranger/Unknown Offender',
    20: 'Stranger/Unknown Internet Crime',
    21: 'School Personnel or Volunteer',
    22: 'Coach/Sport Personnel or Volunteer',
    23: 'Religious Personnel or Volunteer',
    24: 'Medical Personnel',
    25: 'Daycare',
    26: 'Babysitter',
    27: 'Stranger',
    28: 'Unknown',
    29: 'Adopted Parent',
    30: 'Auntie',
    31: 'Birth Mother',
    32: 'Maternal Grandmother 2',
    33: 'Meeting Attendee',
    34: 'Neighbor',
    35: 'Other known person',
    36: 'Self',
    37: 'Teacher'
  };
  
  // Helper function to get display value from a map
  const getDisplayValue = (map, value) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    return map[numValue] || map[value] || value || '';
  };
  
  // State for form fields
  const [allegedOffenderUnknown, setAllegedOffenderUnknown] = useState(false);
  const [offenderComments, setOffenderComments] = useState('');
  
  // State for Lookup Person Modal
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  
  // Load Role and Relationship mappings from picklists (if available)
  useEffect(() => {
    const loadMappings = async () => {
      try {
        setLoadingMappings(true);
        
        try {
          const categories = await pickListsApi.getAllCategories();
          const caseCategory = categories.find(c => 
            c.category_name === 'Case' || 
            c.category_name === 'Case Tab' ||
            c.category_name === 'Case Specific Information'
          ) || categories.find(c => c.category_name.toLowerCase().includes('case'));
          
          if (caseCategory) {
            const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
            
            // Try to find Role picklist
            const roleList = pickLists.find(list => 
              list.list_name === 'Role' || 
              list.list_name === 'Case Role' ||
              list.list_name.toLowerCase().includes('role')
            );
            
            if (roleList) {
              const roleItems = await pickListsApi.getItemsByListId(roleList.list_id);
              const roleMapping = {};
              roleItems.forEach((item, index) => {
                roleMapping[index + 1] = item.value;
              });
              setRoleMap(roleMapping);
            }
            
            // Try to find Relationship picklist
            const relationshipList = pickLists.find(list => 
              list.list_name === 'Relationship' || 
              list.list_name === 'Relationship to Victim' ||
              list.list_name.toLowerCase().includes('relationship')
            );
            
            if (relationshipList) {
              const relationshipItems = await pickListsApi.getItemsByListId(relationshipList.list_id);
              const relationshipMapping = {};
              relationshipItems.forEach((item, index) => {
                relationshipMapping[index + 1] = item.value;
              });
              setRelationshipMap(relationshipMapping);
            }
          }
        } catch (err) {
          console.warn('Could not load Role/Relationship mappings from picklist, using defaults:', err);
        }
      } catch (err) {
        console.error('Error loading mappings:', err);
      } finally {
        setLoadingMappings(false);
      }
    };
    
    loadMappings();
  }, []);
  
  // Fetch people associated with the current case
  useEffect(() => {
    if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
      setPeople([]);
      setFilteredPeople([]);
      setFirstVictimPersonId(null);
      return;
    }
    
    const fetchPeople = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch all case_person records for the current case
        const data = await peopleApi.getPeopleByCaseId(currentCase);
        console.log('Fetched people for case:', currentCase, data);
        // Debug: log age and age_unit for each person
        if (data && data.length > 0) {
          data.forEach(person => {
            console.log(`Person ${person.person_id} (${person.name}): age=${person.age}, age_unit=${person.age_unit}`);
          });
        }
        setPeople(data || []);
        setFilteredPeople(data || []);
        
        // Find the first victim (role_id = 1) - the first one in the list
        // Sort by person_id to ensure consistent ordering
        const victims = (data || []).filter(p => p.role_id === 1);
        if (victims.length > 0) {
          // Sort by person_id to get the first created victim (lowest person_id)
          const sortedVictims = [...victims].sort((a, b) => a.person_id - b.person_id);
          setFirstVictimPersonId(sortedVictims[0].person_id);
          console.log('First victim person_id:', sortedVictims[0].person_id);
        } else {
          setFirstVictimPersonId(null);
        }
      } catch (err) {
        console.error('Failed to fetch people:', err);
        setError('Failed to load people associated with this case. Please try again.');
        setPeople([]);
        setFilteredPeople([]);
        setFirstVictimPersonId(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPeople();
  }, [currentCase]);
  
  // Filter people based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPeople(people);
      return;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    setFilteredPeople(
      people.filter(person => {
        const name = person.name?.toLowerCase() || '';
        const role = getDisplayValue(
          Object.keys(roleMap).length > 0 ? roleMap : ROLE_MAP,
          person.role_id
        ).toLowerCase();
        const relationship = getDisplayValue(
          Object.keys(relationshipMap).length > 0 ? relationshipMap : RELATIONSHIP_MAP,
          person.relationship_id
        ).toLowerCase();
        return name.includes(lowerCaseSearch) || 
               role.includes(lowerCaseSearch) || 
               relationship.includes(lowerCaseSearch);
      })
    );
  }, [searchTerm, people, roleMap, relationshipMap]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString();
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle bio view
  const handleViewBio = (personId) => {
    console.log('View bio for person:', personId);
    // Navigate to PersonBio page with personId in state
    // Pass returnTo so PersonBio knows to navigate back here after save
    navigate('/PersonBio', { 
      state: { 
        personId,
        returnTo: '/CasePeople'
      } 
    });
  };

  // Handle case profile view
  const handleViewCaseProfile = (personId) => {
    console.log('View case profile for person:', personId);
    // Navigate to specific case page using currentCase, and pass personId in state
    if (currentCase) {
      navigate(`/case/${currentCase}`, {
        state: { personId: personId }
      });
    } else {
      console.error('No current case available');
      navigate('/CaseGeneral');
    }
  };
  
  // Handle add person - open Lookup Person Modal
  const handleAddPerson = () => {
    if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
      setError('Please select a valid case first before adding a person.');
      return;
    }
    setLookupModalOpen(true);
  };

  // Close lookup modal
  const handleCloseLookupModal = () => {
    setLookupModalOpen(false);
  };

  // Handle person selection from lookup - associate with current case
  const handlePersonSelect = async (person) => {
    if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
      setError('Please select a valid case first');
      handleCloseLookupModal();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get the case to obtain cac_id
      const caseData = await casesApi.getCaseById(currentCase);
      
      if (!caseData || !caseData.cac_id) {
        throw new Error('Failed to get case information');
      }

      // Associate person with case
      await peopleApi.associatePersonWithCase(
        person.person_id,
        parseInt(currentCase),
        caseData.cac_id
      );

      // Close the lookup modal
      handleCloseLookupModal();

      // Refresh the people list
      const data = await peopleApi.getPeopleByCaseId(currentCase);
      setPeople(data || []);
      setFilteredPeople(data || []);
      setError(null);
      
      // Update first victim ID
      const victims = (data || []).filter(p => p.role_id === 1);
      if (victims.length > 0) {
        const sortedVictims = [...victims].sort((a, b) => a.person_id - b.person_id);
        setFirstVictimPersonId(sortedVictims[0].person_id);
      } else {
        setFirstVictimPersonId(null);
      }
    } catch (err) {
      console.error('Error associating person with case:', err);
      setError(`Failed to add person to case: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle delete person from case
  const handleDeletePerson = async (personId) => {
    if (!currentCase) {
      setError('No case selected. Cannot delete person.');
      return;
    }
    
    // Check if this is the first victim
    if (personId === firstVictimPersonId) {
      setError('Cannot delete the first victim. The first victim cannot be removed from the case.');
      return;
    }
    
    // Confirm deletion
    if (!window.confirm('Are you sure you want to remove this person from the case?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Ensure personId and caseId are integers
      const personIdInt = parseInt(personId, 10);
      const caseIdInt = parseInt(currentCase, 10);
      
      if (isNaN(personIdInt) || isNaN(caseIdInt)) {
        throw new Error('Invalid person ID or case ID');
      }
      
      console.log('Attempting to delete person from case:', {
        personId: personIdInt,
        caseId: caseIdInt,
        url: `/api/people/case/${personIdInt}/${caseIdInt}`
      });
      
      // Call API to remove person from case
      await peopleApi.removePersonFromCase(personIdInt, caseIdInt);
      
      // Refresh the people list
      const data = await peopleApi.getPeopleByCaseId(caseIdInt);
      setPeople(data || []);
      setFilteredPeople(data || []);
      
      // Update first victim ID
      const victims = (data || []).filter(p => p.role_id === 1);
      if (victims.length > 0) {
        const sortedVictims = [...victims].sort((a, b) => a.person_id - b.person_id);
        setFirstVictimPersonId(sortedVictims[0].person_id);
      } else {
        setFirstVictimPersonId(null);
      }
      
      console.log('Successfully removed person from case');
    } catch (err) {
      console.error('Failed to delete person from case:', err);
      setError(`Failed to remove person from case: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle checkbox change
  const handleCheckboxChange = (e) => {
    setAllegedOffenderUnknown(e.target.checked);
  };
  
  // Handle comments change
  const handleCommentsChange = (e) => {
    setOffenderComments(e.target.value);
  };
  
  // Handle save form
  const handleSave = (e) => {
    e.preventDefault();
    console.log('Form saved');
    // Implement save functionality here
  };
  

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100%', 
      margin: '0 auto', 
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif'
    }} data-aoi="People Interface Container">
      <Paper elevation={3} sx={{ 
        p: 4, 
        my: 4,
        width: '100%',
        boxSizing: 'border-box'
      }} data-aoi="People Paper">
        {/* Form Buttons - Moved to top */}
        <Grid
          container
          justifyContent="flex-start"
          spacing={2}
          sx={{ mb: 3 }}
          data-aoi="Form Buttons Section"
        >
          <Grid item>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ px: 4 }}
              form="people-form"
              data-aoi="Save Button"
            >
              SAVE
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="error"
              onClick={() => navigate('/')}
              sx={{ px: 4 }}
              data-aoi="Cancel Button"
            >
              CANCEL
            </Button>
          </Grid>
        </Grid>

        <Typography
          variant="h4"
          gutterBottom
          align="left"
          data-aoi="People Header"
        >
          People Associated with Case
        </Typography>
        
        {!currentCase || currentCase === 'create-new' || currentCase === 'search-case' ? (
          <Alert severity="info" sx={{ mt: 2, mb: 2 }} data-aoi="No Case Selected Alert">
            Please select a case from the dropdown menu to view associated people.
          </Alert>
        ) : null}
  
        <Box
          component="form"
          id="people-form"
          onSubmit={handleSave}
          sx={{ mt: 3 }}
          data-aoi="People Form"
        >
          {/* People Table Section */}
          <Box sx={{ mb: 4 }} data-aoi="People Table Section">
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                data-aoi="People Error Alert"
              >
                {error}
              </Alert>
            )}
  
            <TableContainer
              component={Paper}
              sx={{ mb: 3 }}
              data-aoi="People Table Container"
            >
              <Table 
                size="small" 
                sx={{ 
                  minWidth: 650,
                  tableLayout: 'auto',
                  width: '100%',
                  '& th, & td': {
                    textAlign: 'left',
                    verticalAlign: 'middle',
                    border: '1px solid',
                    borderColor: 'grey.300',
                  },
                  '& th': {
                    backgroundColor: '#f8f9fa',
                    fontWeight: 'bold',
                  },
                }} 
                data-aoi="People Table"
              >
                <TableHead>
                  {/* Add Button Row - First Row */}
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{
                        backgroundColor: '#f5f5f5',
                        bgcolor: '#f5f5f5',
                        textAlign: 'left',
                        p: 1
                      }}
                      data-aoi="Add Button Row"
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <Button
                          variant="outlined"
                          onClick={handleAddPerson}
                          disabled={!currentCase || currentCase === 'create-new' || currentCase === 'search-case'}
                          sx={{
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            borderColor: '#d1d5db',
                            '&:hover': {
                              backgroundColor: '#f5f5f5',
                              borderColor: '#9ca3af',
                            },
                            '&:disabled': {
                              backgroundColor: '#cccccc',
                              color: '#666666',
                              borderColor: '#cccccc',
                            }
                          }}
                          data-aoi="Add Person Button"
                        >
                          Add
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {/* Column Headers Row */}
                  <TableRow>
                    <TableCell 
                      align="left" 
                      data-aoi="Table Header Action"
                      sx={{
                        width: '500px',
                        maxWidth: '500px',
                        textAlign: 'left',
                      }}
                    >
                      Action
                    </TableCell>
                    <TableCell align="left" data-aoi="Table Header Name">Name</TableCell>
                    <TableCell align="left" data-aoi="Table Header Age">Age</TableCell>
                    <TableCell align="left" data-aoi="Table Header DOB">Date of Birth</TableCell>
                    <TableCell align="left" data-aoi="Table Header Role">Role</TableCell>
                    <TableCell align="left" data-aoi="Table Header Relationship">Relationship</TableCell>
                    <TableCell align="left" data-aoi="Table Header Household">Same Household</TableCell>
                    <TableCell align="left" data-aoi="Table Header Custody">Custody</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="left" sx={{ py: 3 }}>
                        <CircularProgress size={30} data-aoi="People Loading Spinner" />
                        <Typography data-aoi="People Loading Text" sx={{ mt: 1 }}>
                          Loading people...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredPeople.length > 0 ? (
                    filteredPeople.map(person => (
                      <TableRow key={person.person_id} hover data-aoi="Person Row">
                        <TableCell 
                          align="left"
                          data-aoi="Person Actions"
                          sx={{
                            width: '500px',
                            maxWidth: '500px',
                            textAlign: 'left',
                          }}
                        >
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems="center"
                            justifyContent="flex-start"
                            sx={{
                              flexWrap: 'wrap',
                              whiteSpace: 'nowrap',
                              '& button': {
                                whiteSpace: 'nowrap',
                              },
                            }}
                          >
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleViewCaseProfile(person.person_id)}
                              sx={{
                                borderColor: '#d1d5db',
                                color: '#374151',
                                backgroundColor: 'white',
                                textTransform: 'none',
                                fontSize: '0.875rem',
                                px: 2,
                                py: 0.75,
                                whiteSpace: 'nowrap',
                                minWidth: 'fit-content',
                                '&:hover': {
                                  backgroundColor: '#f3f4f6',
                                  borderColor: '#9ca3af',
                                },
                              }}
                              data-aoi="Case Profile Button"
                            >
                              Case Profile
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => handleViewBio(person.person_id)}
                              sx={{
                                borderColor: '#d1d5db',
                                color: '#374151',
                                backgroundColor: 'white',
                                textTransform: 'none',
                                fontSize: '0.875rem',
                                px: 2,
                                py: 0.75,
                                whiteSpace: 'nowrap',
                                minWidth: 'fit-content',
                                '&:hover': {
                                  backgroundColor: '#f3f4f6',
                                  borderColor: '#9ca3af',
                                },
                              }}
                              data-aoi="View Bio Button"
                            >
                              Person Bio
                            </Button>
                            {/* Delete button - only show if not the first victim */}
                            {person.person_id !== firstVictimPersonId && (
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDeletePerson(person.person_id)}
                                sx={{
                                  borderColor: '#d1d5db',
                                  color: '#000000',
                                  backgroundColor: '#ffffff',
                                  textTransform: 'none',
                                  fontSize: '0.875rem',
                                  px: 2,
                                  py: 0.75,
                                  whiteSpace: 'nowrap',
                                  minWidth: 'fit-content',
                                  '&:hover': {
                                    backgroundColor: '#f5f5f5',
                                    borderColor: '#9ca3af',
                                  },
                                }}
                                data-aoi="Delete Person Button"
                              >
                                Delete
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="left" data-aoi="Person Name">{person.name || ''}</TableCell>
                        <TableCell align="left" data-aoi="Person Age">
                          {(() => {
                            // Display age with unit from case_person table
                            // Check if age exists (including 0, which is a valid age)
                            if (person.age !== null && person.age !== undefined && person.age !== '') {
                              const ageValue = person.age;
                              // Get age_unit from case_person, default to 'year' if not provided
                              let ageUnit = 'year';
                              if (person.age_unit && typeof person.age_unit === 'string' && person.age_unit.trim()) {
                                ageUnit = person.age_unit.trim().toLowerCase();
                              }
                              return `${ageValue} ${ageUnit}`;
                            }
                            return '';
                          })()}
                        </TableCell>
                        <TableCell align="left" data-aoi="Person DOB">{formatDate(person.date_of_birth) || ''}</TableCell>
                        <TableCell align="left" data-aoi="Person Role">
                          {getDisplayValue(
                            Object.keys(roleMap).length > 0 ? roleMap : ROLE_MAP,
                            person.role_id
                          )}
                        </TableCell>
                        <TableCell align="left" data-aoi="Person Relationship">
                          {getDisplayValue(
                            Object.keys(relationshipMap).length > 0 ? relationshipMap : RELATIONSHIP_MAP,
                            person.relationship_id
                          )}
                        </TableCell>
                        <TableCell align="left" data-aoi="Person Same Household">
                          <Checkbox
                            checked={Boolean(person.same_household)}
                            disabled
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="left" data-aoi="Person Custody">
                          <Checkbox
                            checked={Boolean(person.custody)}
                            disabled
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        align="left"
                        sx={{ py: 2 }}
                        data-aoi="No People Row"
                      >
                        {searchTerm
                          ? 'No matching people found'
                          : 'No people associated with this case'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
  
            {/* Alleged Offender Unknown section */}
            <Box sx={{ mb: 3 }} data-aoi="Alleged Offender Section">
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Checkbox
                  checked={allegedOffenderUnknown}
                  onChange={handleCheckboxChange}
                  id="allegedOffenderUnknown"
                  name="allegedOffenderUnknown"
                  data-aoi="Alleged Offender Unknown Checkbox"
                />
                <Typography data-aoi="Alleged Offender Unknown Label">
                  Alleged Offender Name Unknown
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Typography
                  variant="body1"
                  sx={{ minWidth: '200px', pt: 1 }}
                  data-aoi="Alleged Offender Comments Label"
                >
                  Alleged Offender Unknown Comments
                </Typography>
                <Box sx={{ display: 'flex', flex: 1, gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={offenderComments}
                    onChange={handleCommentsChange}
                    variant="outlined"
                    inputProps={{ 'data-aoi': 'Alleged Offender Comments Input' }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="contained"
                      sx={{
                        minWidth: '40px',
                        width: '40px',
                        height: '40px',
                        p: 0,
                        bgcolor: '#01665e',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#003C30'
                        }
                      }}
                      data-aoi="Add Comment Button"
                    >
                      +
                    </Button>
                    <Button
                      variant="contained"
                      sx={{
                        minWidth: '40px',
                        width: '40px',
                        height: '40px',
                        p: 0,
                        bgcolor: '#01665e',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#003C30'
                        }
                      }}
                      data-aoi="Remove Comment Button"
                    >
                      −
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
  
          {/* Document Upload Section */}
          <Box sx={{ mb: 4 }} data-aoi="Document Upload Section">
            <DocumentUploadSection
              documents={[]}
              onFileSelect={() => {
                // Handle file select
                console.log("File select clicked");
              }}
              showRemovedCheckbox={true}
              showInstructions={true}
              sectionTitle="Document Upload"
            />
          </Box>
        </Box>
      </Paper>

      {/* Lookup Person Modal */}
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
            currentCaseId={currentCase}
            returnTo="/CasePeople"
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PeopleInterface;
