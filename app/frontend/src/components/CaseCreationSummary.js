// src/components/CaseCreationSummary.js
import React, { useState, useEffect, useMemo } from 'react';
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
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormGroup,
  InputLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { peopleApi, casesApi, employeesApi } from '../services/api';
import { useCase } from '../context/CaseContext';
import './CaseGeneral.css';

const CaseCreationSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId: urlCaseId } = useParams();
  const { setCurrentCase } = useCase();

  // Get case_id from URL params, location state, or location state caseData
  const caseIdFromState = location.state?.caseId || location.state?.caseData?.case_id;
  const caseId = urlCaseId || caseIdFromState;

  // Use useMemo to stabilize array references and prevent infinite loops
  const victims = useMemo(() => location.state?.victims || [], [location.state?.victims]);
  const otherPeople = useMemo(() => location.state?.otherPeople || [], [location.state?.otherPeople]);
  const caseData = location.state?.caseData || null;
  const selectedCacId = location.state?.selectedCacId || null;

  const [caseInfo, setCaseInfo] = useState(null);
  const [primaryVictim, setPrimaryVictim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [caseManagerOptions, setCaseManagerOptions] = useState([]);
  const [loadingCaseManagers, setLoadingCaseManagers] = useState(false);
  const [caseManagerAgency, setCaseManagerAgency] = useState('');
  const [caseManager, setCaseManager] = useState('');
  const [selectedMdtMeetingTypes, setSelectedMdtMeetingTypes] = useState([]);

  // Services list for Agency And Personnel Assignments table
  const services = ['MDT', 'CPS', 'LE', 'Medical', 'FI', 'MH', 'VA', 'Prosecution'];

  // MDT Meeting Types options
  const mdtMeetingTypes = [
    'Anderson Co. Team',
    '31st Judicial District Team',
    'Blount Co. Team',
    'Cayuga County',
    'CFR Meeting',
    'Franklin County Human Trafficking Coalition',
    'CSEC MDT',
    'Hamilton County Human Trafficking Coalition',
    'Juvenile Offender MDT',
    'NorthCentral/SouthCentral MDT',
    'Medical Peer Review',
    'Peer Review',
    'Pre/Post FI Team Staffing',
    'Special Case Review',
    'Warren County MDT',
    'Worcester MDT',
    'Mental Health MDT Partner Meeting'
  ];

  // Case Manager Agency options
  const caseManagerAgencyOptions = [
    'A',
    'ABS Linkage Agreement Agency',
    'Anderson County Adult Services',
    'Anderson PD New Name',
    'Anderson School District',
    'Anderson SVU Team',
    'CAC of AnyTown',
    'Cayuga CPS',
    'Child Guidance',
    'Cuyahoga County CPS',
    'DA - Anderson Co. Juv Division',
    'DCS - Anderson Co.',
    'Department of Children\'s Services',
    'District Attorney\'s Office',
    'FBI',
    'Fort West Hospital',
    'Highway Patrol Road Crew',
    'Homeland Security',
    'LE - Anderson Co. PD',
    'LE - Anderson Co. Sheriff',
    'LE New Berlin City',
    'Medical Services',
    'Mental Health Agency',
    'Mental Health Professionals Of Nowhere USA',
    'Mercy Hospital',
    'MH County Services',
    'My MH Partner',
    'New City PD',
    'Oak Ridge Hospital',
    'Oak Ridge PD',
    'Ohio Mental Health Services',
    'Oklahoma Department of Human Services (Oklahoma city)',
    'Oklahoma Department of Human Services (Tulsa County)',
    'Police Dept.',
    'Riverside Middle School',
    'SHIELD CAC OKC',
    'SHIELD CAC Tulsa',
    'Springfield Children\'s Hospital',
    'St. Paul Hospital',
    'State Highway Patrol',
    'VA Associates',
    'Warren County CPS',
    'Warren County District Attorney',
    'Warren County Sherrif\'s Department'
  ];

  // Load case data if caseId is available - MUST load from API to get real case_number
  useEffect(() => {
    const loadCaseData = async () => {
      if (caseId) {
        // If we already have caseInfo for this caseId, don't reload
        if (caseInfo && caseInfo.case_id === caseId) {
          return;
        }
        
        try {
          setLoading(true);
          setError(null);
          
          // Always fetch from API to get the real case_number
          const data = await casesApi.getCaseById(caseId);
          
          // Validate that case_number exists (should always exist if case was created)
          if (!data.case_number) {
            console.warn(`Case ${caseId} exists but case_number is missing`);
            setError('Warning: Case number not found in database. Please contact support.');
          }
          
          setCaseInfo(data);
          
          // Load Case Manager Agency, Case Manager, and MDT Meeting Types from database
          if (data.case_manager_agency) {
            setCaseManagerAgency(data.case_manager_agency);
          }
          if (data.case_manager) {
            setCaseManager(data.case_manager);
          }
          if (data.mdt_meeting_types) {
            try {
              const parsedTypes = JSON.parse(data.mdt_meeting_types);
              if (Array.isArray(parsedTypes)) {
                setSelectedMdtMeetingTypes(parsedTypes);
              }
            } catch (e) {
              console.warn('Failed to parse MDT Meeting Types:', e);
            }
          }

          // Find primary victim (role_id = 1)
          if (data.case_person && data.case_person.length > 0) {
            const victim = data.case_person.find(cp => cp.role_id === 1);
            if (victim && victim.person) {
              setPrimaryVictim(victim.person);
            }
          }
        } catch (err) {
          console.error('Error loading case data:', err);
          setError(`Failed to load case data: ${err.message}`);
          // Don't set caseInfo if API call failed
          setCaseInfo(null);
        } finally {
          setLoading(false);
        }
      } else if (victims.length > 0 && !primaryVictim) {
        // If no caseId but we have victims, this should not happen in normal flow
        // But we'll prepare summary from state as fallback
        // Only set if primaryVictim is not already set to avoid unnecessary updates
        console.warn('CaseCreationSummary: No caseId provided, using state data as fallback');
        const firstVictim = victims[0];
        setPrimaryVictim({
          first_name: firstVictim.first_name || firstVictim.firstName,
          last_name: firstVictim.last_name || firstVictim.lastName
        });
      } else if (!caseId && victims.length === 0 && !error) {
        // No caseId and no victims - this is an error state
        // Only set error if not already set to avoid unnecessary updates
        setError('No case ID or victims provided. Cannot display case summary.');
      }
    };

    loadCaseData();
  }, [caseId]); // Only depend on caseId - victims is handled separately

  // Load Case Manager options from employees
  useEffect(() => {
    const loadCaseManagers = async () => {
      try {
        setLoadingCaseManagers(true);
        const employees = await employeesApi.getAllEmployees();
        const employeeNames = employees.map(emp => {
          const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
          return name || emp.employee_name || emp.name || emp;
        });
        setCaseManagerOptions(employeeNames);
      } catch (err) {
        console.error('Failed to load case managers:', err);
        setCaseManagerOptions([]);
      } finally {
        setLoadingCaseManagers(false);
      }
    };
    
    loadCaseManagers();
  }, []);

  // Separate effect to handle victims fallback when caseId is not available
  useEffect(() => {
    // Only handle victims if we don't have a caseId and haven't loaded caseInfo
    if (!caseId && victims.length > 0 && !primaryVictim) {
      console.warn('CaseCreationSummary: No caseId provided, using state data as fallback');
      const firstVictim = victims[0];
      setPrimaryVictim({
        first_name: firstVictim.first_name || firstVictim.firstName,
        last_name: firstVictim.last_name || firstVictim.lastName
      });
    }
  }, [caseId, victims, primaryVictim]);

  const handleDoneAndViewCase = async () => {
    // ⭐ Get the actual case_id to use
    // Priority: caseInfo.case_id > caseId from state/URL > caseInfo from API
    let finalCaseId = caseId;
    
    if (caseInfo && caseInfo.case_id) {
      finalCaseId = caseInfo.case_id;
    } else if (!finalCaseId && caseInfo) {
      // If we have caseInfo but no case_id, try to get it from the API response
      finalCaseId = caseInfo.case_id;
    }
    
    if (!finalCaseId) {
      setError('Case ID is missing. Cannot proceed to view case. Please ensure the case was created successfully.');
      return;
    }
    
    // Ensure caseId is a number
    const caseIdNum = typeof finalCaseId === 'string' ? parseInt(finalCaseId, 10) : finalCaseId;
    if (isNaN(caseIdNum) || caseIdNum <= 0) {
      setError(`Invalid Case ID: ${finalCaseId}. Cannot proceed to view case.`);
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      // Save Case Manager Agency, Case Manager, and MDT Meeting Types before navigating
      if (caseManagerAgency || caseManager || selectedMdtMeetingTypes.length > 0) {
        const mdtMeetingTypesJson = selectedMdtMeetingTypes.length > 0 
          ? JSON.stringify(selectedMdtMeetingTypes) 
          : null;
        
        console.log('💾 Saving Case Manager and MDT Meeting Types data:', {
          caseManagerAgency,
          caseManager,
          mdtMeetingTypes: selectedMdtMeetingTypes,
          mdtMeetingTypesJson
        });
        
        try {
          const updateData = {
            case_manager_agency: caseManagerAgency || null,
            case_manager: caseManager || null,
            mdt_meeting_types: mdtMeetingTypesJson
          };
          
          const updateResponse = await casesApi.updateCase(caseIdNum, updateData);
          console.log('✅ Saved Case Manager and MDT Meeting Types data:', {
            updateResponse,
            updateData
          });
        } catch (saveErr) {
          console.warn('⚠️ Could not save Case Manager/MDT data:', saveErr);
          // Don't fail the whole operation if this save fails
        }
      }
      
      // ⭐ STEP 1: Fetch the complete case object from API to ensure we have all data
      console.log('🔄 Fetching complete case data for case_id:', caseIdNum);
      const completeCaseData = await casesApi.getCaseById(caseIdNum);
      
      if (!completeCaseData || !completeCaseData.case_id) {
        throw new Error(`Failed to fetch case data for case_id: ${caseIdNum}`);
      }
      
      console.log('✅ Fetched complete case data:', completeCaseData);
      
      // ⭐ STEP 2: Set the case as current in global state
      // Convert case_id to string (as expected by CaseContext)
      const caseIdString = completeCaseData.case_id.toString();
      console.log('🔵 Setting currentCase to:', caseIdString);
      
      // Update currentCase first
      setCurrentCase(caseIdString);
      
      // ⭐ STEP 3: Navigate to CaseGeneral page with caseId and form data in state
      // This ensures CaseGeneral receives the data immediately via location.state
      console.log('🔄 Navigating to CaseGeneral with caseId and form data in state:', {
        caseId: caseIdString,
        caseManagerAgency,
        caseManager
      });
      navigate('/CaseGeneral', { 
        state: { 
          caseId: caseIdString,
          caseManagerAgency: caseManagerAgency || null,
          caseManager: caseManager || null
        },
        replace: false // Allow back navigation
      });
      
      // ⭐ STEP 4: Auto-refresh the page after a short delay to ensure all data is loaded
      // This ensures the page displays the correct case data immediately
      setTimeout(() => {
        console.log('🔄 Auto-refreshing page to ensure data is loaded');
        window.location.reload();
      }, 100); // Small delay to allow navigation to complete
      
    } catch (err) {
      console.error('❌ Error in handleDoneAndViewCase:', err);
      setError(`Failed to load case: ${err.message}`);
      setCreating(false);
    }
    // Note: setCreating(false) is not called here because we're navigating away
    // The component will unmount, so we don't need to reset the state
  };

  const handleDoneAndAddAnother = async () => {
    // Ensure case is created (caseId should already exist from previous steps)
    if (!caseId) {
      setError('Case ID is missing. Cannot proceed. Please ensure the case was created successfully.');
      return;
    }
    
    // Ensure caseId is a number
    const caseIdNum = typeof caseId === 'string' ? parseInt(caseId, 10) : caseId;
    if (isNaN(caseIdNum) || caseIdNum <= 0) {
      setError(`Invalid Case ID: ${caseId}. Cannot proceed.`);
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      // Verify case exists by fetching it from API
      const caseData = await casesApi.getCaseById(caseIdNum);
      if (!caseData || !caseData.case_id) {
        throw new Error(`Case ${caseIdNum} not found in database`);
      }
      
      console.log('✅ Case verified:', caseData.case_id);
      
      // Navigate to NewCase page with showLookup flag (same as "Create New Case(s)")
      navigate('/NewCase', {
        state: { 
          showLookup: true,
          timestamp: Date.now() // Add timestamp to ensure state changes on each click
        }
      });
    } catch (err) {
      console.error('❌ Error in handleDoneAndAddAnother:', err);
      setError(`Failed to verify case: ${err.message}`);
      setCreating(false);
    }
  };

  // Get case number for display - must come from API, no placeholders
  const getCaseNumber = () => {
    // Priority 1: Use caseInfo from API (most reliable)
    if (caseInfo?.case_number) {
      return caseInfo.case_number;
    }
    
    // Priority 2: Use caseData from state (fallback)
    if (caseData?.case_number) {
      return caseData.case_number;
    }
    
    // If still loading, show loading state
    if (loading) {
      return 'Loading...';
    }
    
    // If caseId exists but no case_number found, this is an error
    // Don't show TBD - show error message instead
    if (caseId) {
      return 'Error: Case number not found';
    }
    
    // Only show empty if no caseId at all (should not happen in normal flow)
    return '';
  };

  // Get primary victim name for display
  const getPrimaryVictimName = () => {
    if (primaryVictim) {
      const firstName = primaryVictim.first_name || primaryVictim.firstName || '';
      const lastName = primaryVictim.last_name || primaryVictim.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'N/A';
    }
    if (victims.length > 0) {
      const firstVictim = victims[0];
      const firstName = firstVictim.first_name || firstVictim.firstName || '';
      const lastName = firstVictim.last_name || firstVictim.lastName || '';
      return `${firstName} ${lastName}`.trim() || 'N/A';
    }
    return 'N/A';
  };

  if (loading && !caseInfo) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="case-general-container">
      {/* Outer White Container */}
      <Box 
        sx={{ 
          backgroundColor: '#ffffff',
          p: 3,
          borderRadius: 2,
          boxShadow: 1,
          mb: 4
        }}
      >
        {/* Section 1: Page Title and Action Buttons */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
            CREATE NEW CASE(S)
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleDoneAndAddAnother}
              disabled={creating || loading}
              sx={{
                backgroundColor: '#01665e',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#003C30',
                },
                '&:disabled': {
                  backgroundColor: '#cccccc',
                  color: '#666666',
                }
              }}
            >
              {creating ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                  Processing...
                </Box>
              ) : (
                'Done and Add Another Case'
              )}
            </Button>
            <Button
              variant="contained"
              onClick={handleDoneAndViewCase}
              disabled={creating || (victims.length === 0 && !caseId)}
              sx={{
                backgroundColor: '#01665e',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#003C30',
                },
                '&:disabled': {
                  backgroundColor: '#cccccc',
                  color: '#666666',
                }
              }}
            >
              {creating ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Creating...
                </>
              ) : (
                'Done and View Case'
            )}
          </Button>
        </Box>
        <Box sx={{ borderBottom: '1px solid #ddd', mt: 3, mb: 0 }}></Box>
      </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Section 2: Newly Opened Case(s) Table */}
      <Paper elevation={1} sx={{ p: 0, mb: 4, border: '1px solid #ddd', overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderBottom: '1px solid #ddd' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
            Newly Opened Case(s)
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              height: '200px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            <TableContainer 
              sx={{ 
                height: '100%'
              }}
            >
              <Table 
                size="small" 
                stickyHeader
                sx={{ 
                  '& .MuiTableCell-root': { border: '1px solid #d1d5db' }
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        textAlign: 'left', 
                        bgcolor: '#f5f5f5',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        backgroundColor: '#f5f5f5'
                      }}
                    >
                      CAC Case Number
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        fontWeight: 'bold', 
                        textAlign: 'left', 
                        bgcolor: '#f5f5f5',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        backgroundColor: '#f5f5f5'
                      }}
                    >
                      Alleged Victim/Client
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow hover>
                    <TableCell sx={{ textAlign: 'left' }}>{getCaseNumber()}</TableCell>
                    <TableCell sx={{ textAlign: 'left' }}>{getPrimaryVictimName()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </Paper>

      {/* Instructional Text */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{ mb: 1, color: '#666666' }}>
          Use the table below to identify agency and personnel (as known) from your multidisciplinary team who will be working on the case(s) listed above.
        </Typography>
        <Typography variant="body1" sx={{ mb: 1, color: '#666666' }}>
          Please note: all entries here will be displayed on all case(s) listed above.
        </Typography>
        <Typography variant="body1" sx={{ mb: 1, color: '#666666' }}>
          If you do not enter assignments/referrals below, you can enter them separately in each case record.
        </Typography>
      </Box>

      {/* Section 3: Agency And Personnel Assignments */}
      <Paper elevation={1} sx={{ p: 0, mb: 4, border: '1px solid #ddd', overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderBottom: '1px solid #ddd' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
            Agency And Personnel Assignments
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          >
            <TableContainer>
              <Table 
                size="small" 
                stickyHeader
                sx={{ 
                  '& .MuiTableCell-root': { border: '1px solid #d1d5db' }
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5', width: '120px' }}></TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>Service</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>Referral Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>Referred by</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>Providing Agency</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>Primary Contact</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', bgcolor: '#f5f5f5' }}>NA</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {services.map((service, index) => (
                    <TableRow 
                      key={service} 
                      hover
                      sx={{ bgcolor: index % 2 === 0 ? '#ffffff' : '#f5f5f5' }}
                    >
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            sx={{ 
                              minWidth: '60px', 
                              fontSize: '0.75rem',
                              borderColor: '#d1d5db',
                              color: '#374151',
                              backgroundColor: 'white',
                              '&:hover': {
                                backgroundColor: '#f3f4f6',
                                borderColor: '#9ca3af',
                              }
                            }}
                          >
                            Refer
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ 
                              minWidth: '40px', 
                              fontSize: '0.75rem',
                              borderColor: '#d1d5db',
                              color: '#374151',
                              backgroundColor: 'white',
                              '&:hover': {
                                backgroundColor: '#f3f4f6',
                                borderColor: '#9ca3af',
                              }
                            }}
                          >
                            NA
                          </Button>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{service}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}></TableCell>
                      <TableCell sx={{ textAlign: 'center' }}></TableCell>
                      <TableCell sx={{ textAlign: 'center' }}></TableCell>
                      <TableCell sx={{ textAlign: 'center' }}></TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Checkbox />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Case Manager Agency and Case Manager */}
          <Box sx={{ mt: 3, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  Case Manager Agency
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  variant="outlined"
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return '';
                      }
                      return selected;
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#ffffff'
                    }
                  }}
                  value={caseManagerAgency}
                  onChange={(e) => setCaseManagerAgency(e.target.value)}
                >
                  <MenuItem value="" disabled>
                    Select ...
                  </MenuItem>
                  {caseManagerAgencyOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button
                  variant="outlined"
                  startIcon={<span>+</span>}
                  sx={{
                    borderColor: '#d1d5db',
                    color: '#374151',
                    backgroundColor: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#f3f4f6',
                      borderColor: '#9ca3af',
                    }
                  }}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  Case Manager
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  variant="outlined"
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return '';
                      }
                      return selected;
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#ffffff'
                    }
                  }}
                  disabled={loadingCaseManagers}
                  value={caseManager}
                  onChange={(e) => setCaseManager(e.target.value)}
                >
                  <MenuItem value="" disabled>
                    {loadingCaseManagers ? 'Loading...' : 'Select ...'}
                  </MenuItem>
                  {caseManagerOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                {/* Empty space to align with above row */}
              </Grid>
            </Grid>
          </Box>

          {/* MDT Meeting Types */}
          <Box>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} sm={3}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', pt: 1 }}>
                  MDT Meeting Types
                </Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <FormGroup>
                  <Grid container spacing={1}>
                    {/* Left Column */}
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        {mdtMeetingTypes.slice(0, 9).map((type) => (
                          <FormControlLabel
                            key={type}
                            control={
                              <Checkbox
                                checked={selectedMdtMeetingTypes.includes(type)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMdtMeetingTypes([...selectedMdtMeetingTypes, type]);
                                  } else {
                                    setSelectedMdtMeetingTypes(selectedMdtMeetingTypes.filter(t => t !== type));
                                  }
                                }}
                              />
                            }
                            label={type}
                          />
                        ))}
                      </FormGroup>
                    </Grid>
                    {/* Right Column */}
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        {mdtMeetingTypes.slice(9).map((type) => (
                          <FormControlLabel
                            key={type}
                            control={
                              <Checkbox
                                checked={selectedMdtMeetingTypes.includes(type)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMdtMeetingTypes([...selectedMdtMeetingTypes, type]);
                                  } else {
                                    setSelectedMdtMeetingTypes(selectedMdtMeetingTypes.filter(t => t !== type));
                                  }
                                }}
                              />
                            }
                            label={type}
                          />
                        ))}
                      </FormGroup>
                    </Grid>
                  </Grid>
                </FormGroup>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
      </Box>
    </div>
  );
};

export default CaseCreationSummary;
