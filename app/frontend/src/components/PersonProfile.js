// src/components/PersonProfile.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  CircularProgress,
  IconButton,
  TextField
} from '@mui/material';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import { peopleApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

const PersonProfile = ({ open, person, onClose }) => {
  const navigate = useNavigate();
  const [personCases, setPersonCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aliasPage, setAliasPage] = useState(0);
  const [casesPage, setCasesPage] = useState(0);
  const casesRowsPerPage = 10;
  
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
  
  // Helper function to get relationship text from relationship_id
  const getRelationshipText = (relationshipId) => {
    if (!relationshipId) return '';
    return RELATIONSHIP_MAP[relationshipId] || `Relationship ${relationshipId}`;
  };
  
  useEffect(() => {
    // Fetch person's cases when the modal opens and person is available
    if (open && person && person.person_id) {
      const fetchPersonCases = async () => {
        try {
          setLoading(true);
          // Use the correct API to get all cases for this person
          const casesData = await peopleApi.getCasesForPerson(person.person_id);
          setPersonCases(casesData || []);
          setError(null);
        } catch (err) {
          console.error('Failed to fetch person cases:', err);
          setError('Failed to load associated cases');
        } finally {
          setLoading(false);
        }
      };
      
      fetchPersonCases();
    }
  }, [open, person]);
  
  if (!person) return null;
  
  // Format date in MM/DD/YYYY format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
      data-aoi="Person Profile Dialog"
      PaperProps={{ sx: { maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ bgcolor: 'background.default', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-aoi="Dialog Title">
        <Typography variant="h6" component="div">
          Lookup Person
        </Typography>
        <Button 
          onClick={onClose} 
          variant="contained" 
          color="primary"
          sx={{ 
            bgcolor: '#01665e',
            color: 'white',
            textTransform: 'uppercase',
            minWidth: 'auto',
            px: 2,
            '&:hover': {
              bgcolor: '#014d47'
            }
          }}
          data-aoi="Cancel Button"
        >
          CANCEL
        </Button>
      </DialogTitle>
      
      <DialogContent dividers data-aoi="Dialog Content">
        <Paper elevation={0} sx={{ p: 2 }} data-aoi="Profile Paper">
          <Typography 
            variant="h6" 
            sx={{ mb: 0.5, fontWeight: 'bold' }}
            data-aoi="Personal Profile Header"
          >
            PERSONAL PROFILE
          </Typography>
          
          <Grid container spacing={1}>
            {/* Left column */}
            <Grid item xs={12} md={6} data-aoi="Left Column">
              <Box sx={{ mb: 0.5 }} data-aoi="First Name Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="First Name Label"
                >
                  First Name
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="First Name Value"
                >
                  {person.first_name || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="Last Name Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Last Name Label"
                >
                  Last Name
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="Last Name Value"
                >
                  {person.last_name || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="SSN Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="SSN Label"
                >
                  SSN
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="SSN Value"
                >
                  {person.ssn || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="Biological Gender Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Biological Gender Label"
                >
                  Biological Gender
                </Typography>
                <RadioGroup
                  row
                  value={person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Unknown'}
                  data-aoi="Biological Gender RadioGroup"
                >
                  <FormControlLabel 
                    value="Male" 
                    control={<Radio size="small" />} 
                    label="Male" 
                    data-aoi="Biological Gender Male Option"
                  />
                  <FormControlLabel 
                    value="Female" 
                    control={<Radio size="small" />} 
                    label="Female" 
                    data-aoi="Biological Gender Female Option"
                  />
                  <FormControlLabel 
                    value="Unknown" 
                    control={<Radio size="small" />} 
                    label="Unknown" 
                    data-aoi="Biological Gender Unknown Option"
                  />
                </RadioGroup>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="Religion Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Religion Label"
                >
                  Religion
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="Religion Value"
                >
                  {person.religion || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="VOCA Classification Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="VOCA Label"
                >
                  VOCA Classifications
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="VOCA Value"
                >
                  {person.voca_classification || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="Special Needs Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Special Needs Label"
                >
                  Special Needs
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="Special Needs Value"
                >
                  {person.special_needs || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="Comments Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Comments Label"
                >
                  Comments
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="Comments Value"
                >
                  {person.comments || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }} data-aoi="Prior Convictions Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Prior Convictions Label"
                >
                  Prior Convictions
                </Typography>
                <Checkbox 
                  checked={Boolean(person.prior_convictions)} 
                  disabled 
                  data-aoi="Prior Convictions Checkbox"
                />
              </Box>
              
              <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }} data-aoi="Sex Offender Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Sex Offender Label"
                >
                  Sexual Offender
                </Typography>
                <Checkbox 
                  checked={Boolean(person.sex_offender)} 
                  disabled 
                  data-aoi="Sex Offender Checkbox"
                />
              </Box>
            </Grid>
            
            {/* Right column */}
            <Grid item xs={12} md={6} data-aoi="Right Column">
              <Box sx={{ mb: 1 }} data-aoi="Middle Name Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Middle Name Label"
                >
                  Middle Name
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="Middle Name Value"
                >
                  {person.middle_name || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="Nickname Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Nickname Label"
                >
                  Nick Name
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="Nickname Value"
                >
                  {person.nick_name || person.first_name}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="DOB Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="DOB Label"
                >
                  Date of Birth
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="DOB Value"
                >
                  {formatDate(person.date_of_birth)}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="Race Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Race Label"
                >
                  Race
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="Race Value"
                >
                  {person.race || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="Self Identified Gender Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Self Identified Gender Label"
                >
                  Self Identified Gender
                </Typography>
                <RadioGroup
                  row
                  value={person.self_identified_gender || 'Unknown'}
                  data-aoi="Self Identified Gender RadioGroup"
                >
                  <FormControlLabel 
                    value="Male" 
                    control={<Radio size="small" />} 
                    label="Male" 
                    data-aoi="Self Identified Gender Male Option"
                  />
                  <FormControlLabel 
                    value="Female" 
                    control={<Radio size="small" />} 
                    label="Female" 
                    data-aoi="Self Identified Gender Female Option"
                  />
                  <FormControlLabel 
                    value="Unknown" 
                    control={<Radio size="small" />} 
                    label="Unknown" 
                    data-aoi="Self Identified Gender Unknown Option"
                  />
                </RadioGroup>
              </Box>
              
              <Box sx={{ mb: 1 }} data-aoi="Language Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Language Label"
                >
                  Language
                </Typography>
                <Typography 
                  variant="body1" 
                  component="span"
                  data-aoi="Language Value"
                >
                  {person.language || ''}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }} data-aoi="Convicted Against Children Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Convicted Against Children Label"
                >
                  Convicted of Crime Against Children
                </Typography>
                <Checkbox 
                  checked={Boolean(person.convicted_against_children)} 
                  disabled 
                  data-aoi="Convicted Against Children Checkbox"
                />
              </Box>
              
              <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }} data-aoi="Sex Predator Field">
                <Typography 
                  variant="body1" 
                  component="span" 
                  sx={{ fontWeight: 'bold', mr: 1 }}
                  data-aoi="Sex Predator Label"
                >
                  Sexual Predator
                </Typography>
                <Checkbox 
                  checked={Boolean(person.sex_predator)} 
                  disabled 
                  data-aoi="Sex Predator Checkbox"
                />
              </Box>
            </Grid>
          </Grid>
          
          {/* ALIASES Section */}
          <Divider sx={{ my: 3 }} />
          
          <Typography 
            variant="h6" 
            sx={{ mb: 0.5, fontWeight: 'bold' }}
            data-aoi="Aliases Header"
          >
            ALIASES
          </Typography>
          
          <TableContainer component={Paper} variant="outlined" data-aoi="Aliases Table Container">
            <Table size="small" data-aoi="Aliases Table">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'background.default' }}>
                  <TableCell data-aoi="Aliases Table Header Last Name">Last Name</TableCell>
                  <TableCell data-aoi="Aliases Table Header First Name">First Name</TableCell>
                  <TableCell data-aoi="Aliases Table Header Middle Name">Middle Name</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={3}
                    align="center"
                    sx={{ py: 2 }}
                    data-aoi="Aliases Empty Message"
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          disabled={aliasPage === 0}
                          onClick={() => setAliasPage(0)}
                          sx={{ p: 0.5 }}
                        >
                          <KeyboardDoubleArrowLeftIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          disabled={aliasPage === 0}
                          onClick={() => setAliasPage(prev => Math.max(0, prev - 1))}
                          sx={{ p: 0.5 }}
                        >
                          <KeyboardArrowLeftIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          size="small"
                          value={aliasPage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setAliasPage(Math.max(0, val));
                          }}
                          inputProps={{
                            style: { textAlign: 'center', width: '30px', padding: '2px 4px', fontSize: '14px' }
                          }}
                          sx={{ width: '50px', '& .MuiOutlinedInput-root': { height: '28px' } }}
                        />
                        <IconButton 
                          size="small" 
                          disabled={true}
                          onClick={() => setAliasPage(prev => prev + 1)}
                          sx={{ p: 0.5 }}
                        >
                          <KeyboardArrowRightIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          disabled={true}
                          onClick={() => setAliasPage(0)}
                          sx={{ p: 0.5 }}
                        >
                          <KeyboardDoubleArrowRightIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, textAlign: 'right', pr: 2 }}>
                        No items to display
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Associated Cases Section */}
          <Divider sx={{ my: 3 }} />
          
          <Typography 
            variant="h6" 
            sx={{ mb: 2, fontWeight: 'bold' }}
            data-aoi="Cases Header"
          >
            CASES
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={30} />
            </Box>
          ) : error ? (
            <Typography color="error" data-aoi="Cases Error Message">
              {error}
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" data-aoi="Cases Table Container">
              <Table size="small" data-aoi="Cases Table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'background.default' }}>
                    <TableCell data-aoi="Cases Table Header CAC Number">CAC Case Number</TableCell>
                    <TableCell data-aoi="Cases Table Header CAC Date">CAC Received Date</TableCell>
                    <TableCell data-aoi="Cases Table Header Relationship">Relationship to Victim</TableCell>
                    <TableCell data-aoi="Cases Table Header Role">Role</TableCell>
                    <TableCell data-aoi="Cases Table Header Age">Age</TableCell>
                    <TableCell data-aoi="Cases Table Header Household">Same Household</TableCell>
                    <TableCell data-aoi="Cases Table Header Custody">Custody</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {personCases.length > 0 ? (
                    personCases
                      .slice(casesPage * casesRowsPerPage, casesPage * casesRowsPerPage + casesRowsPerPage)
                      .map((caseInfo) => (
                      <TableRow key={caseInfo.case_id}>
                        <TableCell data-aoi="Case Row CAC Number">
                          <Typography
                            component="a"
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/case/${caseInfo.case_id}`);
                              onClose();
                            }}
                            sx={{
                              color: 'primary.main',
                              textDecoration: 'none',
                              cursor: 'pointer',
                              '&:hover': {
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {caseInfo.case_number || `#${caseInfo.case_id}`}
                          </Typography>
                        </TableCell>
                        <TableCell data-aoi="Case Row CAC Date">
                          {caseInfo.cac_received_date ? formatDate(caseInfo.cac_received_date) : ''}
                        </TableCell>
                        <TableCell data-aoi="Case Row Relationship">
                          {getRelationshipText(caseInfo.relationship_id) || 'Not specified'}
                        </TableCell>
                        <TableCell data-aoi="Case Row Role">
                          {caseInfo.role_id === 1 ? 'Alleged Victim / Client' : 
                           caseInfo.role_id === 2 ? 'Alleged Offender' : 
                           caseInfo.role_id === 3 ? 'Caregiver' : 
                           caseInfo.role_id === 4 ? 'Other' : 
                           caseInfo.role_id === 5 ? 'Witness' : 
                           'Unknown'}
                        </TableCell>
                        <TableCell data-aoi="Case Row Age">
                          {caseInfo.age || ''}
                        </TableCell>
                        <TableCell data-aoi="Case Row Household" align="center">
                          <Checkbox 
                            checked={Boolean(caseInfo.same_household)} 
                            disabled
                            size="small"
                          />
                        </TableCell>
                        <TableCell data-aoi="Case Row Custody" align="center">
                          {String(Boolean(caseInfo.custody))}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" data-aoi="No Cases Message">
                        No associated cases found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {/* Pagination for Cases */}
          {personCases.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton 
                  size="small" 
                  disabled={casesPage === 0}
                  onClick={() => setCasesPage(0)}
                  sx={{ p: 0.5 }}
                >
                  <KeyboardDoubleArrowLeftIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  disabled={casesPage === 0}
                  onClick={() => setCasesPage(prev => Math.max(0, prev - 1))}
                  sx={{ p: 0.5 }}
                >
                  <KeyboardArrowLeftIcon fontSize="small" />
                </IconButton>
                <TextField
                  size="small"
                  value={casesPage + 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    const maxPage = Math.ceil(personCases.length / casesRowsPerPage) - 1;
                    setCasesPage(Math.max(0, Math.min(maxPage, val - 1)));
                  }}
                  inputProps={{
                    style: { textAlign: 'center', width: '30px', padding: '2px 4px', fontSize: '14px' }
                  }}
                  sx={{ width: '50px', '& .MuiOutlinedInput-root': { height: '28px' } }}
                />
                <IconButton 
                  size="small" 
                  disabled={casesPage >= Math.ceil(personCases.length / casesRowsPerPage) - 1}
                  onClick={() => setCasesPage(prev => prev + 1)}
                  sx={{ p: 0.5 }}
                >
                  <KeyboardArrowRightIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  disabled={casesPage >= Math.ceil(personCases.length / casesRowsPerPage) - 1}
                  onClick={() => setCasesPage(Math.ceil(personCases.length / casesRowsPerPage) - 1)}
                  sx={{ p: 0.5 }}
                >
                  <KeyboardDoubleArrowRightIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {casesPage * casesRowsPerPage + 1} - {Math.min((casesPage + 1) * casesRowsPerPage, personCases.length)} of {personCases.length} items
              </Typography>
            </Box>
          )}
        </Paper>
      </DialogContent>
      
      <DialogActions data-aoi="Dialog Actions">
        {/* Cancel button moved to DialogTitle */}
      </DialogActions>
    </Dialog>
  );
};

export default PersonProfile;