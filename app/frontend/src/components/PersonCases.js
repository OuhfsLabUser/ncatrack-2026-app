import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Tabs,
  Tab,
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
  Button,
  Grid
} from '@mui/material';
import { KeyboardArrowDown as DownIcon, KeyboardArrowUp as UpIcon } from '@mui/icons-material';
import { peopleApi, pickListsApi } from '../services/api';
import { useCase } from '../context/CaseContext';

const PersonCases = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCase } = useCase();

  // pull personId from state or query string
  const personId =
    location.state?.personId ||
    new URLSearchParams(location.search).get('personId');

  // tab control
  const currentTab = 1;
  const handleTabChange = (_e, newTab) => {
    if (newTab === 0) {
      navigate('/PersonBio', { state: { personId, tab: 0 } });
    } else if (newTab === 2) {
      navigate('/PersonBio', { state: { personId, tab: 2 } });
    }
  };

  // data state
  const [cases, setCases]     = useState([]);
  const [currentPerson, setCurrentPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [openMap, setOpenMap] = useState({});
  
  // Picklist mappings for Role and Relationship
  const [roleMap, setRoleMap] = useState({});
  const [relationshipMap, setRelationshipMap] = useState({});
  const [loadingMappings, setLoadingMappings] = useState(false);

  // Helper function to safely get case_person field value
  // This ensures consistent handling of null, undefined, and empty string values
  const getCasePersonValue = (caseItem, fieldName) => {
    if (!caseItem) {
      console.warn(`[getCasePersonValue] caseItem is falsy for field: ${fieldName}`);
      return '';
    }
    
    // Field name mapping for potential mismatches between database and API response
    const fieldMap = {
      'address_line_1': ['address_line_1', 'street_address', 'address1', 'address_line1', 'addressLine1'],
      'address_line_2': ['address_line_2', 'address2', 'address_line2', 'addressLine2'],
      'city': ['city'],
      'county': ['county'],
      'state_abbr': ['state_abbr', 'state', 'stateAbbr'],
      'zip': ['zip', 'zip_code', 'zipCode'],
    };
    
    // Get all possible field name variations for this field
    const possibleFieldNames = fieldMap[fieldName] || [fieldName];
    
    // Try to find the value using any of the possible field names
    let value = undefined;
    let foundFieldName = null;
    
    for (const possibleName of possibleFieldNames) {
      if (caseItem[possibleName] !== undefined) {
        value = caseItem[possibleName];
        foundFieldName = possibleName;
        break;
      }
    }
    
    // If still not found, try camelCase variant
    if (value === undefined && fieldName.includes('_')) {
      const camelCaseName = fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (caseItem[camelCaseName] !== undefined) {
        value = caseItem[camelCaseName];
        foundFieldName = camelCaseName;
      }
    }
    
    // Debug: Comprehensive logging for address_line_1
    if (fieldName === 'address_line_1') {
      console.log(`[getCasePersonValue] === Debug for address_line_1 ===`);
      console.log('Available keys:', Object.keys(caseItem));
      console.log('Requested field:', fieldName);
      console.log('Possible field names:', possibleFieldNames);
      console.log('Found field name:', foundFieldName);
      console.log('Value:', value);
      console.log('Value type:', typeof value);
      console.log('Direct access caseItem.address_line_1:', caseItem.address_line_1);
      console.log('Direct access caseItem.street_address:', caseItem.street_address);
      console.log('Direct access caseItem.address1:', caseItem.address1);
      console.log('=== End debug ===');
    }
    
    // Return empty string if value is null, undefined, empty string, or whitespace-only string
    if (value === null || value === undefined || value === '') {
      if (fieldName === 'address_line_1') {
        console.warn(`[getCasePersonValue] address_line_1 not found or empty. Available keys:`, Object.keys(caseItem));
      }
      return '';
    }
    
    // Handle whitespace-only strings
    if (typeof value === 'string' && value.trim() === '') {
      console.warn(`[getCasePersonValue] Field ${fieldName} contains only whitespace`);
      return '';
    }
    
    // Log successful retrieval for address_line_1
    if (fieldName === 'address_line_1' && foundFieldName !== fieldName) {
      console.log(`[getCasePersonValue] Found address_line_1 using alternative field name: ${foundFieldName}`);
    }
    
    return value;
  };

  // Helper function to format age with age_unit
  const getAgeDisplay = (caseItem) => {
    if (!caseItem) return '';
    const age = caseItem.age;
    const ageUnit = caseItem.age_unit;
    
    // If both age and age_unit are missing, return empty string
    if ((age === null || age === undefined || age === '') && 
        (ageUnit === null || ageUnit === undefined || ageUnit === '')) {
      return '';
    }
    
    // Build the display string
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

  // Role mapping - based on existing mappings in PersonProfile.js and SearchPerson.js
  // Role mapping (aligned with CasesTab.js)
  const ROLE_MAP = {
    1: 'Alleged Co-victim',
    2: 'Alleged Offender',
    3: 'Caregiver',
    4: 'Other',
    5: 'Witness'
  };

  // Relationship mapping (aligned with CasesTab.js)
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
    // Try to find in map (value might be string or number)
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    return map[numValue] || map[value] || value || '';
  };

  // Load Role and Relationship mappings from picklists (if available)
  useEffect(() => {
    const loadMappings = async () => {
      try {
        setLoadingMappings(true);
        
        // Try to load Role picklist
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
              // Create map from display_order (1-based) to value
              const roleMapping = {};
              roleItems.forEach((item, index) => {
                roleMapping[index + 1] = item.value;
              });
              setRoleMap(roleMapping);
              console.log('Loaded Role mapping from picklist:', roleMapping);
            }
            
            // Try to find Relationship picklist
            const relationshipList = pickLists.find(list => 
              list.list_name === 'Relationship' || 
              list.list_name === 'Relationship to Victim' ||
              list.list_name.toLowerCase().includes('relationship')
            );
            
            if (relationshipList) {
              const relationshipItems = await pickListsApi.getItemsByListId(relationshipList.list_id);
              // Create map from display_order (1-based) to value
              const relationshipMapping = {};
              relationshipItems.forEach((item, index) => {
                relationshipMapping[index + 1] = item.value;
              });
              setRelationshipMap(relationshipMapping);
              console.log('Loaded Relationship mapping from picklist:', relationshipMapping);
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
      let targetPersonId = personId;
      
      // If no personId provided, try to get it from currentCase
      if (!targetPersonId && currentCase) {
        try {
          // Try to get the primary person from the current case
          const casePeople = await peopleApi.getPeopleByCaseId(currentCase);
          if (casePeople && casePeople.length > 0) {
            // Get the first person (assuming primary person is first)
            targetPersonId = casePeople[0].person_id;
            console.log('Derived personId from currentCase:', targetPersonId);
          }
        } catch (err) {
          console.error('Failed to get person from current case:', err);
        }
      }
      
      if (!targetPersonId) {
        setError('No person selected.');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        // Get person details for display
        const personData = await peopleApi.getPersonById(targetPersonId);
        setCurrentPerson(personData);
        
        // Get cases associated with this person using the new API endpoint
        const casesData = await peopleApi.getCasesForPerson(targetPersonId);
        console.log('=== Frontend: Raw API Response ===');
        console.log('Cases data for person:', casesData);
        console.log('Type of casesData:', typeof casesData);
        console.log('Is array:', Array.isArray(casesData));
        if (casesData && casesData.length > 0) {
          console.log('First case raw JSON:', JSON.stringify(casesData[0], null, 2));
        }
        console.log('=== End Raw API Response ===');
        
        // Debug: Check field availability for each case
        if (casesData && casesData.length > 0) {
          console.log('=== DEBUG: Checking case_person fields ===');
          casesData.forEach((caseItem, index) => {
            console.log(`\nCase ${index + 1} (case_id: ${caseItem.case_id}):`);
            console.log('Object.keys(caseItem):', Object.keys(caseItem));
            console.log('Has address_line_1 property:', 'address_line_1' in caseItem);
            console.log('address_line_1 value:', caseItem.address_line_1);
            console.log('address_line_1 type:', typeof caseItem.address_line_1);
            
            const fieldsToCheck = [
              'address_line_1', 'address_line_2', 'city', 'county', 'state_abbr', 'zip',
              'home_phone_number', 'cell_phone_number', 'work_phone_number',
              'school_or_employer', 'marital_status_id', 'education_level_id', 'income_level_id'
            ];
            fieldsToCheck.forEach(field => {
              const value = caseItem[field];
              const hasProperty = field in caseItem;
              console.log(`  ${field}: hasProperty=${hasProperty}, value=${value !== undefined && value !== null ? `"${value}"` : (value === null ? 'null' : 'undefined')}, type=${typeof value}`);
            });
          });
          console.log('=== End of field check ===\n');
        }
        
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

  if (loading) {
    return (
      <Box sx={{ 
        width: '100%', 
        maxWidth: '100%', 
        margin: '0 auto', 
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif'
      }}>
        <Box sx={{ textAlign:'center', mt:8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ 
        width: '100%', 
        maxWidth: '100%', 
        margin: '0 auto', 
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif'
      }}>
        <Box sx={{ mt:4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100%', 
      margin: '0 auto', 
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif',
      mt: 4
    }}>
      <Paper sx={{ 
        p: 3, 
        width: '100%',
        boxSizing: 'border-box'
      }} elevation={3}>
        <Box sx={{ borderBottom:1, borderColor:'divider', mb:2 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Personal Profile" />
            <Tab label="Cases" />
            <Tab label="Contact Info" />
          </Tabs>
        </Box>

        <Typography variant="h5" gutterBottom>
          {currentPerson ? 
            `${currentPerson.first_name || ''}${currentPerson.middle_name ? ' ' + currentPerson.middle_name : ''}${currentPerson.last_name ? ' ' + currentPerson.last_name : ''}${currentPerson.suffix ? ' ' + currentPerson.suffix : ''} – Cases` :
            'CASES'
          }
        </Typography>

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
                <TableCell sx={{ width: '12.5%' }}>Actions</TableCell>
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
                  // Debug: Log caseItem when expanded - with detailed field inspection
                  if (openMap[caseItem.case_id]) {
                    console.log('=== Rendering expanded case ===');
                    console.log('Case ID:', caseItem.case_id);
                    console.log('Full caseItem object:', caseItem);
                    console.log('Object.keys(caseItem):', Object.keys(caseItem));
                    console.log('\n--- Address Fields (Left Table) ---');
                    console.log('address_line_1:', caseItem.address_line_1, '(type:', typeof caseItem.address_line_1, ')');
                    console.log('address_line_2:', caseItem.address_line_2, '(type:', typeof caseItem.address_line_2, ')');
                    console.log('city:', caseItem.city, '(type:', typeof caseItem.city, ')');
                    console.log('county:', caseItem.county, '(type:', typeof caseItem.county, ')');
                    console.log('state_abbr:', caseItem.state_abbr, '(type:', typeof caseItem.state_abbr, ')');
                    console.log('zip:', caseItem.zip, '(type:', typeof caseItem.zip, ')');
                    console.log('\n--- Contact Fields (Right Table) ---');
                    console.log('home_phone_number:', caseItem.home_phone_number, '(type:', typeof caseItem.home_phone_number, ')');
                    console.log('cell_phone_number:', caseItem.cell_phone_number, '(type:', typeof caseItem.cell_phone_number, ')');
                    console.log('work_phone_number:', caseItem.work_phone_number, '(type:', typeof caseItem.work_phone_number, ')');
                    console.log('school_or_employer:', caseItem.school_or_employer, '(type:', typeof caseItem.school_or_employer, ')');
                    console.log('marital_status_id:', caseItem.marital_status_id, '(type:', typeof caseItem.marital_status_id, ')');
                    console.log('education_level_id:', caseItem.education_level_id, '(type:', typeof caseItem.education_level_id, ')');
                    console.log('income_level_id:', caseItem.income_level_id, '(type:', typeof caseItem.income_level_id, ')');
                    console.log('=== End of case item debug ===\n');
                  }
                  
                  return (
                <React.Fragment key={caseItem.case_id}>
                  <TableRow hover>
                    <TableCell sx={{ width: '12.5%' }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setOpenMap(o => ({ ...o, [caseItem.case_id]: !o[caseItem.case_id] }))
                        }
                      >
                        {openMap[caseItem.case_id] ? <UpIcon/> : <DownIcon/>}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ width: '12.5%' }}>
                      <Typography
                        variant="body2"
                        sx={{ 
                          color: 'primary.main', 
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          '&:hover': { textDecoration: 'none' }
                        }}
                        onClick={() => navigate('/CaseGeneral', { state: { caseId: caseItem.case_id } })}
                      >
                        {caseItem.case_number}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '12.5%' }}>
                      {caseItem.created_date ? new Date(caseItem.created_date).toLocaleDateString() : ''}
                    </TableCell>
                    <TableCell sx={{ width: '12.5%' }}>
                      {getDisplayValue(Object.keys(relationshipMap).length > 0 ? relationshipMap : RELATIONSHIP_MAP, caseItem.relationship_id)}
                    </TableCell>
                    <TableCell sx={{ width: '12.5%' }}>
                      {getDisplayValue(Object.keys(roleMap).length > 0 ? roleMap : ROLE_MAP, caseItem.role_id)}
                    </TableCell>
                    <TableCell sx={{ width: '12.5%' }}>{getAgeDisplay(caseItem)}</TableCell>
                    <TableCell sx={{ width: '12.5%' }}>
                      <Checkbox checked={Boolean(caseItem.same_household)} disabled />
                    </TableCell>
                    <TableCell sx={{ width: '12.5%' }}>
                      <Checkbox checked={Boolean(caseItem.custody)} disabled />
                    </TableCell>
                    <TableCell sx={{ width: '12.5%' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate('/CaseGeneral', { state: { caseId: caseItem.case_id } })}
                      >
                        View Case
                      </Button>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell colSpan={9} sx={{ p:0 }}>
                      <Collapse in={openMap[caseItem.case_id]} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
                          {/* Modified: Expand each row to show detailed information fields (Figure 2 structure) */}
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                            Case Details
                          </Typography>
                          
                          {/* Two Column Layout for Address and Contact Information */}
                          <Grid container spacing={2}>
                            {/* Left Column - Address Information */}
                            <Grid item xs={12} md={6}>
                              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.300' }}>
                                <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', '& .MuiTableCell-root': { borderRight: '1px solid', borderColor: 'grey.300' } }}>
                                  <TableBody>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', width: '50%', fontWeight: 'bold' }}>Street Address</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', width: '50%' }}>{getCasePersonValue(caseItem, 'address_line_1')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', width: '50%', fontWeight: 'bold' }}>Address Line 2</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', width: '50%' }}>{getCasePersonValue(caseItem, 'address_line_2')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', width: '50%', fontWeight: 'bold' }}>City</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', width: '50%' }}>{getCasePersonValue(caseItem, 'city')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', width: '50%', fontWeight: 'bold' }}>County</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', width: '50%' }}>{getCasePersonValue(caseItem, 'county')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', width: '50%', fontWeight: 'bold' }}>State</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', width: '50%' }}>{getCasePersonValue(caseItem, 'state_abbr')}</TableCell>
                                    </TableRow>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', width: '50%', fontWeight: 'bold' }}>Zip</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', width: '50%' }}>{getCasePersonValue(caseItem, 'zip')}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Grid>

                            {/* Right Column - Contact and Education Information */}
                            <Grid item xs={12} md={6}>
                              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.300' }}>
                                <Table size="small" sx={{ '& .MuiTableCell-root': { borderRight: '1px solid', borderColor: 'grey.300' } }}>
                                  <TableBody>
                                    <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'white' }, '&:nth-of-type(even)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'grey.100' } }}>
                                      <TableCell sx={{ color: 'text.secondary', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid', borderColor: 'grey.300', fontWeight: 'bold' }}>Home Phone</TableCell>
                                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>{getCasePersonValue(caseItem, 'home_phone_number')}</TableCell>
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
      </Paper>
    </Box>
  );
};

export default PersonCases;