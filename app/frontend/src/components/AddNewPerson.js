// app/frontend/src/components/AddNewPerson.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  Button,
  Radio,
  RadioGroup,
  FormGroup,
  Snackbar,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  IconButton,
  Dialog,
  DialogContent
} from '@mui/material';
import { FirstPage, LastPage, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { casesApi, peopleApi, pickListsApi } from '../services/api';
import { formatSSN, unformatSSN } from '../utils/ssnFormatter';
import { formatDateForInput, formatDateForBackend, getTodayDateDallas } from '../utils/timezone';
import { stateOptions as defaultStateOptions } from '../constants/options';
import { getCountiesForState } from '../constants/stateCounties';
import Lookup from './Lookup';

const AddNewPerson = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get caseId and returnTo from location state
  const caseId = location.state?.caseId;
  const returnTo = location.state?.returnTo || '/CasePeople';
  
  // This is for creating a new person, so no targetPersonId
  const targetPersonId = null;
  
  const [caseData, setCaseData] = useState(null);
  const [primaryPerson, setPrimaryPerson] = useState(null);
  const [casePersonData, setCasePersonData] = useState(null);
  const [firstVictimPersonId, setFirstVictimPersonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [duplicateCheckSearchTerm, setDuplicateCheckSearchTerm] = useState('');
  const [duplicateCheckFirstName, setDuplicateCheckFirstName] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  
  // Store original data for cancel functionality
  const [originalPersonalProfileData, setOriginalPersonalProfileData] = useState(null);
  const [originalCaseSpecificData, setOriginalCaseSpecificData] = useState(null);
  
  
  // Personal Profile form data
  const [personalProfileData, setPersonalProfileData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    nickName: '',
    ssn: '',
    dateOfBirth: '',
    unknownDateOfBirth: false,
    dateOfDeath: '',
    dateAdded: '',
    biologicalSex: '',
    selfIdentifiedGender: [],
    pronouns: '',
    race: '',
    religion: '',
    firstLanguage: '',
    voca: [],
    specialPopulations: [],
    riskFactors: [],
    csec: [],
    csecInvolvement: [],
    ethnicity6: [],
    materialInvolvement: [],
    housingInsecurityRisk: '',
    tribe: '',
    priorConvictions: false,
    convictedAgainstChildren: false,
    sexOffender: false,
    sexPredator: false,
    specialNeeds: '', 
    commentsForPeople: '', 
    developmentalAge: '', 
    customField: '',
    bioCustomField7: '',
    bioCustomField8: '' 
  });

  // Personal Profile picklist options
  const [raceOptions, setRaceOptions] = useState([]);
  const [loadingPersonalProfilePickLists, setLoadingPersonalProfilePickLists] = useState(false);

  // Options for Personal Profile
  const religionOptions = ['Buddhist', 'Catholic', 'Hindu', 'Jewish', 'Mormon', 'Muslim', 'None', 'Protestant', 'Southern Baptist', 'Unknown'];
  const languageOptions = ['English', 'Spanish', 'French', 'Chinese', 'Arabic', 'Other', 'Unknown'];
  const vocaClassificationOptions = ['Autism', 'Behavioral Issues', 'Autism Spectrum', 'Deaf', 'LGBTQ Community', 'Physically Handicapped', 'Adult with Substantial Impairment', "Asperger's", 'Blind', 'Homeless', 'MMR', 'Veteran'];
  const specialPopulationsOptions = [
    'Deaf/Hard of Hearing',
    'Immigrants/Refugee or Asylum Seeking',
    'Military-Dependent',
    'Limited English Proficiency',
    'Indigenous/Tribal community',
    'Unstably Housed/Unhoused',
    'LGBTQIA+',
    'Cognitive, Physical, or Mental Disability',
    'Vision Impaired',
    'Other'
  ];
  const selfIdentifiedGenderOptions = [
    'Female',
    'Male',
    'Transgender Female',
    'Transgender Male',
    'Non-Binary',
    'Another Gender Identity',
    'Gender Queer',
    'Not Reported',
    'Not Tracked',
    'Unknown',
    'Decline to Answer',
    'Other'
  ];
  const pronounsOptions = ['He/Him', 'She/Her', 'They/Them', 'Ze/Hir', 'Other', 'Unknown', 'Decline to Answer'];

  const checkboxStyle = {
    '& .MuiCheckbox-root': { transform: 'scale(1.1)' },
    '& .MuiTypography-root': { fontSize: '0.95rem', lineHeight: 1.2 },
    mr: 2,
    mb: 1,
  };
  
  // Picklist options for Case Specific Information
  const [victimStatusOptions, setVictimStatusOptions] = useState([]);
  const [ageUnitOptions, setAgeUnitOptions] = useState([]);
  const [educationLevelOptions, setEducationLevelOptions] = useState([]);
  const [maritalStatusOptions, setMaritalStatusOptions] = useState([]);
  const [incomeLevelOptions, setIncomeLevelOptions] = useState([]);
  const [militaryTypeOptions, setMilitaryTypeOptions] = useState([]);
  const [militaryDependentRelationshipOptions, setMilitaryDependentRelationshipOptions] = useState([]);
  
  // Manual input fields state (for fields with "No search found, input manually" option)
  // Separate states for Personal Profile and Case Specific fields
  const [manualInputFields, setManualInputFields] = useState({});
  const [manualInputValues, setManualInputValues] = useState({});
  const [manualInputFieldsPersonalProfile, setManualInputFieldsPersonalProfile] = useState({});
  const [manualInputValuesPersonalProfile, setManualInputValuesPersonalProfile] = useState({});
  const [customField1Options, setCustomField1Options] = useState([]);
  const [relationshipOptions, setRelationshipOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [militaryConnectionOptions, setMilitaryConnectionOptions] = useState([]);
  const [loadingPickLists, setLoadingPickLists] = useState(false);
  
  // Contact Information options
  const [stateOptions, setStateOptions] = useState(defaultStateOptions || []);
  const [countyOptions, setCountyOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);
  const [peopleInCase, setPeopleInCase] = useState([]); // For "Copy contact info from"

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
    10: 'Self',
    11: 'Sibling',
    12: 'Other Family Member',
    13: 'Other'
  };

  // Helper function to get role text from role_id
  const getRoleText = (roleId) => {
    if (!roleId) return '';
    return ROLE_MAP[roleId] || `Role ${roleId}`;
  };

  // Helper function to get relationship text from relationship_id
  const getRelationshipText = (relationshipId) => {
    if (!relationshipId) return '';
    return RELATIONSHIP_MAP[relationshipId] || `Relationship ${relationshipId}`;
  };

  // Case Specific Information form data
  const [caseSpecificData, setCaseSpecificData] = useState({
    relationshipId: '',
    roleId: '',
    victimStatus: '',
    ageAtReferral: '',
    ageUnit: 'Years',
    sameHousehold: false,
    custody: false,
    // Contact Information fields (moved to separate section)
    streetAddress: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    region: '',
    cityStateZip: '', // Keep for backward compatibility
    countyRegion: '', // Keep for backward compatibility
    residesOutOfCountry: false,
    startDate: getTodayDateDallas(),
    endDate: '',
    homePhone: '',
    cellPhone: '',
    workPhone: '',
    emailAddress: '',
    copyContactFrom: '', // For "Copy contact info from" feature
    schoolOrEmployer: '',
    educationLevel: '',
    maritalStatus: '',
    incomeLevel: '',
    youthSexualBehaviors: false,
    militaryConnection: '',
    militaryType: '',
    militaryDependentRelationship: '',
    militaryConnectionName: '',
    customField1: '',
    csfEligible: false,
    transportationAssistance: false,
    customField4: '',
    community: {
      westHills: false,
      glenview: false,
      cedarBluffApartments: false,
      hardinValley: false
    },
    casePersonCustomField6: '',
    casePersonCustomField7: '',
    casePersonCustomField8: '',
    casePersonCustomField9: ''
  });

  // Load race picklist for Personal Profile
  useEffect(() => {
    const fetchRacePickList = async () => {
      try {
        setLoadingPersonalProfilePickLists(true);
        
        // First, find the People category
        const categories = await pickListsApi.getAllCategories();
        const peopleCategory = categories.find(c => c.category_name === 'People Tab');
        
        if (peopleCategory) {
          // Get pick lists for this category
          const pickLists = await pickListsApi.getPickListsByCategoryId(peopleCategory.category_id);
          
          // Find the Race pick list
          const raceList = pickLists.find(list => list.list_name === 'Race');
          
          if (raceList) {
            // Get the items for this pick list
            const items = await pickListsApi.getItemsByListId(raceList.list_id);
            setRaceOptions(items.map(item => item.value));
          } else {
            // Fallback to default options if Race pick list not found
            setRaceOptions([
              'American Indian/Alaska Native', 
              'Asian', 
              'Black/African American', 
              'Hispanic/Latino', 
              'Native Hawaiian/Pacific Islander', 
              'White', 
              'Multiple races', 
              'Other', 
              'Unknown'
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load race pick list:', err);
        // Fallback to default options if API call fails
        setRaceOptions([
          'American Indian/Alaska Native', 
          'Asian', 
          'Black/African American', 
          'Hispanic/Latino', 
          'Native Hawaiian/Pacific Islander', 
          'White', 
          'Multiple races', 
          'Other', 
          'Unknown'
        ]);
      } finally {
        setLoadingPersonalProfilePickLists(false);
      }
    };
    
    fetchRacePickList();
  }, []);

  // Load picklists for Case Specific Information (same pattern as NewCase.js)
  useEffect(() => {
    const loadPickLists = async () => {
      try {
        setLoadingPickLists(true);
        const categories = await pickListsApi.getAllCategories();
        // Use same category finding logic as NewCase.js
        const caseCategory = categories.find(c => 
          c.category_name === 'Case' || 
          c.category_name === 'Case Tab' ||
          c.category_name === 'Case Specific Information'
        ) || categories.find(c => c.category_name.toLowerCase().includes('case'));

        if (caseCategory) {
          const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
          
          // Load each picklist
          for (const list of pickLists) {
            const items = await pickListsApi.getItemsByListId(list.list_id);
            const values = items.map(item => item.value);
            
            if (list.list_name === 'Victim Status') {
              setVictimStatusOptions(values);
            } else if (list.list_name === 'Age Unit') {
              setAgeUnitOptions(values);
            } else if (list.list_name === 'Education Level') {
              setEducationLevelOptions(values);
            } else if (list.list_name === 'Marital Status') {
              setMaritalStatusOptions(values);
            } else if (list.list_name === 'Income Level') {
              setIncomeLevelOptions(values);
            } else if (list.list_name === 'Military Type') {
              setMilitaryTypeOptions(values);
            } else if (list.list_name === 'Military Dependent Relationship') {
              setMilitaryDependentRelationshipOptions(values);
            } else if (list.list_name === 'Custom Field 1') {
              setCustomField1Options(values);
            }
          }
        } else {
          // Fallback options if category not found (same as NewCase.js)
          console.warn('Case category not found, using fallback options');
          setEducationLevelOptions([
            'Preschool',
            'Elementary School',
            'Middle School',
            'High School',
            'High School Graduate - GED',
            'Some College',
            'Associate Degree',
            'Bachelor Degree',
            "Master's Degree",
            'PhD',
            'None',
            'Unknown'
          ]);
          setMaritalStatusOptions(['Single', 'Married', 'Widowed', 'Divorced', 'Separated']);
          setIncomeLevelOptions([
            '< $15,000',
            '> $15,000 and < $25,000',
            '> $25,000 and < $50,000',
            '> $50,000 and < $75,000',
            '> $75,000'
          ]);
          setMilitaryTypeOptions([
            'Military Dependent - Any branch (child)',
            'No Military Affiliation',
            'None Specified'
          ]);
          setMilitaryDependentRelationshipOptions([
            'Parent',
            'Stepparent',
            'Grandparent',
            'Other Relative',
            'Unknown'
          ]);
        }
      } catch (err) {
        console.error('Failed to load picklists:', err);
        // Fallback options if API call fails (same as NewCase.js)
        setEducationLevelOptions([
          'Preschool',
          'Elementary School',
          'Middle School',
          'High School',
          'High School Graduate - GED',
          'Some College',
          'Associate Degree',
          'Bachelor Degree',
          "Master's Degree",
          'PhD',
          'None',
          'Unknown'
        ]);
        setMaritalStatusOptions(['Single', 'Married', 'Widowed', 'Divorced', 'Separated']);
        setIncomeLevelOptions([
          '< $15,000',
          '> $15,000 and < $25,000',
          '> $25,000 and < $50,000',
          '> $50,000 and < $75,000',
          '> $75,000'
        ]);
        setMilitaryTypeOptions([
          'Military Dependent - Any branch (child)',
          'No Military Affiliation',
          'None Specified'
        ]);
        setMilitaryDependentRelationshipOptions([
          'Parent',
          'Stepparent',
          'Grandparent',
          'Other Relative',
          'Unknown'
        ]);
      } finally {
        setLoadingPickLists(false);
      }
    };

    loadPickLists();
  }, []);

  // Load people in case for "Copy contact info from" feature
  useEffect(() => {
    const loadPeopleInCase = async () => {
      if (!caseId) {
        setPeopleInCase([]);
        return;
      }
      try {
        const people = await peopleApi.getPeopleByCaseId(parseInt(caseId));
        setPeopleInCase(people || []);
      } catch (err) {
        console.error('Failed to load people in case:', err);
        setPeopleInCase([]);
      }
    };
    loadPeopleInCase();
  }, [caseId]);

  // Load case data (for validation only, not to load person data)
  useEffect(() => {
    const loadCaseData = async () => {
      if (!caseId) {
        // No case ID - this is normal, just show empty form
        setError(null);
        setLoading(false);
        setCaseData(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch case data to validate it exists and get cac_id
        const caseDataResponse = await casesApi.getCaseById(parseInt(caseId));
        console.log('[AddNewPerson] Loaded case data:', {
          case_id: caseDataResponse.case_id,
          cac_received_date: caseDataResponse.cac_received_date,
          cac_received_date_type: typeof caseDataResponse.cac_received_date,
          cac_received_date_value: caseDataResponse.cac_received_date
        });
        setCaseData(caseDataResponse);

        // Find first victim person ID (if any) to determine if role should be read-only
        if (caseDataResponse.case_person && caseDataResponse.case_person.length > 0) {
          const victims = caseDataResponse.case_person.filter(cp => cp.role_id === 1);
          if (victims.length > 0) {
            const sortedVictims = [...victims].sort((a, b) => a.person_id - b.person_id);
            setFirstVictimPersonId(sortedVictims[0].person_id);
          } else {
            setFirstVictimPersonId(null);
          }
        } else {
          setFirstVictimPersonId(null);
        }

        // For AddNewPerson, we don't load existing person data - form stays empty
        // Set loading to false since we're not loading person data
        // Note: Age calculation will be handled by useEffect when both caseData and dateOfBirth are available
        setLoading(false);
      } catch (err) {
        console.error('Failed to load case data:', err);
        const errorMessage = err.message || err.toString();
        // Only show error for real errors, not missing data
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setError('Network error: Unable to connect to the server. Please check if the backend API is running.');
        } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          // 404 means case doesn't exist - this is normal, don't show as error
          setError(null);
          setCaseData(null);
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
          setError('Server error: The server encountered an error. Please try again later or contact support.');
        } else {
          // Other errors - check if it's a data issue or real error
          if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
            setError(null);
            setCaseData(null);
          } else {
            setError('Failed to load case information. Please try again.');
          }
        }
        setLoading(false);
      }
    };

    loadCaseData();
  }, [caseId]);

  // Update county options when state changes (similar to NewCase.js)
  useEffect(() => {
    if (caseSpecificData.state) {
      const counties = getCountiesForState(caseSpecificData.state);
      console.log('[AddNewPerson] State changed:', {
        state: caseSpecificData.state,
        countiesCount: counties ? counties.length : 0,
        counties: counties
      });
      setCountyOptions(counties || []);
    } else {
      setCountyOptions([]);
    }
  }, [caseSpecificData.state]);

  // Calculate age at time of referral based on date of birth and date received by CAC
  // Uses Dallas timezone for consistent date handling
  const calculateAgeAtReferral = (dob, receivedDate) => {
    if (!dob || !receivedDate) {
      return '';
    }
    
    try {
      // Helper function to parse date safely in Dallas timezone
      const parseDate = (dateValue) => {
        if (dateValue instanceof Date) {
          // Get date components in Dallas timezone
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          const parts = formatter.formatToParts(dateValue);
          const year = parseInt(parts.find(p => p.type === 'year').value);
          const month = parseInt(parts.find(p => p.type === 'month').value);
          const day = parseInt(parts.find(p => p.type === 'day').value);
          return new Date(year, month - 1, day);
        }
        
        if (typeof dateValue === 'string') {
          // Handle YYYY-MM-DD format (from date input) - parse as Dallas timezone date
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            const [year, month, day] = dateValue.split('-').map(Number);
            return new Date(year, month - 1, day);
          }
          // Handle ISO string with time - convert to Dallas timezone
          if (dateValue.includes('T')) {
            const date = new Date(dateValue);
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: 'America/Chicago',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
            const parts = formatter.formatToParts(date);
            const year = parseInt(parts.find(p => p.type === 'year').value);
            const month = parseInt(parts.find(p => p.type === 'month').value);
            const day = parseInt(parts.find(p => p.type === 'day').value);
            return new Date(year, month - 1, day);
          }
          // Try parsing as is
          const date = new Date(dateValue);
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          const parts = formatter.formatToParts(date);
          const year = parseInt(parts.find(p => p.type === 'year').value);
          const month = parseInt(parts.find(p => p.type === 'month').value);
          const day = parseInt(parts.find(p => p.type === 'day').value);
          return new Date(year, month - 1, day);
        }
        
        return new Date(dateValue);
      };
      
      const birthDate = parseDate(dob);
      const referralDate = parseDate(receivedDate);
      
      if (isNaN(birthDate.getTime()) || isNaN(referralDate.getTime())) {
        console.warn('[AddNewPerson] Invalid date in calculateAgeAtReferral:', { dob, receivedDate, birthDate, referralDate });
        return '';
      }
      
      // Calculate age accurately
      let age = referralDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = referralDate.getMonth() - birthDate.getMonth();
      const dayDiff = referralDate.getDate() - birthDate.getDate();
      
      // If birthday hasn't occurred yet this year, subtract 1
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }
      
      return age >= 0 ? age.toString() : '';
    } catch (error) {
      console.error('[AddNewPerson] Error calculating age:', error, { dob, receivedDate });
      return '';
    }
  };

  // Auto-calculate age when caseData is loaded and dateOfBirth is available
  useEffect(() => {
    const receivedDate = caseData?.cac_received_date;
    const dob = personalProfileData.dateOfBirth;
    const isUnknownDOB = personalProfileData.unknownDateOfBirth;
    
    console.log('[AddNewPerson] Auto-calculate age effect triggered', {
      hasCaseData: !!caseData,
      cac_received_date: receivedDate,
      cac_received_date_type: typeof receivedDate,
      dateOfBirth: dob,
      unknownDateOfBirth: isUnknownDOB
    });
    
    if (receivedDate) {
      if (dob && !isUnknownDOB) {
        const calculatedAge = calculateAgeAtReferral(dob, receivedDate);
        console.log('[AddNewPerson] Calculated age:', calculatedAge, {
          dob,
          receivedDate,
          receivedDateType: typeof receivedDate
        });
        // Auto-calculate and fill age
        if (calculatedAge) {
          setCaseSpecificData(prev => {
            console.log('[AddNewPerson] Setting ageAtReferral to:', calculatedAge);
            return {
              ...prev,
              ageAtReferral: calculatedAge
            };
          });
        } else {
          console.warn('[AddNewPerson] Calculated age is empty, check date formats');
        }
      } else if (!dob || isUnknownDOB) {
        // Clear age if DOB is not available
        console.log('[AddNewPerson] Clearing age - DOB not available or unknown');
        setCaseSpecificData(prev => ({
          ...prev,
          ageAtReferral: ''
        }));
      }
    } else {
      console.log('[AddNewPerson] No cac_received_date available, cannot calculate age');
    }
  }, [caseData, personalProfileData.dateOfBirth, personalProfileData.unknownDateOfBirth]);

  // Handle manual input change for Personal Profile fields
  const handleManualInputChangePersonalProfile = (fieldName, value) => {
    setManualInputValuesPersonalProfile(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Update personalProfileData with manual input value
    setPersonalProfileData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle Personal Profile input change
  const handlePersonalProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Check if this is the "No search found, input manually" option
    if (value === '__MANUAL_INPUT__') {
      setManualInputFieldsPersonalProfile(prev => ({
        ...prev,
        [name]: true
      }));
      setManualInputValuesPersonalProfile(prev => ({
        ...prev,
        [name]: ''
      }));
      setPersonalProfileData(prev => ({
        ...prev,
        [name]: ''
      }));
      return;
    }
    
    // If switching away from manual input, clear manual input flag
    if (manualInputFieldsPersonalProfile[name]) {
      setManualInputFieldsPersonalProfile(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
      setManualInputValuesPersonalProfile(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    
    if (type === 'checkbox') {
      setPersonalProfileData((prev) => ({
        ...prev,
        [name]: checked
      }));
    } else {
      // Handle SSN formatting
      if (name === 'ssn') {
        const formatted = formatSSN(value);
        setPersonalProfileData((prev) => ({
          ...prev,
          [name]: formatted
        }));
        return;
      }
      
      const updatedPersonalProfile = {
        ...personalProfileData,
        [name]: value
      };
      
      setPersonalProfileData(updatedPersonalProfile);
      
      // Auto-calculate age when date of birth changes
      if (name === 'dateOfBirth') {
        console.log('[AddNewPerson] Date of birth changed', {
          value,
          hasCaseData: !!caseData,
          cac_received_date: caseData?.cac_received_date,
          unknownDateOfBirth: updatedPersonalProfile.unknownDateOfBirth
        });
        
        if (value && caseData?.cac_received_date && !updatedPersonalProfile.unknownDateOfBirth) {
          const calculatedAge = calculateAgeAtReferral(value, caseData.cac_received_date);
          console.log('[AddNewPerson] Calculated age from DOB change:', calculatedAge);
          setCaseSpecificData(prev => ({
            ...prev,
            ageAtReferral: calculatedAge
          }));
        } else {
          // Clear age if DOB is cleared or unknown
          console.log('[AddNewPerson] Clearing age - DOB cleared or unknown');
          setCaseSpecificData(prev => ({
            ...prev,
            ageAtReferral: ''
          }));
        }
      }
    }
  };

  // Handle unknown DOB checkbox
  const handleUnknownDOB = (e) => {
    const { checked } = e.target;
    setPersonalProfileData(prev => ({
      ...prev,
      unknownDateOfBirth: checked,
      dateOfBirth: checked ? '' : prev.dateOfBirth
    }));
    
    // Clear age if DOB is unknown
    if (checked) {
      setCaseSpecificData(prev => ({
        ...prev,
        ageAtReferral: ''
      }));
    } else {
      // Recalculate age if DOB is provided again
      if (personalProfileData.dateOfBirth && caseData?.cac_received_date) {
        const calculatedAge = calculateAgeAtReferral(
          personalProfileData.dateOfBirth,
          caseData.cac_received_date
        );
        setCaseSpecificData(prev => ({
          ...prev,
          ageAtReferral: calculatedAge
        }));
      }
    }
  };

  // Generic multi-select toggle handler
  const handleMultiSelectChange = (fieldName, value) => {
    setPersonalProfileData((prevData) => {
      const current = Array.isArray(prevData[fieldName]) ? prevData[fieldName] : [];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prevData, [fieldName]: updated };
    });
  };

  // Handle manual input change
  const handleManualInputChange = (fieldName, value) => {
    setManualInputValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Update caseSpecificData with manual input value
    setCaseSpecificData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle Case Specific Information input change
  const handleCaseSpecificChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Check if this is the "No search found, input manually" option
    if (value === '__MANUAL_INPUT__') {
      setManualInputFields(prev => ({
        ...prev,
        [name]: true
      }));
      setManualInputValues(prev => ({
        ...prev,
        [name]: ''
      }));
      setCaseSpecificData(prev => ({
        ...prev,
        [name]: ''
      }));
      return;
    }
    
    // If switching away from manual input, clear manual input flag
    if (manualInputFields[name]) {
      setManualInputFields(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
      setManualInputValues(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    
    setCaseSpecificData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle checkbox changes for Community
  const handleCommunityChange = (e) => {
    const { name, checked } = e.target;
    setCaseSpecificData(prev => ({
      ...prev,
      community: {
        ...prev.community,
        [name]: checked
      }
    }));
  };

  // Handle Save - Create new person and associate with case
  const handleSave = async () => {
    if (!caseId) {
      setError('Case ID is required');
      return;
    }

    setError(null);
    setSuccess(null);

    // Check for duplicate (same name + same date of birth) before creating; same name but different DOB is allowed
    if (personalProfileData.firstName && personalProfileData.lastName) {
      try {
        const duplicatePeople = await peopleApi.searchByName(
          personalProfileData.firstName.trim(),
          personalProfileData.lastName.trim()
        );
        const normDob = (d) => {
          if (!d) return '';
          const s = typeof d === 'string' ? d : (d.toISOString ? d.toISOString() : String(d));
          return s.slice(0, 10);
        };
        const inputDob = normDob(personalProfileData.dateOfBirth);
        const exactMatches = duplicatePeople.filter(person => {
          const personFirstName = (person.first_name || '').trim().toLowerCase();
          const personLastName = (person.last_name || '').trim().toLowerCase();
          const inputFirstName = personalProfileData.firstName.trim().toLowerCase();
          const inputLastName = personalProfileData.lastName.trim().toLowerCase();
          const nameMatch = personFirstName === inputFirstName && personLastName === inputLastName;
          const dobMatch = normDob(person.date_of_birth) === inputDob;
          return nameMatch && dobMatch;
        });
        if (exactMatches.length > 0) {
          setShowDuplicateWarning(true);
          setDuplicateCheckSearchTerm(personalProfileData.lastName.trim());
          setDuplicateCheckFirstName(personalProfileData.firstName.trim());
          setLookupModalOpen(true);
          const errorMessage = `A person with the same name and date of birth already exists: "${personalProfileData.firstName} ${personalProfileData.lastName}" (DOB ${inputDob || 'N/A'}). Please review before creating.`;
          setError(errorMessage);
          return;
        }
      } catch (err) {
        console.warn('Error checking for duplicate:', err);
      }
    }

    try {
      setSaving(true);

      // Get case data to obtain cac_id
      const caseData = await casesApi.getCaseById(parseInt(caseId));
      if (!caseData || !caseData.cac_id) {
        throw new Error('Failed to get case information');
      }

      // Map personal profile data to API format for creating new person
      const ssnForDB = personalProfileData.ssn ? unformatSSN(personalProfileData.ssn) : null;

      const personData = {
        cac_id: caseData.cac_id,
        first_name: personalProfileData.firstName || null,
        middle_name: personalProfileData.middleName || null,
        last_name: personalProfileData.lastName || null,
        suffix: personalProfileData.suffix || null,
        nick_name: personalProfileData.nickName || null,
        ssn: ssnForDB,
        // Always send YYYY-MM-DD strings to backend to avoid timezone shifts
        date_of_birth: personalProfileData.dateOfBirth || null,
        date_of_death: personalProfileData.dateOfDeath || null,
        date_added: personalProfileData.dateAdded || null,
        gender: personalProfileData.biologicalSex === 'Male' ? 'M' :
                personalProfileData.biologicalSex === 'Female' ? 'F' :
                personalProfileData.biologicalSex === 'Intersex' ? 'I' :
                personalProfileData.biologicalSex === 'Unknown' ? 'U' :
                personalProfileData.biologicalSex === 'Decline to Answer' ? 'D' : null,
        race: personalProfileData.race || null,
        religion: personalProfileData.religion || null,
        first_language: personalProfileData.firstLanguage || null,
        voca: personalProfileData.voca.join(',') || null,
        special_populations: personalProfileData.specialPopulations.join(',') || null,
        risk_factors: personalProfileData.riskFactors.join(',') || null,
        csec: personalProfileData.csec.join(',') || null,
        csec_involvement: personalProfileData.csecInvolvement.join(',') || null,
        self_identified_gender: personalProfileData.selfIdentifiedGender.join(',') || null,
        pronouns: personalProfileData.pronouns || null,
        ethnicity_6: personalProfileData.ethnicity6.join(',') || null,
        material_involvement: personalProfileData.materialInvolvement.join(',') || null,
        housing_insecurity_risk: personalProfileData.housingInsecurityRisk || null,
        tribe: personalProfileData.tribe || null,
        prior_convictions: personalProfileData.priorConvictions || false,
        convicted_against_children: personalProfileData.convictedAgainstChildren || false,
        sex_offender: personalProfileData.sexOffender || false,
        sex_predator: personalProfileData.sexPredator || false,
        special_needs: personalProfileData.specialNeeds || null,
        comments_for_people: personalProfileData.commentsForPeople || null,
        developmental_age: personalProfileData.developmentalAge || null,
        custom_field: personalProfileData.customField || null,
        bio_custom_field_7: personalProfileData.bioCustomField7 || null,
        bio_custom_field_8: personalProfileData.bioCustomField8 || null
      };

      // Create new person
      const createdPerson = await peopleApi.createPerson(personData);
      console.log('✅ Created new person:', createdPerson.person_id);

      // Associate person with case
      await peopleApi.associatePersonWithCase(
        createdPerson.person_id,
        parseInt(caseId),
        caseData.cac_id
      );

      // Convert community object to string
      const communityArray = [];
      if (caseSpecificData.community.westHills) communityArray.push('West Hills');
      if (caseSpecificData.community.glenview) communityArray.push('Glenview');
      if (caseSpecificData.community.cedarBluffApartments) communityArray.push('Cedar Bluff Apartments');
      if (caseSpecificData.community.hardinValley) communityArray.push('Hardin Valley');
      const communityString = communityArray.join(', ');

      // Use independent fields if available, otherwise parse from combined fields
      const city = caseSpecificData.city || (caseSpecificData.cityStateZip ? caseSpecificData.cityStateZip.split(',')[0]?.trim() : null) || null;
      const state = caseSpecificData.state || null;
      const zip = caseSpecificData.zip || null;
      const county = caseSpecificData.county || (caseSpecificData.countyRegion ? caseSpecificData.countyRegion.split(',')[0]?.trim() : null) || null;
      const region = caseSpecificData.region || (caseSpecificData.countyRegion ? caseSpecificData.countyRegion.split(',')[1]?.trim() : null) || null;

      // Ensure age is correctly parsed as integer
      let ageValue = null;
      if (caseSpecificData.ageAtReferral) {
        const parsedAge = parseInt(caseSpecificData.ageAtReferral, 10);
        if (!isNaN(parsedAge)) {
          ageValue = parsedAge;
        }
        console.log('[AddNewPerson] Age value for case_person:', {
          original: caseSpecificData.ageAtReferral,
          parsed: parsedAge,
          final: ageValue
        });
      }
      
      // Update case_person details
      const casePersonUpdateData = {
        relationship_id: caseSpecificData.relationshipId ? parseInt(caseSpecificData.relationshipId) : null,
        role_id: caseSpecificData.roleId ? parseInt(caseSpecificData.roleId) : null,
        victim_status: caseSpecificData.victimStatus || null,
        age: ageValue,
        age_unit: caseSpecificData.ageUnit || null,
        same_household: caseSpecificData.sameHousehold || false,
        custody: caseSpecificData.custody || false,
        address_line_1: caseSpecificData.streetAddress || null,
        address_line_2: caseSpecificData.addressLine2 || null,
        city: city,
        state_abbr: state,
        zip: zip,
        county: county,
        region: region,
        // Contact dates: also use timezone-free YYYY-MM-DD strings
        start_date: caseSpecificData.startDate || null,
        end_date: caseSpecificData.endDate || null,
        home_phone_number: caseSpecificData.homePhone || null,
        cell_phone_number: caseSpecificData.cellPhone || null,
        work_phone_number: caseSpecificData.workPhone || null,
        email_address: caseSpecificData.emailAddress || null,
        school_or_employer: caseSpecificData.schoolOrEmployer || null,
        education_level_id: caseSpecificData.educationLevel || null,
        marital_status_id: caseSpecificData.maritalStatus || null,
        income_level_id: caseSpecificData.incomeLevel || null,
        problematic_sex: caseSpecificData.youthSexualBehaviors || false,
        mili_connection: caseSpecificData.militaryConnection === 'Yes' || false,
        mili_type_id: caseSpecificData.militaryType || null,
        mili_dependent_relationship: caseSpecificData.militaryDependentRelationship || null,
        mili_connection_name: caseSpecificData.militaryConnectionName || null,
        custom_field_1: caseSpecificData.customField1 || null,
        csf_eligible_2: caseSpecificData.csfEligible || false,
        family_transport_assistance_3: caseSpecificData.transportationAssistance || false,
        custom_field_4: caseSpecificData.customField4 || null,
        community_5: communityString || null,
        case_person_custom_field_6: caseSpecificData.casePersonCustomField6 || null,
        case_person_custom_field_7: caseSpecificData.casePersonCustomField7 || null,
        case_person_custom_field_8: caseSpecificData.casePersonCustomField8 || null,
        case_person_custom_field_9: caseSpecificData.casePersonCustomField9 || null
      };

      await peopleApi.updateCasePersonDetails(createdPerson.person_id, parseInt(caseId), casePersonUpdateData);

      setSuccess('Person created and added to case successfully!');
      
      // Navigate back to returnTo page after a short delay
      setTimeout(() => {
        navigate(returnTo);
      }, 1500);
    } catch (err) {
      console.error('Failed to create person:', err);
      setError(`Failed to create person: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };


  // Handle Cancel - Navigate back
  const handleCancel = () => {
    navigate(returnTo);
  };

  if (loading) {
  return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/CasePeople')}>
          Return to People
        </Button>
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
      fontFamily: 'Arial, sans-serif'
    }}>
      <Paper elevation={3} sx={{ 
        p: 4, 
        my: 4,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Action buttons - Moved above PERSONAL PROFILE */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={saving || loading}
            sx={{ px: 4 }}
          >
            {saving ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                Saving...
              </Box>
            ) : (
              'SAVE'
            )}
          </Button>
          <Button
            variant="contained"
            onClick={handleCancel}
            disabled={saving || loading}
            sx={{ 
              px: 4,
              backgroundColor: '#dc3545',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#c82333',
              },
              '&:disabled': {
                backgroundColor: '#cccccc',
                color: '#666666',
              }
            }}
          >
            CANCEL
          </Button>
        </Box>

        {/* PERSONAL PROFILE Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            border: '1px solid #d1d5db',
            borderBottom: 'none',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            bgcolor: '#f5f5f5', 
            backgroundColor: '#f5f5f5', 
            p: 1.5,
            mb: 0
          }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, m: 0 }}>
              PERSONAL PROFILE
            </Typography>
          </Box>
          <Box sx={{
            border: '1px solid #d1d5db',
            borderTop: 'none',
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px',
            p: 3,
            mt: 0,
            backgroundColor: '#ffffff'
          }}>
            <Box component="form">
              <Grid container spacing={3}>
                {/* Name section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" color="error" sx={{ fontWeight: 600, textAlign: 'right' }}>First Name</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="firstName"
                    value={personalProfileData.firstName}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Middle Name</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="middleName"
                    value={personalProfileData.middleName}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" color="error" sx={{ fontWeight: 600, textAlign: 'right' }}>Last Name</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="lastName"
                    value={personalProfileData.lastName}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Suffix</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    name="suffix"
                    value={personalProfileData.suffix}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Nick Name</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    name="nickName"
                    value={personalProfileData.nickName}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>SSN</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="ssn"
                    value={personalProfileData.ssn || ''}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                    placeholder="___-__-____"
                    inputProps={{
                      maxLength: 11,
                      pattern: '[0-9]{3}-[0-9]{2}-[0-9]{4}'
                    }}
                  />
                </Grid>

                {/* Birth and Death section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Date of Birth</Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    name="dateOfBirth"
                    type="date"
                    value={personalProfileData.dateOfBirth}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                    disabled={personalProfileData.unknownDateOfBirth}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={personalProfileData.unknownDateOfBirth}
                        onChange={handleUnknownDOB}
                        name="unknownDateOfBirth"
                      />
                    }
                    label="Unknown Date of Birth"
                  />
                </Grid>

                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Date of Death</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="dateOfDeath"
                    type="date"
                    value={personalProfileData.dateOfDeath}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Biological Sex section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" color="error" sx={{ fontWeight: 600, textAlign: 'right' }}>Biological Sex</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <RadioGroup
                    row
                    name="biologicalSex"
                    value={personalProfileData.biologicalSex}
                    onChange={handlePersonalProfileChange}
                  >
                    <FormControlLabel value="Male" control={<Radio />} label="Male" />
                    <FormControlLabel value="Female" control={<Radio />} label="Female" />
                    <FormControlLabel value="Intersex" control={<Radio />} label="Intersex" />
                    <FormControlLabel value="Unknown" control={<Radio />} label="Unknown" />
                    <FormControlLabel value="Decline to Answer" control={<Radio />} label="Decline to Answer" />
                  </RadioGroup>
                </Grid>

                {/* Pronouns section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" color="error" sx={{ fontWeight: 600, textAlign: 'right' }}>Pronouns</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <RadioGroup
                    row
                    name="pronouns"
                    value={personalProfileData.pronouns}
                    onChange={handlePersonalProfileChange}
                  >
                    {pronounsOptions.map(option => (
                      <FormControlLabel 
                        key={option} 
                        value={option} 
                        control={<Radio />} 
                        label={option} 
                      />
                    ))}
                  </RadioGroup>
                </Grid>

                {/* Race section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" color="error" sx={{ fontWeight: 600, textAlign: 'right' }}>Race</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  {manualInputFieldsPersonalProfile.race ? (
                    <TextField
                      fullWidth
                      name="race"
                      value={manualInputValuesPersonalProfile.race || ''}
                      onChange={(e) => handleManualInputChangePersonalProfile('race', e.target.value)}
                      variant="outlined"
                      placeholder="Enter value manually"
                    />
                  ) : (
                    <TextField
                      select
                      fullWidth
                      name="race"
                      value={personalProfileData.race || ''}
                      onChange={handlePersonalProfileChange}
                      variant="outlined"
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => {
                          if (!value) {
                            return loadingPersonalProfilePickLists ? 'Loading options...' : '';
                          }
                          return value;
                        }
                      }}
                    >
                      {raceOptions.map(option => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                      <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                    </TextField>
                  )}
                </Grid>

                {/* Religion section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Religion</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  {manualInputFieldsPersonalProfile.religion ? (
                    <TextField
                      fullWidth
                      name="religion"
                      value={manualInputValuesPersonalProfile.religion || ''}
                      onChange={(e) => handleManualInputChangePersonalProfile('religion', e.target.value)}
                      variant="outlined"
                      placeholder="Enter value manually"
                    />
                  ) : (
                    <TextField
                      select
                      fullWidth
                      name="religion"
                      value={personalProfileData.religion || ''}
                      onChange={handlePersonalProfileChange}
                      variant="outlined"
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => {
                          if (!value) {
                            return '';
                          }
                          return value;
                        }
                      }}
                    >
                      {religionOptions.map(option => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                      <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                    </TextField>
                  )}
                </Grid>

                {/* Language section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Language</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  {manualInputFieldsPersonalProfile.firstLanguage ? (
                    <TextField
                      fullWidth
                      name="firstLanguage"
                      value={manualInputValuesPersonalProfile.firstLanguage || ''}
                      onChange={(e) => handleManualInputChangePersonalProfile('firstLanguage', e.target.value)}
                      variant="outlined"
                      placeholder="Enter value manually"
                    />
                  ) : (
                    <TextField
                      select
                      fullWidth
                      name="firstLanguage"
                      value={personalProfileData.firstLanguage || ''}
                      onChange={handlePersonalProfileChange}
                      variant="outlined"
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => {
                          if (!value) {
                            return '';
                          }
                          return value;
                        }
                      }}
                    >
                      {languageOptions.map(option => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                      <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                    </TextField>
                  )}
                </Grid>


                {/* VOCA Classification */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>
                    VOCA Classification
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <Grid container spacing={1}>
                    {vocaClassificationOptions.map((option) => (
                      <Grid item xs={12} sm={6} key={`voca-${option}`}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="voca"
                              checked={personalProfileData.voca.includes(option)}
                              onChange={() => handleMultiSelectChange('voca', option)}
                            />
                          }
                          label={option}
                          sx={checkboxStyle}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                {/* Special Populations */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" color="error" sx={{ fontWeight: 600, textAlign: 'right' }}>
                    Special Populations
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <Grid container spacing={1}>
                    {specialPopulationsOptions.map((option) => (
                      <Grid item xs={12} sm={6} key={option}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              name={`special_${option}`}
                              checked={personalProfileData.specialPopulations?.includes(option)}
                              onChange={() => handleMultiSelectChange('specialPopulations', option)}
                            />
                          }
                          label={option}
                          sx={checkboxStyle}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                {/* Risk Factors */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Risk Factors
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.riskFactors?.includes('Gifts/Bribes from non-caregivers')}
                              onChange={() => handleMultiSelectChange('riskFactors', 'Gifts/Bribes from non-caregivers')}
                            />
                          }
                          label="Gifts/Bribes from non-caregivers"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.riskFactors?.includes('Other')}
                              onChange={() => handleMultiSelectChange('riskFactors', 'Other')}
                            />
                          }
                          label="Other"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.riskFactors?.includes('Runaway')}
                              onChange={() => handleMultiSelectChange('riskFactors', 'Runaway')}
                            />
                          }
                          label="Runaway"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.riskFactors?.includes('Substance Abuse')}
                              onChange={() => handleMultiSelectChange('riskFactors', 'Substance Abuse')}
                            />
                          }
                          label="Substance Abuse"
                          sx={checkboxStyle}
                        />
                      </FormGroup>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.riskFactors?.includes('High Risk Sexual Behavior')}
                              onChange={() => handleMultiSelectChange('riskFactors', 'High Risk Sexual Behavior')}
                            />
                          }
                          label="High Risk Sexual Behavior"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.riskFactors?.includes('Risky Online Behavior')}
                              onChange={() => handleMultiSelectChange('riskFactors', 'Risky Online Behavior')}
                            />
                          }
                          label="Risky Online Behavior"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.riskFactors?.includes('Street Language')}
                              onChange={() => handleMultiSelectChange('riskFactors', 'Street Language')}
                            />
                          }
                          label="Street Language"
                          sx={checkboxStyle}
                        />
                      </FormGroup>
                    </Grid>
                  </Grid>
                </Grid>

                {/* CSEC */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    CSEC
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.csec?.includes('Child Pornography')}
                              onChange={() => handleMultiSelectChange('csec', 'Child Pornography')}
                            />
                          }
                          label="Child Pornography"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.csec?.includes('Sex Tourism')}
                              onChange={() => handleMultiSelectChange('csec', 'Sex Tourism')}
                            />
                          }
                          label="Sex Tourism"
                          sx={checkboxStyle}
                        />
                      </FormGroup>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.csec?.includes('Other')}
                              onChange={() => handleMultiSelectChange('csec', 'Other')}
                            />
                          }
                          label="Other"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.csec?.includes('Sex Trafficking')}
                              onChange={() => handleMultiSelectChange('csec', 'Sex Trafficking')}
                            />
                          }
                          label="Sex Trafficking"
                          sx={checkboxStyle}
                        />
                      </FormGroup>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Child Sexual Abuse Material Involvement */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>
                    Child Sexual Abuse Material Involvement
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.materialInvolvement?.includes('Distribution')}
                              onChange={() => handleMultiSelectChange('materialInvolvement', 'Distribution')}
                            />
                          }
                          label="Distribution"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.materialInvolvement?.includes('Other')}
                              onChange={() => handleMultiSelectChange('materialInvolvement', 'Other')}
                            />
                          }
                          label="Other"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.materialInvolvement?.includes('Trading')}
                              onChange={() => handleMultiSelectChange('materialInvolvement', 'Trading')}
                            />
                          }
                          label="Trading"
                          sx={checkboxStyle}
                        />
                      </FormGroup>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.materialInvolvement?.includes('Manufacturing')}
                              onChange={() => handleMultiSelectChange('materialInvolvement', 'Manufacturing')}
                            />
                          }
                          label="Manufacturing"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={personalProfileData.materialInvolvement?.includes('Possession')}
                              onChange={() => handleMultiSelectChange('materialInvolvement', 'Possession')}
                            />
                          }
                          label="Possession"
                          sx={checkboxStyle}
                        />
                      </FormGroup>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Special Needs Special Text */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Special Needs Special Text</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={1}
                    name="specialNeeds"
                    value={personalProfileData.specialNeeds}
                    onChange={handlePersonalProfileChange}
                  />
                </Grid>

                {/* Comments for people */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Comments for people</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={1}
                    name="commentsForPeople"
                    value={personalProfileData.commentsForPeople}
                    onChange={handlePersonalProfileChange}
                  />
                </Grid>

                {/* Prior Convictions */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Prior Convictions</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="priorConvictions"
                        checked={!!personalProfileData.priorConvictions}
                        onChange={handlePersonalProfileChange}
                      />
                    }
                    label=""
                    sx={checkboxStyle}
                  />
                </Grid>

                {/* Convicted Of Crime Against Children */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Convicted Of Crime Against Children</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="convictedAgainstChildren"
                        checked={!!personalProfileData.convictedAgainstChildren}
                        onChange={handlePersonalProfileChange}
                      />
                    }
                    label=""
                    sx={checkboxStyle}
                  />
                </Grid>

                {/* Sexual Offender */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Sexual Offender</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="sexOffender"
                        checked={!!personalProfileData.sexOffender}
                        onChange={handlePersonalProfileChange}
                      />
                    }
                    label=""
                    sx={checkboxStyle}
                  />
                </Grid>

                {/* Sexual Predator */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Sexual Predator</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="sexPredator"
                        checked={!!personalProfileData.sexPredator}
                        onChange={handlePersonalProfileChange}
                      />
                    }
                    label=""
                    sx={checkboxStyle}
                  />
                </Grid>

                {/* Housing Insecurity Risk? (1) */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Housing Insecurity Risk? (1)</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    select
                    fullWidth
                    name="housingInsecurityRisk"
                    value={personalProfileData.housingInsecurityRisk || ''}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) => {
                        if (!value) {
                          return '';
                        }
                        return value;
                      }
                    }}
                  >
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                    <MenuItem value="noanswer">No Answer</MenuItem>
                  </TextField>
                </Grid>

                {/* Developmental Age (2) */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Developmental Age (2)</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="developmentalAge"
                    value={personalProfileData.developmentalAge}
                    onChange={handlePersonalProfileChange}
                  />
                </Grid>

                {/* Date Added (3) */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Date Added (3)</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    type="date"
                    name="dateAdded"
                    value={personalProfileData.dateAdded || ''}
                    onChange={handlePersonalProfileChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* CSEC Involvement (4) */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>CSEC Involvement (4)</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        <FormControlLabel
                          control={<Checkbox checked={personalProfileData.csecInvolvement?.includes('USA')} onChange={() => handleMultiSelectChange('csecInvolvement', 'USA')} />}
                          label="USA"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={<Checkbox checked={personalProfileData.csecInvolvement?.includes('Mexico')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Mexico')} />}
                          label="Mexico"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={<Checkbox checked={personalProfileData.csecInvolvement?.includes('Foster Care Awol History')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Foster Care Awol History')} />}
                          label="Foster Care Awol History"
                          sx={checkboxStyle}
                        />
                      </FormGroup>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        <FormControlLabel
                          control={<Checkbox checked={personalProfileData.csecInvolvement?.includes('Canada')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Canada')} />}
                          label="Canada"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={<Checkbox checked={personalProfileData.csecInvolvement?.includes('Nicaragua')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Nicaragua')} />}
                          label="Nicaragua"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={<Checkbox checked={personalProfileData.csecInvolvement?.includes('El Salvador')} onChange={() => handleMultiSelectChange('csecInvolvement', 'El Salvador')} />}
                          label="El Salvador"
                          sx={checkboxStyle}
                        />
                        <FormControlLabel
                          control={<Checkbox checked={personalProfileData.csecInvolvement?.includes('Uzbekistan')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Uzbekistan')} />}
                          label="Uzbekistan"
                          sx={checkboxStyle}
                        />
                      </FormGroup>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Custom Field (5) */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Custom Field (5)</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="customField"
                    value={personalProfileData.customField}
                    onChange={handlePersonalProfileChange}
                  />
                </Grid>

                {/* Ethnicity 6 */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Ethnicity 6</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <FormGroup row>
                    <FormControlLabel
                      control={<Checkbox checked={personalProfileData.ethnicity6?.includes('Non-Hispanic')} onChange={() => handleMultiSelectChange('ethnicity6', 'Non-Hispanic')} />}
                      label="Non-Hispanic"
                      sx={checkboxStyle}
                    />
                    <FormControlLabel
                      control={<Checkbox checked={personalProfileData.ethnicity6?.includes('Hispanic')} onChange={() => handleMultiSelectChange('ethnicity6', 'Hispanic')} />}
                      label="Hispanic"
                      sx={checkboxStyle}
                    />
                  </FormGroup>
                </Grid>

                {/* Bio Custom Field 7 */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>Bio Custom Field 7</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="bioCustomField7"
                    value={personalProfileData.bioCustomField7}
                    onChange={handlePersonalProfileChange}
                  />
                </Grid>

                {/* Bio Custom Field 8 */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>Bio Custom Field 8</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    name="bioCustomField8"
                    value={personalProfileData.bioCustomField8}
                    onChange={handlePersonalProfileChange}
                  />
                </Grid>

                {/* New Mexico Pueblo or Tribe 9 */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>New Mexico Pueblo or Tribe 9</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
                  <TextField
                    select
                    fullWidth
                    name="tribe"
                    value={personalProfileData.tribe || ''}
                    onChange={handlePersonalProfileChange}
                    variant="outlined"
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) => {
                        if (!value) {
                          return 'Select Tribe';
                        }
                        return value;
                      }
                    }}
                  >
                    <MenuItem value="Acoma">Acoma</MenuItem>
                    <MenuItem value="Cochiti">Cochiti</MenuItem>
                    <MenuItem value="Isleta">Isleta</MenuItem>
                    <MenuItem value="Jemez">Jemez</MenuItem>
                    <MenuItem value="Laguna">Laguna</MenuItem>
                    <MenuItem value="Nambé">Nambé</MenuItem>
                    <MenuItem value="Ohkay Owingeh">Ohkay Owingeh</MenuItem>
                    <MenuItem value="Picuris">Picuris</MenuItem>
                    <MenuItem value="Pojoaque">Pojoaque</MenuItem>
                    <MenuItem value="Sandia">Sandia</MenuItem>
                    <MenuItem value="San Felipe">San Felipe</MenuItem>
                    <MenuItem value="San Ildefonso">San Ildefonso</MenuItem>
                    <MenuItem value="Santa Ana">Santa Ana</MenuItem>
                    <MenuItem value="Santa Clara">Santa Clara</MenuItem>
                    <MenuItem value="Santo Domingo">Santo Domingo</MenuItem>
                    <MenuItem value="Taos">Taos</MenuItem>
                    <MenuItem value="Tesuque">Tesuque</MenuItem>
                    <MenuItem value="Zia">Zia</MenuItem>
                    <MenuItem value="Zuni">Zuni</MenuItem>
                  </TextField>
                </Grid>

                {/* Runaway Incidents Section */}
                <Grid item xs={12}>
                  <Box sx={{ 
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    mt: 3
                  }}>
                    {/* Title Section */}
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      backgroundColor: '#f5f5f5',
                      p: 1.5,
                      borderBottom: '1px solid #d1d5db'
                    }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
                        Runaway Incidents
                      </Typography>
                    </Box>
                    
                    {/* Add Button Section */}
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      backgroundColor: '#f5f5f5',
                      p: 1.5,
                      borderBottom: '1px solid #d1d5db',
                      display: 'flex',
                      justifyContent: 'flex-start'
                    }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          // TODO: Implement add new record
                          console.log('Add new runaway incident');
                        }}
                        sx={{
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          borderColor: '#d1d5db',
                          textTransform: 'none',
                          '&:hover': {
                            backgroundColor: '#f5f5f5',
                            borderColor: '#9ca3af'
                          }
                        }}
                      >
                        + Add new record
                      </Button>
                    </Box>

                    {/* Table Section */}
                    <TableContainer component={Paper} sx={{ 
                      border: 'none',
                      borderRadius: 0,
                      boxShadow: 'none'
                    }}>
                      <Table sx={{ borderCollapse: 'collapse', minWidth: 650 }}>
                        <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                          <TableRow>
                            <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'left' }}>Action</TableCell>
                            <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'left' }}>Start Date</TableCell>
                            <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'left' }}>Length of Time</TableCell>
                            <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'left' }}>Location</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              align="left"
                              sx={{ border: '1px solid #e5e7eb', py: 2 }}
                            >
                              <Typography variant="body2" color="text.secondary">
                                No items to display
                              </Typography>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {/* Pagination Section */}
                    <Box sx={{ 
                      borderTop: '1px solid #e5e7eb',
                      bgcolor: '#f5f5f5',
                      backgroundColor: '#f5f5f5',
                      pt: 1
                    }}>
                      <TablePagination
                        component="div"
                        count={0}
                        page={0}
                        onPageChange={() => {}}
                        rowsPerPage={10}
                        onRowsPerPageChange={() => {}}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage="Items per page:"
                        ActionsComponent={(props) => (
                          <Box sx={{ flexShrink: 0, ml: 2 }}>
                            <IconButton onClick={() => props.onPageChange(null, 0)} disabled={props.page === 0}>
                              <FirstPage />
                            </IconButton>
                            <IconButton onClick={() => props.onPageChange(null, props.page - 1)} disabled={props.page === 0}>
                              <ChevronLeft />
                            </IconButton>
                            <IconButton onClick={() => props.onPageChange(null, props.page + 1)} disabled={props.page >= Math.ceil(props.count / props.rowsPerPage) - 1}>
                              <ChevronRight />
                            </IconButton>
                            <IconButton onClick={() => props.onPageChange(null, Math.max(0, Math.ceil(props.count / props.rowsPerPage) - 1))} disabled={props.page >= Math.ceil(props.count / props.rowsPerPage) - 1}>
                              <LastPage />
                            </IconButton>
                          </Box>
                        )}
                        sx={{
                          '& .MuiTablePagination-toolbar': {
                            paddingLeft: 0,
                            paddingRight: 0,
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
              </Box>
            </Box>
        </Box>

        {/* CONTACT INFORMATION Section */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ 
            border: '1px solid #d1d5db',
            borderBottom: 'none',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            bgcolor: '#f5f5f5', 
            backgroundColor: '#f5f5f5', 
            p: 1.5,
            mb: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, m: 0 }}>
              CONTACT INFORMATION
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Copy contact info from:
              </Typography>
              <TextField
                select
                size="small"
                value={caseSpecificData.copyContactFrom || ''}
                onChange={async (e) => {
                  const selectedPersonId = e.target.value;
                  setCaseSpecificData({...caseSpecificData, copyContactFrom: selectedPersonId});
                  
                  if (selectedPersonId) {
                    try {
                      // Get the selected person's case_person data
                      const people = await peopleApi.getPeopleByCaseId(parseInt(caseId));
                      const selectedPerson = people.find(p => p.person_id === parseInt(selectedPersonId));
                      
                      if (selectedPerson) {
                        // Copy contact information from selected person
                        setCaseSpecificData(prev => ({
                          ...prev,
                          streetAddress: selectedPerson.address_line_1 || prev.streetAddress,
                          addressLine2: selectedPerson.address_line_2 || prev.addressLine2,
                          city: selectedPerson.city || prev.city,
                          state: selectedPerson.state_abbr || prev.state,
                          zip: selectedPerson.zip || prev.zip,
                          county: selectedPerson.county || prev.county,
                          region: selectedPerson.region || prev.region,
                          residesOutOfCountry: selectedPerson.out_of_country || prev.residesOutOfCountry,
                          startDate: selectedPerson.start_date ? formatDateForInput(selectedPerson.start_date) : prev.startDate,
                          endDate: selectedPerson.end_date ? formatDateForInput(selectedPerson.end_date) : prev.endDate,
                          homePhone: selectedPerson.home_phone_number || prev.homePhone,
                          cellPhone: selectedPerson.cell_phone_number || prev.cellPhone,
                          workPhone: selectedPerson.work_phone_number || prev.workPhone,
                          emailAddress: selectedPerson.email_address || prev.emailAddress,
                        }));
                      }
                    } catch (err) {
                      console.error('Failed to copy contact info:', err);
                    }
                  }
                }}
                sx={{ minWidth: 200 }}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) => {
                    if (!value) return '';
                    const person = peopleInCase.find(p => p.person_id === parseInt(value));
                    return person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : '';
                  }
                }}
              >
                <MenuItem value="">Select a person</MenuItem>
                {peopleInCase.map((person) => (
                  <MenuItem key={person.person_id} value={person.person_id.toString()}>
                    {`${person.first_name || ''} ${person.last_name || ''}`.trim() || `Person ${person.person_id}`}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
          
          <Box sx={{
            border: '1px solid #d1d5db',
            borderTop: 'none',
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px',
            p: 3,
            mt: 0,
            backgroundColor: '#ffffff'
          }}>
            <Grid container spacing={3}>
              {/* Street Address */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Street Address</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  fullWidth
                  name="streetAddress"
                  value={caseSpecificData.streetAddress}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                  placeholder="Start Typing in Address..."
                />
              </Grid>

              {/* Address Line 2 */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Address Line 2</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  fullWidth
                  name="addressLine2"
                  value={caseSpecificData.addressLine2}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                />
              </Grid>

              {/* City, State, Zip - Three separate fields */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>City, State, Zip</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      name="city"
                      value={caseSpecificData.city}
                      onChange={handleCaseSpecificChange}
                      variant="outlined"
                      placeholder="City"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      name="state"
                      value={caseSpecificData.state}
                      onChange={(e) => {
                        const selectedState = e.target.value;
                        setCaseSpecificData({...caseSpecificData, state: selectedState});
                        // Update county options based on selected state
                        if (selectedState) {
                          const counties = getCountiesForState(selectedState);
                          console.log('[AddNewPerson] State selected:', {
                            state: selectedState,
                            countiesCount: counties ? counties.length : 0,
                            counties: counties
                          });
                          setCountyOptions(counties || []);
                        } else {
                          setCountyOptions([]);
                        }
                      }}
                      variant="outlined"
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => value || ''
                      }}
                    >
                      <MenuItem value="">State</MenuItem>
                      {stateOptions.map((state) => (
                        <MenuItem key={state} value={state}>
                          {state}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      name="zip"
                      value={caseSpecificData.zip}
                      onChange={handleCaseSpecificChange}
                      variant="outlined"
                      placeholder="Zip"
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* County, Region */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>County, Region</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Grid container spacing={2}>
                  {/* County (free text input) */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="county"
                      value={caseSpecificData.county || ''}
                      onChange={handleCaseSpecificChange}
                      variant="outlined"
                      placeholder="County"
                    />
                  </Grid>
                  {/* Region (dropdown with only 'null') */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      name="region"
                      value={caseSpecificData.region || 'null'}
                      onChange={handleCaseSpecificChange}
                      variant="outlined"
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => value || 'null'
                      }}
                    >
                      <MenuItem value="null">null</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </Grid>

              {/* Resides Out of Country */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Resides Out of Country</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Checkbox
                  checked={caseSpecificData.residesOutOfCountry}
                  onChange={(e) => setCaseSpecificData({...caseSpecificData, residesOutOfCountry: e.target.checked})}
                />
              </Grid>

              {/* Start Date */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Start Date</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  fullWidth
                  name="startDate"
                  type="date"
                  value={caseSpecificData.startDate}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* End Date */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>End Date</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  fullWidth
                  name="endDate"
                  type="date"
                  value={caseSpecificData.endDate}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Home Phone */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Home Phone</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  fullWidth
                  name="homePhone"
                  value={caseSpecificData.homePhone}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                />
              </Grid>

              {/* Cell Phone */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Cell Phone</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  fullWidth
                  name="cellPhone"
                  value={caseSpecificData.cellPhone}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                />
              </Grid>

              {/* Work Phone */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Work Phone</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  fullWidth
                  name="workPhone"
                  value={caseSpecificData.workPhone}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                />
              </Grid>

              {/* Email Address */}
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Email Address</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  fullWidth
                  name="emailAddress"
                  value={caseSpecificData.emailAddress}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* CASE SPECIFIC INFORMATION Section */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ 
            border: '1px solid #d1d5db',
            borderBottom: 'none',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            bgcolor: '#f5f5f5', 
            backgroundColor: '#f5f5f5', 
            p: 1.5,
            mb: 0
          }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, m: 0 }}>
              CASE SPECIFIC INFORMATION
            </Typography>
          </Box>
          
          <Box sx={{
            border: '1px solid #d1d5db',
            borderTop: 'none',
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px',
            p: 3,
            mt: 0,
            backgroundColor: '#ffffff'
          }}>
            <Grid container spacing={3}>
            {/* Relationship to Alleged Victim/Client */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Relationship to Alleged Victim/Client</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                select
                fullWidth
                name="relationshipId"
                value={caseSpecificData.relationshipId}
                onChange={handleCaseSpecificChange}
                variant="outlined"
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) => {
                    if (!value) {
                      return '';
                    }
                    return getRelationshipText(parseInt(value));
                  }
                }}
              >
                {Object.entries(RELATIONSHIP_MAP).map(([id, label]) => (
                  <MenuItem key={id} value={id}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Role */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Role</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                select
                fullWidth
                name="roleId"
                value={caseSpecificData.roleId}
                onChange={handleCaseSpecificChange}
                variant="outlined"
                disabled={false}
                InputProps={{}}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) => {
                    if (!value) {
                      return 'Select Role';
                    }
                    return getRoleText(parseInt(value));
                  }
                }}
              >
                {Object.entries(ROLE_MAP).map(([id, label]) => (
                  <MenuItem key={id} value={id}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Victim Status */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Victim Status</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                select
                fullWidth
                name="victimStatus"
                value={caseSpecificData.victimStatus}
                onChange={handleCaseSpecificChange}
                variant="outlined"
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) => {
                    if (!value) {
                      return '';
                    }
                    return value;
                  }
                }}
              >
                <MenuItem value="Primary">Primary</MenuItem>
                <MenuItem value="Secondary">Secondary</MenuItem>
                <MenuItem value="N/A">N/A</MenuItem>
              </TextField>
            </Grid>

            {/* Age at Time of Referral */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Age at Time of Referral</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="ageAtReferral"
                value={caseSpecificData.ageAtReferral}
                onChange={handleCaseSpecificChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                select
                fullWidth
                name="ageUnit"
                value={caseSpecificData.ageUnit || 'Years'}
                onChange={handleCaseSpecificChange}
                variant="outlined"
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) => {
                    if (!value) {
                      return loadingPickLists ? 'Loading options...' : 'Years';
                    }
                    return value;
                  }
                }}
              >
                {ageUnitOptions.length > 0 ? (
                  ageUnitOptions.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No options available</MenuItem>
                )}
              </TextField>
            </Grid>

            {/* In Same Household as Alleged Victim/Client */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>In Same Household as Alleged Victim/Client</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Checkbox
                checked={caseSpecificData.sameHousehold}
                onChange={(e) => setCaseSpecificData({...caseSpecificData, sameHousehold: e.target.checked})}
              />
            </Grid>

            {/* Has Custody of Alleged Victim/Client */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Has Custody of Alleged Victim/Client</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Checkbox
                checked={caseSpecificData.custody}
                onChange={(e) => setCaseSpecificData({...caseSpecificData, custody: e.target.checked})}
              />
            </Grid>

            {/* School or Employer */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>School Or Employer</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="schoolOrEmployer"
                value={caseSpecificData.schoolOrEmployer}
                onChange={handleCaseSpecificChange}
                variant="outlined"
              />
            </Grid>

            {/* Education Level */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Education Level</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              {manualInputFields.educationLevel ? (
                <TextField
                  fullWidth
                  name="educationLevel"
                  value={manualInputValues.educationLevel || ''}
                  onChange={(e) => handleManualInputChange('educationLevel', e.target.value)}
                  variant="outlined"
                  placeholder="Enter value manually"
                />
              ) : (
                <TextField
                  select
                  fullWidth
                  name="educationLevel"
                  value={caseSpecificData.educationLevel}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value) => {
                      if (!value) {
                        return loadingPickLists ? 'Loading options...' : '';
                      }
                      return value;
                    }
                  }}
                >
                  {educationLevelOptions.length > 0 ? (
                    educationLevelOptions.map(option => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No options available</MenuItem>
                  )}
                  <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                </TextField>
              )}
            </Grid>

            {/* Marital Status */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Marital Status</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              {manualInputFields.maritalStatus ? (
                <TextField
                  fullWidth
                  name="maritalStatus"
                  value={manualInputValues.maritalStatus || ''}
                  onChange={(e) => handleManualInputChange('maritalStatus', e.target.value)}
                  variant="outlined"
                  placeholder="Enter value manually"
                />
              ) : (
                <TextField
                  select
                  fullWidth
                  name="maritalStatus"
                  value={caseSpecificData.maritalStatus}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value) => {
                      if (!value) {
                        return loadingPickLists ? 'Loading options...' : '';
                      }
                      return value;
                    }
                  }}
                >
                  {maritalStatusOptions.length > 0 ? (
                    maritalStatusOptions.map(option => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No options available</MenuItem>
                  )}
                  <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                </TextField>
              )}
            </Grid>

            {/* Income Level of Household */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Income Level of Household</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              {manualInputFields.incomeLevel ? (
                <TextField
                  fullWidth
                  name="incomeLevel"
                  value={manualInputValues.incomeLevel || ''}
                  onChange={(e) => handleManualInputChange('incomeLevel', e.target.value)}
                  variant="outlined"
                  placeholder="Enter value manually"
                />
              ) : (
                <TextField
                  select
                  fullWidth
                  name="incomeLevel"
                  value={caseSpecificData.incomeLevel}
                  onChange={handleCaseSpecificChange}
                  variant="outlined"
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value) => {
                      if (!value) {
                        return loadingPickLists ? 'Loading options...' : '';
                      }
                      return value;
                    }
                  }}
                >
                  {incomeLevelOptions.length > 0 ? (
                    incomeLevelOptions.map(option => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No options available</MenuItem>
                  )}
                  <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                </TextField>
              )}
            </Grid>

            {/* Does this youth have Youth Problematic Sexual Behaviors? */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Does this youth have Youth Problematic Sexual Behaviors?</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Checkbox
                checked={caseSpecificData.youthSexualBehaviors}
                onChange={(e) => setCaseSpecificData({...caseSpecificData, youthSexualBehaviors: e.target.checked})}
              />
            </Grid>

            {/* Military Connection */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Military Connection</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                select
                fullWidth
                name="militaryConnection"
                value={caseSpecificData.militaryConnection}
                onChange={handleCaseSpecificChange}
                variant="outlined"
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) => {
                    if (!value) {
                      return '';
                    }
                    return value;
                  }
                }}
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Grid>

            {/* Military Type */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Military Type</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                select
                fullWidth
                name="militaryType"
                value={caseSpecificData.militaryType}
                onChange={handleCaseSpecificChange}
                variant="outlined"
                disabled={caseSpecificData.militaryConnection !== 'Yes'}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) => {
                    if (!value) {
                      return loadingPickLists ? 'Loading options...' : '';
                    }
                    return value;
                  }
                }}
              >
                {militaryTypeOptions.length > 0 ? (
                  militaryTypeOptions.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No options available</MenuItem>
                )}
              </TextField>
            </Grid>

            {/* Military Dependent Relationship */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Military Dependent Relationship</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                select
                fullWidth
                name="militaryDependentRelationship"
                value={caseSpecificData.militaryDependentRelationship}
                onChange={handleCaseSpecificChange}
                variant="outlined"
                disabled={caseSpecificData.militaryConnection !== 'Yes'}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) => {
                    if (!value) {
                      return loadingPickLists ? 'Loading options...' : '';
                    }
                    return value;
                  }
                }}
              >
                {militaryDependentRelationshipOptions.length > 0 ? (
                  militaryDependentRelationshipOptions.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No options available</MenuItem>
                )}
              </TextField>
            </Grid>

            {/* Military Connection Name */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Military Connection Name</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="militaryConnectionName"
                value={caseSpecificData.militaryConnectionName}
                onChange={handleCaseSpecificChange}
                variant="outlined"
                disabled={caseSpecificData.militaryConnection !== 'Yes'}
              />
            </Grid>

            {/* Custom Field (1) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Custom Field (1)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="customField1"
                value={caseSpecificData.customField1}
                onChange={handleCaseSpecificChange}
                variant="outlined"
              />
            </Grid>

            {/* CSF Eligible (2) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>CSF Eligible (2)</Typography>
            </Grid>
            <Grid item xs={12} sm={9} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={caseSpecificData.csfEligible} 
                    onChange={(e) => setCaseSpecificData({...caseSpecificData, csfEligible: e.target.checked})}
                  />
                }
                label="Yes"
              />
            </Grid>

            {/* Does family need transportation assistance? (3) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Does family need transportation assistance? (3)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Checkbox
                checked={caseSpecificData.transportationAssistance}
                onChange={(e) => setCaseSpecificData({...caseSpecificData, transportationAssistance: e.target.checked})}
              />
            </Grid>

            {/* Custom Field (4) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Custom Field (4)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="customField4"
                value={caseSpecificData.customField4}
                onChange={handleCaseSpecificChange}
                variant="outlined"
              />
            </Grid>

            {/* Community (5) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, pt: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Community (5)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={caseSpecificData.community.cedarBluffApartments} 
                      onChange={handleCommunityChange} 
                      name="cedarBluffApartments"
                    />
                  }
                  label="Cedar Bluff Apartments"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={caseSpecificData.community.hardinValley} 
                      onChange={handleCommunityChange} 
                      name="hardinValley"
                    />
                  }
                  label="Hardin Valley"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={caseSpecificData.community.westHills} 
                      onChange={handleCommunityChange} 
                      name="westHills"
                    />
                  }
                  label="West Hills"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={caseSpecificData.community.glenview} 
                      onChange={handleCommunityChange} 
                      name="glenview"
                    />
                  }
                  label="Glenview"
                />
              </FormGroup>
            </Grid>

            {/* Case Person Custom Field 6 */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Case Person Custom Field 6</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="casePersonCustomField6"
                value={caseSpecificData.casePersonCustomField6}
                onChange={handleCaseSpecificChange}
                variant="outlined"
              />
            </Grid>

            {/* Case Person Custom Field 7 */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Case Person Custom Field 7</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="casePersonCustomField7"
                value={caseSpecificData.casePersonCustomField7}
                onChange={handleCaseSpecificChange}
                variant="outlined"
              />
            </Grid>

            {/* Case Person Custom Field 8 */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Case Person Custom Field 8</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="casePersonCustomField8"
                value={caseSpecificData.casePersonCustomField8}
                onChange={handleCaseSpecificChange}
                variant="outlined"
              />
            </Grid>

            {/* Case Person Custom Field 9 */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Case Person Custom Field 9</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="casePersonCustomField9"
                value={caseSpecificData.casePersonCustomField9}
                onChange={handleCaseSpecificChange}
                variant="outlined"
              />
            </Grid>
          </Grid>
          </Box>
        </Box>
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>

      {/* Lookup Person Modal for Duplicate Names */}
      <Dialog
        open={lookupModalOpen}
        onClose={() => {
          setLookupModalOpen(false);
          setShowDuplicateWarning(false);
          setDuplicateCheckSearchTerm('');
          setDuplicateCheckFirstName('');
        }}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            height: 'auto',
            overflowY: 'visible'
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Lookup
            onPersonSelect={(person) => {
              // Pre-fill form with selected person data
              setPersonalProfileData(prev => ({
                ...prev,
                firstName: person.first_name || '',
                middleName: person.middle_name || '',
                lastName: person.last_name || '',
                dateOfBirth: person.date_of_birth || '',
                biologicalSex: person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : '',
                ssn: person.ssn ? formatSSN(person.ssn) : ''
              }));
              setLookupModalOpen(false);
              setShowDuplicateWarning(false);
              setDuplicateCheckSearchTerm('');
              setDuplicateCheckFirstName('');
            }}
            onClose={() => {
              setLookupModalOpen(false);
              setShowDuplicateWarning(false);
              setDuplicateCheckSearchTerm('');
              setDuplicateCheckFirstName('');
            }}
            currentCaseId={caseId}
            returnTo={returnTo}
            initialSearchTerm={duplicateCheckSearchTerm}
            initialFirstName={duplicateCheckFirstName}
            autoSearch={showDuplicateWarning}
          />
        </DialogContent>
      </Dialog>

    </Box>
  );
};

export default AddNewPerson;
