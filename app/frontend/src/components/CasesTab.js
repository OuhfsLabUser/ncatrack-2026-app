import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Collapse,
  Checkbox,
  Grid
} from '@mui/material';
import { KeyboardArrowDown as DownIcon, KeyboardArrowUp as UpIcon } from '@mui/icons-material';
import { peopleApi, pickListsApi } from '../services/api';
import { useCase } from '../context/CaseContext';
import { useNavigate } from 'react-router-dom';

const CasesTab = ({ personId }) => {
  const { currentCase } = useCase();
  const navigate = useNavigate();

  // data state
  const [cases, setCases] = useState([]);
  const [currentPerson, setCurrentPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMap, setOpenMap] = useState({});
  const [otherPeopleMap, setOtherPeopleMap] = useState({});
  const [otherPeopleLoading, setOtherPeopleLoading] = useState(false);
  const [otherPeopleErrorMap, setOtherPeopleErrorMap] = useState({});
  
  // Picklist mappings for Role and Relationship
  const [roleMap, setRoleMap] = useState({});
  const [relationshipMap, setRelationshipMap] = useState({});
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Helper function to safely get case_person field value
  const getCasePersonValue = (caseItem, fieldName) => {
    if (!caseItem) {
      console.warn(`[getCasePersonValue] caseItem is falsy for field: ${fieldName}`);
      return '';
    }

    const fieldMap = {
      'address_line_1': ['address_line_1', 'street_address', 'address1', 'address_line1', 'addressLine1'],
      'address_line_2': ['address_line_2', 'address2', 'address_line2', 'addressLine2'],
      'city': ['city'],
      'county': ['county'],
      'state_abbr': ['state_abbr', 'state', 'stateAbbr'],
      'zip': ['zip', 'zip_code', 'zipCode'],
    };

    const possibleFieldNames = fieldMap[fieldName] || [fieldName];

    let value = undefined;
    let foundFieldName = null;

    for (const possibleName of possibleFieldNames) {
      if (caseItem[possibleName] !== undefined) {
        value = caseItem[possibleName];
        foundFieldName = possibleName;
        break;
      }
    }

    if (value === undefined && fieldName.includes('_')) {
      const camelCaseName = fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (caseItem[camelCaseName] !== undefined) {
        value = caseItem[camelCaseName];
        foundFieldName = camelCaseName;
      }
    }

    if (value === null || value === undefined || value === '') {
      return '';
    }

    if (typeof value === 'string' && value.trim() === '') {
      return '';
    }

    return value;
  };

  // Helper function to format age with age_unit
  const getAgeDisplay = (caseItem) => {
    if (!caseItem) return '';
    const age = caseItem.age;
    const ageUnit = caseItem.age_unit;

    if ((age === null || age === undefined || age === '') && 
        (ageUnit === null || ageUnit === undefined || ageUnit === '')) {
      return '';
    }

    let display = '';
    if (age !== null && age !== undefined && age !== '') {
      display += age;
    }
    if (ageUnit !== null && ageUnit !== undefined && ageUnit !== '') {
      if (display) {
        display += ' ' + ageUnit;
      } else {
        display = ageUnit;
      }
    }

    return display || '';
  };

  // Role mapping
  const ROLE_MAP = {
    1: 'Alleged Co-victim',
    2: 'Alleged Offender',
    3: 'Caregiver',
    4: 'Other',
    5: 'Witness'
  };  
  
  // Relationship mapping
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

  useEffect(() => {
    const load = async () => {
      if (!personId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [personData, casesData] = await Promise.all([
          peopleApi.getPersonById(personId),
          peopleApi.getCasesForPerson(personId)
        ]);

        setCurrentPerson(personData);
        setCases(casesData || []);
      } catch (err) {
        console.error('Error loading person or cases:', err);
        setError('Failed to load person or cases.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [personId, currentCase]);

  useEffect(() => {
    const loadOtherPeople = async () => {
      if (!cases || cases.length === 0) {
        setOtherPeopleMap({});
        setOtherPeopleErrorMap({});
        return;
      }

      setOtherPeopleLoading(true);
      const newMap = {};
      const newErrorMap = {};
      const currentPersonIdNum = Number(personId);

      await Promise.all(
        cases.map(async (caseItem) => {
          try {
            const people = await peopleApi.getPeopleByCaseId(caseItem.case_id);
            const filtered = (people || []).filter(
              (person) => person.person_id !== currentPersonIdNum
            );

            newMap[caseItem.case_id] = filtered.map((person) => ({
              person_id: person.person_id,
              person_name: person.name || 'View Person',
              relationship_id: person.relationship_id,
              role_id: person.role_id,
              age: person.age ?? null,
              same_household: Boolean(person.same_household),
              custody: Boolean(person.custody)
            }));
          } catch (err) {
            console.error(`Failed to load other people for case ${caseItem.case_id}:`, err);
            newErrorMap[caseItem.case_id] = 'Failed to load other people in this case.';
            newMap[caseItem.case_id] = [];
          }
        })
      );

      setOtherPeopleMap(newMap);
      setOtherPeopleErrorMap(newErrorMap);
      setOtherPeopleLoading(false);
    };

    loadOtherPeople();
  }, [cases, personId]);

  const toggleRow = (caseId) => {
    setOpenMap(prev => ({
      ...prev,
      [caseId]: !prev[caseId]
    }));
  };

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
      <TableContainer sx={{ maxHeight: 400, overflowY: 'auto' }}>
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '12.5%' }} />
              <TableCell sx={{ width: '12.5%' }}>CAC Case Number</TableCell>
              <TableCell sx={{ width: '12.5%' }}>CAC Date Received</TableCell>
              <TableCell sx={{ width: '12.5%' }}>Relationship to Victim</TableCell>
              <TableCell sx={{ width: '12.5%' }}>Role</TableCell>
              <TableCell sx={{ width: '12.5%' }}>Age</TableCell>
              <TableCell sx={{ width: '12.5%' }}>Same Household</TableCell>
              <TableCell sx={{ width: '12.5%' }}>Custody</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No cases found for this person
                </TableCell>
              </TableRow>
            ) : cases.map(caseItem => {
              return (
                <React.Fragment key={caseItem.case_id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => toggleRow(caseItem.case_id)}
                      >
                        {openMap[caseItem.case_id] ? <UpIcon /> : <DownIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{caseItem.case_number || `Case #${caseItem.case_id}`}</TableCell>
                    <TableCell>
                      {caseItem.created_date ? new Date(caseItem.created_date).toLocaleDateString() : ''}
                    </TableCell>
                    <TableCell>
                      {getDisplayValue(Object.keys(relationshipMap).length > 0 ? relationshipMap : RELATIONSHIP_MAP, caseItem.relationship_id)}
                    </TableCell>
                    <TableCell>
                      {getDisplayValue(Object.keys(roleMap).length > 0 ? roleMap : ROLE_MAP, caseItem.role_id)}
                    </TableCell>
                    <TableCell>{getAgeDisplay(caseItem)}</TableCell>
                    <TableCell>
                      <Checkbox checked={Boolean(caseItem.same_household)} disabled />
                    </TableCell>
                    <TableCell>
                      <Checkbox checked={Boolean(caseItem.custody)} disabled />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                      <Collapse in={openMap[caseItem.case_id]} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Case Details
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                                Address Information
                              </Typography>
                              <TableContainer>
                                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                  <TableBody>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold', width: '50%' }}>Street Address</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', width: '50%' }}>{getCasePersonValue(caseItem, 'address_line_1')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>Address Line 2</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'address_line_2')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>City</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'city')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>County</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'county')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>State</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'state_abbr')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>Zip</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'zip')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>Region</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'region')}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                                Contact Information
                              </Typography>
                              <TableContainer>
                                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                  <TableBody>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold', width: '50%' }}>Home Phone</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', width: '50%' }}>{getCasePersonValue(caseItem, 'home_phone_number')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>Cell Phone</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'cell_phone_number')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>Work Phone</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'work_phone_number')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>School or Employer</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'school_or_employer')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>Marital Status</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'marital_status_id')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>Education Level</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'education_level_id')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>Income Level of Household</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'income_level_id')}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Grid>
                          </Grid>
                          <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                              Other People in Case
                            </Typography>
                            <TableContainer>
                              <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>Other People in Case</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>Relationship to Victim</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>Role</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>Age</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>Same Household</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Custody</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {otherPeopleLoading ? (
                                    <TableRow>
                                      <TableCell colSpan={6} align="center">
                                        <CircularProgress size={20} />
                                      </TableCell>
                                    </TableRow>
                                  ) : otherPeopleErrorMap[caseItem.case_id] ? (
                                    <TableRow>
                                      <TableCell colSpan={6} align="center">
                                        <Typography variant="body2" color="error">
                                          {otherPeopleErrorMap[caseItem.case_id]}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ) : (otherPeopleMap[caseItem.case_id] || []).length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={6} align="center">
                                        <Typography variant="body2" color="text.secondary">
                                          No other people associated with this case.
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                    ) : (
                                    (otherPeopleMap[caseItem.case_id] || []).map((person) => (
                                      <TableRow
                                        key={person.person_id}
                                        sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}
                                      >
                                        <TableCell sx={{ textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>
                                          <Typography
                                            component="span"
                                            sx={{
                                              color: 'primary.main',
                                              cursor: 'pointer',
                                              textDecoration: 'underline',
                                              '&:hover': { textDecoration: 'none' }
                                            }}
                                            onClick={() =>
                                              navigate('/PersonBio', {
                                                state: { personId: person.person_id, tab: 0 }
                                              })
                                            }
                                          >
                                            {person.person_name}
                                          </Typography>
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>
                                          {getDisplayValue(
                                            Object.keys(relationshipMap).length > 0 ? relationshipMap : RELATIONSHIP_MAP,
                                            person.relationship_id
                                          )}
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>
                                          {getDisplayValue(
                                            Object.keys(roleMap).length > 0 ? roleMap : ROLE_MAP,
                                            person.role_id
                                          )}
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>
                                          {person.age !== null && person.age !== undefined ? person.age : ''}
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center', borderRight: '1px solid', borderColor: 'grey.300' }}>
                                          <Checkbox checked={Boolean(person.same_household)} disabled />
                                        </TableCell>
                                        <TableCell sx={{ textAlign: 'center' }}>
                                          <Checkbox checked={Boolean(person.custody)} disabled />
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CasesTab;

