import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  FormGroup,
  Select,
  MenuItem,
  Grid,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  CircularProgress,
  Alert,
  InputLabel,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate, useLocation } from 'react-router-dom';
import Lookup from './Lookup';
import ConfirmationModal from './ConfirmationModal';
import { peopleApi, casesApi, pickListsApi, agenciesApi, employeesApi } from '../services/api';
import { useCase } from '../context/CaseContext';
import { getCountiesForState } from '../constants/stateCounties';
import { stateOptions as defaultStateOptions } from '../constants/options';
import { formatSSN, unformatSSN } from '../utils/ssnFormatter';
import { formatDateForInput, formatDateForBackend, getTodayDateDallas } from '../utils/timezone';

const NewCase = () => {
  console.log("NewCase component is rendering");
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCase, setCurrentCase } = useCase();
  
  // Determine mode from location state (victim or other)
  const mode = location.state?.personType || 'victim'; // Default to 'victim' if not specified
  const isVictim = mode === 'victim';
  const isOther = mode === 'other';
  
  // Get returnTo from location state
  const { personType, returnTo } = location.state || {};
  
  // State for person lookup modal
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [lastLookupTimestamp, setLastLookupTimestamp] = useState(null);
  const [duplicateCheckSearchTerm, setDuplicateCheckSearchTerm] = useState('');
  const [duplicateCheckFirstName, setDuplicateCheckFirstName] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Add state for the original person data (for comparison)
  const [originalPersonData, setOriginalPersonData] = useState(null);

  // Add state for confirmation modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  
  // Add loading and error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({
    firstName: '',
    lastName: '',
    reasonForReferral: '',
    relationship: ''
  });
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  // State for saving contact information
  const [savingContactInfo, setSavingContactInfo] = useState(false);
  
  // State to track created case and person IDs
  const [createdCaseId, setCreatedCaseId] = useState(null);
  const [createdPersonId, setCreatedPersonId] = useState(null);
  
  // Get case_id from location state (if already created)
  const existingCaseId = location.state?.caseId || location.state?.caseData?.case_id;
  const currentCaseId = createdCaseId || existingCaseId;
  
  // CAC selection state
  const [cacs, setCacs] = useState([]);
  const [selectedCacId, setSelectedCacId] = useState('');
  const [loadingCacs, setLoadingCacs] = useState(true);
  
  // CAC options for dropdown
  const [cacOptions, setCacOptions] = useState([]);
  
  // Relationship state for other people mode
  const [relationships, setRelationships] = useState([]);
  const [relationshipModalOpen, setRelationshipModalOpen] = useState(false);
  const [editingRelationshipIndex, setEditingRelationshipIndex] = useState(null);
  const [newRelationship, setNewRelationship] = useState({
    victimId: '',
    relationshipId: '',
    roleId: '',
    sameHousehold: false,
    custody: false
  });
  
  // State for loading victims list (for relationship dropdown)
  const [victimsList, setVictimsList] = useState([]);
  const [loadingVictims, setLoadingVictims] = useState(false);
  
  // Role and Relationship mappings (from CasesTab.js)
  const ROLE_MAP = {
    1: 'Alleged Co-victim',
    2: 'Alleged Offender',
    3: 'Caregiver',
    4: 'Other',
    5: 'Witness'
  };
  
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
  
  // Load victims list when in other mode (for relationship dropdown)
  useEffect(() => {
    if (isOther && location.state?.victims) {
      setVictimsList(location.state.victims);
    }
  }, [isOther, location.state]);
  
  // Handle edit relationship - open modal with existing data
  const handleEditRelationship = (index) => {
    const rel = relationships[index];
    setEditingRelationshipIndex(index);
    setNewRelationship({
      victimId: String(rel.victimId),
      relationshipId: String(rel.relationshipId),
      roleId: String(rel.roleId),
      sameHousehold: rel.sameHousehold || false,
      custody: rel.custody || false
    });
    setRelationshipModalOpen(true);
  };

  // Handle add/update relationship
  const handleAddRelationship = () => {
    if (!newRelationship.victimId || !newRelationship.relationshipId || !newRelationship.roleId) {
      setError('Please fill in all required fields: Victim, Relationship, and Role');
      return;
    }
    
    // Convert string IDs to numbers for consistency
    const victimId = String(newRelationship.victimId);
    const relationshipId = parseInt(newRelationship.relationshipId, 10);
    const roleId = parseInt(newRelationship.roleId, 10);
    
    const victim = victimsList.find(v => String(v.person_id) === victimId);
    const relationshipName = RELATIONSHIP_MAP[relationshipId] || `Relationship ${relationshipId}`;
    const roleName = ROLE_MAP[roleId] || `Role ${roleId}`;
    
    const relationshipRecord = {
      victimId: victimId,
      victimName: victim ? `${victim.first_name || ''} ${victim.last_name || ''}`.trim() : 'N/A',
      relationshipId: relationshipId,
      relationshipName: relationshipName,
      roleId: roleId,
      roleName: roleName,
      sameHousehold: newRelationship.sameHousehold,
      custody: newRelationship.custody
    };
    
    if (editingRelationshipIndex !== null) {
      // Update existing relationship
      setRelationships(prev => prev.map((rel, idx) => 
        idx === editingRelationshipIndex ? relationshipRecord : rel
      ));
      setEditingRelationshipIndex(null);
    } else {
      // Add new relationship
      setRelationships(prev => [...prev, relationshipRecord]);
    }
    
    setNewRelationship({
      victimId: '',
      relationshipId: '',
      roleId: '',
      sameHousehold: false,
      custody: false
    });
    setRelationshipModalOpen(false);
    setError(null); // Clear any previous errors
  };
  
  // Handle remove relationship
  const removeRelationship = (index) => {
    setRelationships(prev => prev.filter((_, i) => i !== index));
  };
  
  // Effect to open the lookup modal when component mounts or when showLookup flag is set
  useEffect(() => {
    // Check if showLookup flag is explicitly set (from CaseSelector)
    const shouldShowLookup = location.state?.showLookup === true;
    const currentTimestamp = location.state?.timestamp;
    
    // Only open lookup modal if we're creating a new person (not editing)
    const isEditMode = location.state?.editMode || location.state?.prefillFormData;
    const fromCasePersonList = location.state?.returnTo === '/CasePersonList';
    
    // Check if this is a new navigation (timestamp changed)
    const isNewNavigation = currentTimestamp && currentTimestamp !== lastLookupTimestamp;
    
    // Priority 1: If showLookup flag is set and it's a new navigation, always open modal
    if (shouldShowLookup && isNewNavigation) {
      setLookupModalOpen(true);
      setLastLookupTimestamp(currentTimestamp);
      return;
    }
    
    // Priority 2: If creating new person (not editing), open modal
    // This includes cases from CasePersonList (when not editing)
    // But only if showLookup is not explicitly set (to avoid conflicts)
    if (!shouldShowLookup && !isEditMode && !location.state?.prefillFormData) {
      setLookupModalOpen(true);
    }
  }, [location.state, lastLookupTimestamp]);
  
  // Effect to prefill form data when editing a temporary person (DEPRECATED - should use editMode)
  // This is kept for backward compatibility but should be removed in future
  useEffect(() => {
    if (location.state?.prefillFormData && !location.state?.editMode) {
      setFormData(location.state.prefillFormData);
    }
  }, [location.state]);
  
  // Effect to reset form when entering in create mode (from CasePersonList)
  // This ensures the form is empty when adding a new person
  useEffect(() => {
    const fromCasePersonList = location.state?.returnTo === '/CasePersonList';
    const isEditMode = location.state?.editMode;
    const hasPrefillData = location.state?.prefillFormData;
    
    // If coming from CasePersonList in create mode (not edit, no prefill), ensure form is reset
    if (fromCasePersonList && !isEditMode && !hasPrefillData) {
      // Reset relationships (important for other-people mode)
      setRelationships([]);
      setOriginalPersonData(null);
      
      // Reset form data to initial empty state
      // Note: formData is already initialized to empty state, but we ensure it stays empty
      // by checking if any key fields have been filled (if they have, it means we're editing)
      const hasData = formData.firstName || formData.lastName || formData.ssn;
      if (hasData && !originalPersonData) {
        // Form has data but no original person - this shouldn't happen in create mode
        // Reset to empty state
        setFormData(prev => ({
          ...prev,
          firstName: '',
          middleName: '',
          lastName: '',
          suffix: '',
          nickName: '',
          ssn: '',
          dateOfBirth: '',
          unknownDateOfBirth: false,
          dateOfDeath: '',
          biologicalSex: '',
          reasonForReferral: '',
          // Keep other fields as they may have default values
        }));
      }
    }
  }, [location.state?.returnTo, location.state?.editMode, location.state?.prefillFormData]);
  
  // Load CACs on component mount
  useEffect(() => {
    const loadCacs = async () => {
      try {
        setLoadingCacs(true);
        const response = await fetch('http://localhost:5000/api/agencies/cacs/all');
        if (!response.ok) {
          throw new Error('Failed to load CACs');
        }
        const data = await response.json();
        setCacs(data);
        // Set options for dropdown
        setCacOptions(data.map(cac => ({
          id: cac.cac_id,
          name: cac.cac_name
        })));
        if (data.length > 0) {
          setSelectedCacId(data[0].cac_id.toString());
        }
      } catch (error) {
        console.error('Failed to load CACs:', error);
        setError('Failed to load CAC centers. Please refresh the page.');
      } finally {
        setLoadingCacs(false);
      }
    };
    loadCacs();
  }, []);
  
  // Open lookup modal
  const handleOpenLookupModal = () => {
    setLookupModalOpen(true);
  };
  
  // Close lookup modal
  const handleCloseLookupModal = () => {
    setLookupModalOpen(false);
  };
  
  // Handle person selection from lookup
  const handlePersonSelect = async (person) => {
    console.log("Selected person from lookup:", person);
    
    try {
      // Fetch complete person data from API
      const fullPersonData = await peopleApi.getPersonById(person.person_id);
      console.log("Fetched complete person data:", fullPersonData);
      
      // Fetch address information from latest case_person record
      let addressData = null;
      try {
        const casesForPerson = await peopleApi.getCasesForPerson(person.person_id);
        if (casesForPerson && casesForPerson.length > 0) {
          // Get the first case (usually the most recent or primary case)
          addressData = casesForPerson[0];
          console.log("Fetched address data from case_person:", addressData);
        }
      } catch (addrError) {
        console.warn("Could not fetch address data:", addrError);
        // Continue without address data
      }
      
      // Format dates
      let formattedDob = '';
      if (fullPersonData.date_of_birth) {
        formattedDob = formatDateForInput(fullPersonData.date_of_birth);
      }

      let formattedDod = '';
      if (fullPersonData.date_of_death) {
        formattedDod = formatDateForInput(fullPersonData.date_of_death);
      }

      let formattedDateAdded = '';
      if (fullPersonData.date_added) {
        formattedDateAdded = formatDateForInput(fullPersonData.date_added);
      }

      // Format contact dates
      let formattedStartDate = '';
      if (addressData?.start_date) {
        formattedStartDate = formatDateForInput(addressData.start_date);
      }

      let formattedEndDate = '';
      if (addressData?.end_date) {
        formattedEndDate = formatDateForInput(addressData.end_date);
      }

      // Format SSN if it exists
      const formattedSSN = fullPersonData.ssn ? formatSSN(fullPersonData.ssn) : '';

      // Get race name from picklist if race_id exists
      let raceName = '';
      if (fullPersonData.race_id && raceOptions.length > 0) {
        // Try to find race name from options
        raceName = fullPersonData.race || '';
      } else {
        raceName = fullPersonData.race || '';
      }

      // Helper function to convert state abbreviation to full state name
      const getStateNameFromAbbr = (stateAbbr) => {
        if (!stateAbbr) return '';
        const stateMap = {
          'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
          'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
          'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
          'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
          'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
          'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
          'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
          'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
          'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
          'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
          'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
          'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
          'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
        };
        const abbr = stateAbbr.toUpperCase();
        return stateMap[abbr] || stateAbbr;
      };

      // Parse comma-separated strings into arrays
      const parseCommaString = (str) => {
        if (!str) return [];
        return str.split(',').map(s => s.trim()).filter(s => s);
      };

      // Map label names to formData field names
      const labelToFieldMap = {
        // VOCA Classification
        'Autism': 'autism',
        'Behavioral Issues': 'behavioralIssues',
        'Autism Spectrum': 'autismSpectrum',
        'Deaf': 'deaf',
        'LGBTQ Community': 'lgbtqCommunity',
        'Physically Handicapped': 'physicallyHandicapped',
        'Adult with Substantial Impairment': 'adultWithSubstantialImpairment',
        "Asperberger's": 'asperbergers',
        'Blind': 'blind',
        'Homeless': 'homeless',
        'MMR': 'mmr',
        'Veteran': 'veteran',
        // Special Populations
        'Deaf/Hard of Hearing': 'deafHardOfHearing',
        'Immigrants/Refugee or Asylum Seeking': 'immigrantsRefugees',
        'Military-Dependent': 'militaryDependent',
        'Limited English Proficiency': 'limitedEnglish',
        'Indigenous/Tribal community': 'indigenousTribal',
        'Unstably Housed/Unhoused': 'unstablyHoused',
        'LGBTQIA+': 'lgbtqiaPlus',
        'Cognitive, Physical, or Mental Disability': 'cognitivePhysicalMental',
        'Vision Impaired': 'visionImpaired',
        'Other': 'other',
        // Risk Factors
        'Gifts/Bribes from non-caregivers': 'giftsBribes',
        'Runaway': 'runaway',
        'Substance Abuse': 'substanceAbuse',
        // CSEC
        'USA': 'usa',
        'Mexico': 'mexico',
        'Foster Care': 'fosterCare',
        'Canada': 'canada',
        'Nicaragua': 'nicaragua',
        'El Salvador': 'elSalvador',
        'Uzbekistan': 'uzbekistan',
        // Self Identified Gender
        'Female': 'female',
        'Male': 'male',
        'Transgender Female': 'transgenderFemale',
        'Transgender Male': 'transgenderMale',
        'Non-Binary': 'nonBinary',
        'Gender Queer': 'genderQueer',
        'Another Gender Identity': 'anotherGenderIdentity',
        'Not Reported': 'notReported',
        'Not Tracked': 'notTracked',
        'Decline to Answer': 'declineToAnswer',
        'Unknown': 'unknown'
      };

      // Convert comma-separated string to checkbox object
      const stringToCheckboxObject = (str, defaultObj) => {
        if (!str) return defaultObj;
        const arr = parseCommaString(str);
        const obj = { ...defaultObj };
        arr.forEach(label => {
          const fieldName = labelToFieldMap[label];
          if (fieldName && obj.hasOwnProperty(fieldName)) {
            obj[fieldName] = true;
          }
        });
        return obj;
      };

      const personData = {
        person_id: fullPersonData.person_id,
        firstName: fullPersonData.first_name || '',
        middleName: fullPersonData.middle_name || '',
        lastName: fullPersonData.last_name || '',
        suffix: fullPersonData.suffix || '',
        nickName: fullPersonData.nick_name || '',
        ssn: formattedSSN,
        dateOfBirth: formattedDob,
        dateOfDeath: formattedDod,
        dateAdded: formattedDateAdded,
        biologicalSex: fullPersonData.gender === 'M' ? 'Male' : 
                       fullPersonData.gender === 'F' ? 'Female' :
                       fullPersonData.gender === 'I' ? 'Intersex' :
                       fullPersonData.gender === 'U' ? 'Unknown' :
                       fullPersonData.gender === 'D' ? 'Decline to Answer' : '',
        pronouns: fullPersonData.pronouns || '',
        race: raceName,
        religion: fullPersonData.religion || '',
        language: fullPersonData.first_language || '',
        // Convert comma-separated strings to checkbox objects
        vocaClassification: stringToCheckboxObject(
          fullPersonData.voca,
          {
            autism: false,
            behavioralIssues: false,
            autismSpectrum: false,
            deaf: false,
            lgbtqCommunity: false,
            physicallyHandicapped: false,
            adultWithSubstantialImpairment: false,
            asperbergers: false,
            blind: false,
            homeless: false,
            mmr: false,
            veteran: false
          }
        ),
        specialPopulations: stringToCheckboxObject(
          fullPersonData.special_populations,
          {
            deafHardOfHearing: false,
            immigrantsRefugees: false,
            militaryDependent: false,
            limitedEnglish: false,
            indigenousTribal: false,
            unstablyHoused: false,
            lgbtqiaPlus: false,
            cognitivePhysicalMental: false,
            visionImpaired: false,
            other: false
          }
        ),
        riskFactors: stringToCheckboxObject(
          fullPersonData.risk_factors,
          {
            giftsBribes: false,
            other: false,
            runaway: false,
            substanceAbuse: false
          }
        ),
        csec: stringToCheckboxObject(
          fullPersonData.csec,
          {
            usa: false,
            mexico: false,
            fosterCare: false,
            canada: false,
            nicaragua: false,
            elSalvador: false,
            uzbekistan: false
          }
        ),
        csecInvolvement: stringToCheckboxObject(
          fullPersonData.csec_involvement,
          {
            usa: false,
            mexico: false,
            fosterCare: false,
            canada: false,
            nicaragua: false,
            elSalvador: false,
            uzbekistan: false
          }
        ),
        selfIdentifiedGender: stringToCheckboxObject(
          fullPersonData.self_identified_gender,
          {
            female: false,
            transgenderFemale: false,
            transgenderMale: false,
            notReported: false,
            notTracked: false,
            declineToAnswer: false,
            male: false,
            other: false,
            nonBinary: false,
            anotherGenderIdentity: false,
            unknown: false,
            genderQueer: false
          }
        ),
        ethnicity: {
          nonHispanic: parseCommaString(fullPersonData.ethnicity_6).includes('Non-Hispanic'),
          hispanic: parseCommaString(fullPersonData.ethnicity_6).includes('Hispanic')
        },
        puebloORtribe: fullPersonData.pueblo_or_tribe || '',
        housingInsecurityRisk: fullPersonData.housing_insecurity_risk || '',
        tribe: fullPersonData.tribe || '',
        prior_convictions: fullPersonData.prior_convictions || false,
        convicted_against_children: fullPersonData.convicted_against_children || false,
        sex_offender: fullPersonData.sex_offender || false,
        sex_predator: fullPersonData.sex_predator || false,
        specialNeeds: fullPersonData.special_needs || '',
        comments: fullPersonData.comments_for_people || '',
        developmentalAge: fullPersonData.developmental_age || '',
        customField: fullPersonData.custom_field || '',
        bioCustomField1: fullPersonData.bio_custom_field_1 || '',
        bioCustomField2: fullPersonData.bio_custom_field_2 || '',
        // Contact Information from case_person
        contactStreetAddress: addressData?.address_line_1 || '',
        contactAddressLine2: addressData?.address_line_2 || '',
        contactCity: addressData?.city || '',
        contactState: addressData?.state_abbr ? getStateNameFromAbbr(addressData.state_abbr) : '',
        contactZip: addressData?.zip || '',
        contactCounty: addressData?.county || '',
        contactRegion: addressData?.region || 'null',
        contactResidesOutOfCountry: addressData?.out_of_country || false,
        contactStartDate: formattedStartDate || getTodayDate(),
        contactEndDate: formattedEndDate || '',
        contactHomePhone: addressData?.home_phone_number || '',
        contactCellPhone: addressData?.cell_phone_number || '',
        contactWorkPhone: addressData?.work_phone_number || '',
        contactEmailAddress: addressData?.email_address || '',
      };
      
      // Store the original data for later comparison
      setOriginalPersonData(personData);
      
      setFormData(prev => ({
        ...prev,
        ...personData
      }));
      
      // Update county options if state is set
      if (personData.contactState) {
        const counties = getCountiesForState(personData.contactState);
        setCountyOptions(counties);
      }
      
      // Close the lookup modal
      handleCloseLookupModal();
    } catch (error) {
      console.error("Error fetching person data:", error);
      // Fallback to basic data if API call fails
      let formattedDob = '';
      if (person.date_of_birth) {
        formattedDob = formatDateForInput(person.date_of_birth);
      }

      let formattedDod = '';
      if (person.date_of_death) {
        formattedDod = formatDateForInput(person.date_of_death);
      }

      const formattedSSN = person.ssn ? formatSSN(person.ssn) : '';

      const personData = {
        person_id: person.person_id,
        firstName: person.first_name || '',
        middleName: person.middle_name || '',
        lastName: person.last_name || '',
        suffix: person.suffix || '', 
        ssn: formattedSSN,
        dateOfBirth: formattedDob,
        dateOfDeath: formattedDod,
        biologicalSex: person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : '',
        pronouns: person.pronouns || '',
        prior_convictions: person.prior_convictions || false,
        convicted_against_children: person.convicted_against_children || false,
        sex_offender: person.sex_offender || false,
        sex_predator: person.sex_predator || false,
      };
      
      setOriginalPersonData(personData);
      setFormData(prev => ({
        ...prev,
        ...personData
      }));
      
      handleCloseLookupModal();
    }
  };
  
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    // Use Dallas timezone for today's date
    return getTodayDateDallas();
  };

  // Track which fields are using manual input
  const [manualInputFields, setManualInputFields] = useState({});
  const [manualInputValues, setManualInputValues] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    nickName: '',
    ssn: '',
    dateOfBirth: '',
    unknownDateOfBirth: false,
    dateOfDeath: '',
    biologicalSex: '',
    selfIdentifiedGender: {
      female: false,
      transgenderFemale: false,
      transgenderMale: false,
      notReported: false,
      notTracked: false,
      declineToAnswer: false,
      male: false,
      other: false,
      nonBinary: false,
      anotherGenderIdentity: false,
      unknown: false,
      genderQueer: false
    },
    pronouns: '',
    race: '',
    religion: '',
    language: '',
    // VOCA Classification
    vocaClassification: {
      autism: false,
      behavioralIssues: false,
      autismSpectrum: false,
      deaf: false,
      lgbtqCommunity: false,
      physicallyHandicapped: false,
      adultWithSubstantialImpairment: false,
      asperbergers: false,
      blind: false,
      homeless: false,
      mmr: false,
      veteran: false
    },
    // Special Populations
    specialPopulations: {
      deafHardOfHearing: false,
      immigrantsRefugees: false,
      militaryDependent: false,
      limitedEnglish: false,
      indigenousTribal: false,
      unstablyHoused: false,
      lgbtqiaPlus: false,
      cognitivePhysicalMental: false,
      visionImpaired: false,
      other: false
    },
    // Risk Factors
    riskFactors: {
      giftsBribes: false,
      other: false,
      runaway: false,
      substanceAbuse: false,
      highRiskSexual: false,
      riskyOnline: false,
      streetLanguage: false
    },
    // CSEC
    csec: {
      childPornography: false,
      sexTourism: false,
      other: false,
      sexTrafficking: false
    },
    // Child Pornography Involvement
    childPornographyInvolvement: {
      distribution: false,
      other: false,
      trading: false,
      manufacturing: false,
      possession: false
    },
    // Special Needs / Comments
    specialNeeds: '',
    comments: '',
    doTheyLikeCookies: '',
    developmentalAge: '',
    dateAdded: '',
    // CSEC Involvement
    csecInvolvement: {
      usa: false,
      mexico: false,
      fosterCare: false,
      canada: false,
      nicaragua: false,
      elSalvador: false,
      uzbekistan: false
    },
    customField: '',
    // Ethnicity
    ethnicity: {
      nonHispanic: false,
      hispanic: false
    },
    bioCustomField1: '',
    bioCustomField2: '',
    puebloORtribe: '',
    runawayIncidents: [],
    // Contact Information
    contactStreetAddress: '',
    contactAddressLine2: '',
    contactCity: '',
    contactState: '',
    contactZip: '',
    contactCounty: '',
    contactRegion: '',
    contactResidesOutOfCountry: false,
    contactStartDate: getTodayDate(),
    contactEndDate: '',
    contactHomePhone: '',
    contactCellPhone: '',
    contactWorkPhone: '',
    contactEmailAddress: '',
    // Case Specific Information
    victimStatus: '',
    ageAtReferral: '',
    ageUnit: 'Years',
    schoolOrEmployer: '',
    educationLevel: '',
    maritalStatus: '',
    incomeLevel: '',
    youthSexualBehaviors: false,
    militaryConnection: false,
    militaryType: '',
    militaryDependentRelationship: '',
    militaryConnectionName: '',
    customField1: '',
    csfEligible: false,
    transportationAssistance: '',
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
    casePersonCustomField9: '',
    // Referral section
    dateReceivedByCac: getTodayDate(),
    referralAgency: '',
    referralPerson: '',
    reasonForReferral: '',
    // Incident Information
    dateFirstReported: '',
    allegedMaltreatment: {
      adultSurvivorVOCAV1: false,
      childFatality: false,
      childPornography: false,
      childTrafficking: false,
      commerciallySexuallyExploitedChildren: false,
      childSexTrafficking: false,
      domesticMinorSexTrafficking: false,
      csec: false,
      humanTraffickingLaborExploitation: false,
      humanTraffickingSexualAbuse: false,
      massViolence: false,
      neglect: false,
      physicalAbuse: false,
      sextortion: false,
      teenDatingVictimization: false,
      vocaAbuseType: false,
      bullyingVOCAV2: false,
      childLaborTrafficking: false,
      childSexualAbuseMaterial: false,
      commercialSexualExploitationOfChildren: false,
      communityViolence: false,
      heroinExposure: false,
      drugEndangered: false,
      drugExposureOpiods: false,
      humanTraffickingSexualExploitation: false,
      interpersonalViolenceFamilyViolence: false,
      methamphetamineExposure2: false,
      newAbuseType: false,
      psychologicalAbuse: false,
      sexualAbuse: false,
      witnessToViolence: false
    },
    locationDescription: '',
    incidentState: '',
    incidentCounty: '',
    locationType: '',
    narrativeDescription: '',
    // Other Direct Services
    otherDirectServices: {
      caseManagementForDVVictim: false,
      crisisCounseling: false,
      fosterCarePhysical: false,
      medicalExamNotAbuse: false,
      therapy: false,
      fathersDayCamp: false,
      voca: false,
      adultTraumaHistory: false,
      movedToAnotherCAC: false,
      courtesyInterview: false,
      adultVictimsGroupTherapy: false,
      kidsSafetyPreventionGroup: false,
      siblingInterview: false,
      adultRapeCrisisCenterClient: false,
      satp: false,
      gap: false,
      servicesWereDeclined: false,
      youthWithProblematicSexualBehavior: false
    },
    directServiceComments: '',
    serviceLocation: '',
    covidRelated: false,
    historyOfDrugsViolence: [''],
    polyvictimization: '',
    whichCenterCase: {
      kidsHope: false,
      newHope: false
    },
    referralCustomField6: '',
    presentingCustomField7: [''],
    presentingCustomFieldChp8: '',
    presentingCustomFieldChp9: {
      fbi: false,
      yes: false,
      no: false
    },
    // Prior Interviews
    priorInterviews: [],
    // MDT
    mdtMeeting: ''
  });

  // State for runaway incident being added
  const [newRunawayIncident, setNewRunawayIncident] = useState({
    startDate: '',
    lengthOfTime: '',
    location: ''
  });

  // State for prior interview being added
  const [newPriorInterview, setNewPriorInterview] = useState({
    agency: '',
    interviewDate: ''
  });

  // Picklist options state
  const [raceOptions, setRaceOptions] = useState([]);
  const [religionOptions, setReligionOptions] = useState([]);
  
  // MDT Meeting options - sorted by date (most recent first)
  const mdtMeetingOptions = [
    'Anderson Co. Team - 1/9/2026 9:00 AM',
    'Peer Review - 12/22/2025 9:00 AM',
    'Anderson Co. Team - 12/19/2025 1:00 PM',
    'Hamilton County Human Trafficking Coalition - 12/15/2025 9:30 AM',
    'Anderson Co. Team - 7/29/2025 4:00 AM',
    'NorthCentral/SouthCentral MDT - 7/24/2025 8:00 AM',
    'Anderson Co. Team - 5/30/2025 9:00 AM',
    'Anderson Co. Team - 5/21/2025 9:00 AM',
    'Anderson Co. Team - 5/5/2025 11:30 AM',
    'Blount Co. Team - 3/20/2025 2:30 PM',
    '31st Judicial District Team - 3/13/2025 2:45 PM',
    'Anderson Co. Team - 3/7/2025 10:30 AM',
    'Anderson Co. Team - 2/14/2025 1:00 PM',
    'Anderson Co. Team - 1/31/2025 10:00 AM'
  ].sort((a, b) => {
    // Extract dates from strings and sort by date (most recent first)
    const getDate = (str) => {
      const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, month, day, year] = match;
        return new Date(year, month - 1, day);
      }
      return new Date(0);
    };
    return getDate(b) - getDate(a);
  });
  const [languageOptions, setLanguageOptions] = useState([]);
  const puebloTribeOptions = [
    'Acoma',
    'Cochiti',
    'Isleta',
    'Jemez',
    'Laguna',
    'Nambé',
    'Ohkay Owingeh',
    'Picuris',
    'Pojoaque',
    'Sandia',
    'San Felipe',
    'San Ildefonso',
    'Santa Ana',
    'Santa Clara',
    'Santo Domingo',
    'Taos',
    'Tesuque',
    'Zia',
    'Zuni'
  ];
  const [victimStatusOptions, setVictimStatusOptions] = useState([]);
  const [educationLevelOptions, setEducationLevelOptions] = useState([]);
  const [maritalStatusOptions, setMaritalStatusOptions] = useState([]);
  const [incomeLevelOptions, setIncomeLevelOptions] = useState([]);
  const [militaryTypeOptions, setMilitaryTypeOptions] = useState([]);
  const [militaryDependentRelationshipOptions, setMilitaryDependentRelationshipOptions] = useState([]);
  const [customField1Options, setCustomField1Options] = useState([]);
  const [ageUnitOptions, setAgeUnitOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [countyOptions, setCountyOptions] = useState([]);
  const [incidentCountyOptions, setIncidentCountyOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState(['null']); // Default to include 'null' option
  const [loadingPickLists, setLoadingPickLists] = useState(false);
  
  // Referral section options
  const [referralAgencyOptions, setReferralAgencyOptions] = useState([]);
  const [referralPersonOptions, setReferralPersonOptions] = useState([]);
  const [serviceLocationOptions, setServiceLocationOptions] = useState([]);
  const [loadingReferralOptions, setLoadingReferralOptions] = useState(false);
  
  // Pronouns options
  const pronounsOptions = ['He/Him', 'She/Her', 'They/Them', 'Ze/Hir', 'Other', 'Unknown', 'Decline to Answer'];
  
  // Load Victim Status picklist (same pattern as PersonBio.js Race)
  useEffect(() => {
    const fetchVictimStatusPickList = async () => {
      try {
        setLoadingPickLists(true);
        
        // First, find the Case category
        const categories = await pickListsApi.getAllCategories();
        const caseCategory = categories.find(c => 
          c.category_name === 'Case' || 
          c.category_name === 'Case Tab' ||
          c.category_name === 'Case Specific Information'
        ) || categories.find(c => c.category_name.toLowerCase().includes('case'));
        
        if (caseCategory) {
          // Get pick lists for this category
          const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
          
          // Find the Victim Status pick list
          const victimStatusList = pickLists.find(list => list.list_name === 'Victim Status');
          
          if (victimStatusList) {
            // Get the items for this pick list
            const items = await pickListsApi.getItemsByListId(victimStatusList.list_id);
            setVictimStatusOptions(items.map(item => item.value));
          } else {
            // Fallback to default options if pick list not found
            setVictimStatusOptions(['Primary', 'Secondary', 'N/A']);
          }
        } else {
          // Fallback if category not found
          setVictimStatusOptions(['Primary', 'Secondary', 'N/A']);
        }
      } catch (err) {
        console.error('Failed to load victim status pick list:', err);
        // Fallback to default options if API call fails
        setVictimStatusOptions(['Primary', 'Secondary', 'N/A']);
      } finally {
        setLoadingPickLists(false);
      }
    };
    
    fetchVictimStatusPickList();
  }, []);

  // Load Education Level picklist (same pattern as PersonBio.js Race)
  useEffect(() => {
    const fetchEducationLevelPickList = async () => {
      try {
        setLoadingPickLists(true);
        
        // First, find the Case category
        const categories = await pickListsApi.getAllCategories();
        const caseCategory = categories.find(c => 
          c.category_name === 'Case' || 
          c.category_name === 'Case Tab' ||
          c.category_name === 'Case Specific Information'
        ) || categories.find(c => c.category_name.toLowerCase().includes('case'));
        
        if (caseCategory) {
          // Get pick lists for this category
          const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
          
          // Find the Education Level pick list
          const educationLevelList = pickLists.find(list => list.list_name === 'Education Level');
          
          if (educationLevelList) {
            // Get the items for this pick list
            const items = await pickListsApi.getItemsByListId(educationLevelList.list_id);
            setEducationLevelOptions(items.map(item => item.value));
          } else {
            // Fallback to default options if pick list not found
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
          }
        } else {
          // Fallback if category not found
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
        }
      } catch (err) {
        console.error('Failed to load education level pick list:', err);
        // Fallback to default options if API call fails
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
      } finally {
        setLoadingPickLists(false);
      }
    };
    
    fetchEducationLevelPickList();
  }, []);

  // Load Marital Status picklist (same pattern as PersonBio.js Race)
  useEffect(() => {
    const fetchMaritalStatusPickList = async () => {
      try {
        setLoadingPickLists(true);
        
        // First, find the Case category
        const categories = await pickListsApi.getAllCategories();
        const caseCategory = categories.find(c => 
          c.category_name === 'Case' || 
          c.category_name === 'Case Tab' ||
          c.category_name === 'Case Specific Information'
        ) || categories.find(c => c.category_name.toLowerCase().includes('case'));
        
        if (caseCategory) {
          // Get pick lists for this category
          const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
          
          // Find the Marital Status pick list
          const maritalStatusList = pickLists.find(list => list.list_name === 'Marital Status');
          
          if (maritalStatusList) {
            // Get the items for this pick list
            const items = await pickListsApi.getItemsByListId(maritalStatusList.list_id);
            setMaritalStatusOptions(items.map(item => item.value));
          } else {
            // Fallback to default options if pick list not found
            setMaritalStatusOptions(['Single', 'Married', 'Widowed', 'Divorced', 'Separated']);
          }
        } else {
          // Fallback if category not found
          setMaritalStatusOptions(['Single', 'Married', 'Widowed', 'Divorced', 'Separated']);
        }
      } catch (err) {
        console.error('Failed to load marital status pick list:', err);
        // Fallback to default options if API call fails
        setMaritalStatusOptions(['Single', 'Married', 'Widowed', 'Divorced', 'Separated']);
      } finally {
        setLoadingPickLists(false);
      }
    };
    
    fetchMaritalStatusPickList();
  }, []);

  // Load Income Level picklist (same pattern as PersonBio.js Race)
  useEffect(() => {
    const fetchIncomeLevelPickList = async () => {
      try {
        setLoadingPickLists(true);
        
        // First, find the Case category
        const categories = await pickListsApi.getAllCategories();
        const caseCategory = categories.find(c => 
          c.category_name === 'Case' || 
          c.category_name === 'Case Tab' ||
          c.category_name === 'Case Specific Information'
        ) || categories.find(c => c.category_name.toLowerCase().includes('case'));
        
        if (caseCategory) {
          // Get pick lists for this category
          const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
          
          // Find the Income Level pick list
          const incomeLevelList = pickLists.find(list => list.list_name === 'Income Level');
          
          if (incomeLevelList) {
            // Get the items for this pick list
            const items = await pickListsApi.getItemsByListId(incomeLevelList.list_id);
            setIncomeLevelOptions(items.map(item => item.value));
          } else {
            // Fallback to default options if pick list not found
            setIncomeLevelOptions([
              '< $15,000',
              '> $15,000 and < $25,000',
              '> $25,000 and < $50,000',
              '> $50,000 and < $75,000',
              '> $75,000'
            ]);
          }
        } else {
          // Fallback if category not found
          setIncomeLevelOptions([
            '< $15,000',
            '> $15,000 and < $25,000',
            '> $25,000 and < $50,000',
            '> $50,000 and < $75,000',
            '> $75,000'
          ]);
        }
      } catch (err) {
        console.error('Failed to load income level pick list:', err);
        // Fallback to default options if API call fails
        setIncomeLevelOptions([
          '< $15,000',
          '> $15,000 and < $25,000',
          '> $25,000 and < $50,000',
          '> $50,000 and < $75,000',
          '> $75,000'
        ]);
      } finally {
        setLoadingPickLists(false);
      }
    };
    
    fetchIncomeLevelPickList();
  }, []);

  // Load Military Type picklist (same pattern as PersonBio.js Race)
  useEffect(() => {
    const fetchMilitaryTypePickList = async () => {
      try {
        setLoadingPickLists(true);
        
        // First, find the Case category
        const categories = await pickListsApi.getAllCategories();
        const caseCategory = categories.find(c => 
          c.category_name === 'Case' || 
          c.category_name === 'Case Tab' ||
          c.category_name === 'Case Specific Information'
        ) || categories.find(c => c.category_name.toLowerCase().includes('case'));
        
        if (caseCategory) {
          // Get pick lists for this category
          const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
          
          // Find the Military Type pick list
          const militaryTypeList = pickLists.find(list => list.list_name === 'Military Type');
          
          if (militaryTypeList) {
            // Get the items for this pick list
            const items = await pickListsApi.getItemsByListId(militaryTypeList.list_id);
            setMilitaryTypeOptions(items.map(item => item.value));
          } else {
            // Fallback to default options if pick list not found
            setMilitaryTypeOptions([
              'Military Dependent - Any branch (child)',
              'No Military Affiliation',
              'None Specified'
            ]);
          }
        } else {
          // Fallback if category not found
          setMilitaryTypeOptions([
            'Military Dependent - Any branch (child)',
            'No Military Affiliation',
            'None Specified'
          ]);
        }
      } catch (err) {
        console.error('Failed to load military type pick list:', err);
        // Fallback to default options if API call fails
        setMilitaryTypeOptions([
          'Military Dependent - Any branch (child)',
          'No Military Affiliation',
          'None Specified'
        ]);
      } finally {
        setLoadingPickLists(false);
      }
    };
    
    fetchMilitaryTypePickList();
  }, []);

  // Load Military Dependent Relationship picklist (same pattern as PersonBio.js Race)
  useEffect(() => {
    const fetchMilitaryDependentRelationshipPickList = async () => {
      try {
        setLoadingPickLists(true);
        
        // First, find the Case category
        const categories = await pickListsApi.getAllCategories();
        const caseCategory = categories.find(c => 
          c.category_name === 'Case' || 
          c.category_name === 'Case Tab' ||
          c.category_name === 'Case Specific Information'
        ) || categories.find(c => c.category_name.toLowerCase().includes('case'));
        
        if (caseCategory) {
          // Get pick lists for this category
          const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
          
          // Find the Military Dependent Relationship pick list
          const relationshipList = pickLists.find(list => list.list_name === 'Military Dependent Relationship');
          
          if (relationshipList) {
            // Get the items for this pick list
            const items = await pickListsApi.getItemsByListId(relationshipList.list_id);
            setMilitaryDependentRelationshipOptions(items.map(item => item.value));
          } else {
            // Fallback to default options if pick list not found
            setMilitaryDependentRelationshipOptions([
              'Parent',
              'Stepparent',
              'Grandparent',
              'Other Relative',
              'Unknown'
            ]);
          }
        } else {
          // Fallback if category not found
          setMilitaryDependentRelationshipOptions([
            'Parent',
            'Stepparent',
            'Grandparent',
            'Other Relative',
            'Unknown'
          ]);
        }
      } catch (err) {
        console.error('Failed to load military dependent relationship pick list:', err);
        // Fallback to default options if API call fails
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
    
    fetchMilitaryDependentRelationshipPickList();
  }, []);

  // Load Custom Field (1) picklist (same pattern as PersonBio.js Race)
  useEffect(() => {
    const fetchCustomField1PickList = async () => {
      try {
        setLoadingPickLists(true);
        
        // First, find the Case category
        const categories = await pickListsApi.getAllCategories();
        const caseCategory = categories.find(c => 
          c.category_name === 'Case' || 
          c.category_name === 'Case Tab' ||
          c.category_name === 'Case Specific Information'
        ) || categories.find(c => c.category_name.toLowerCase().includes('case'));
        
        if (caseCategory) {
          // Get pick lists for this category
          const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
          
          // Find the Custom Field (1) pick list
          const customField1List = pickLists.find(list => list.list_name === 'Custom Field (1)' || list.list_name === 'Custom Field 1');
          
          if (customField1List) {
            // Get the items for this pick list
            const items = await pickListsApi.getItemsByListId(customField1List.list_id);
            setCustomField1Options(items.map(item => item.value));
          } else {
            // Fallback to default options if pick list not found
            setCustomField1Options([
              'Male (1)',
              'Female (2)'
            ]);
          }
        } else {
          // Fallback if category not found
          setCustomField1Options([
            'Male (1)',
            'Female (2)'
          ]);
        }
      } catch (err) {
        console.error('Failed to load custom field (1) pick list:', err);
        // Fallback to default options if API call fails
        setCustomField1Options([
          'Male (1)',
          'Female (2)'
        ]);
      } finally {
        setLoadingPickLists(false);
      }
    };
    
    fetchCustomField1PickList();
  }, []);

  // Load Age Unit picklist (same pattern as PersonBio.js Race)
  useEffect(() => {
    const fetchAgeUnitPickList = async () => {
      try {
        setLoadingPickLists(true);
        
        // First, find the Case category
        const categories = await pickListsApi.getAllCategories();
        const caseCategory = categories.find(c => 
          c.category_name === 'Case' || 
          c.category_name === 'Case Tab' ||
          c.category_name === 'Case Specific Information'
        ) || categories.find(c => c.category_name.toLowerCase().includes('case'));
        
        if (caseCategory) {
          // Get pick lists for this category
          const pickLists = await pickListsApi.getPickListsByCategoryId(caseCategory.category_id);
          
          // Find the Age Unit pick list
          const ageUnitList = pickLists.find(list => list.list_name === 'Age Unit' || list.list_name === 'Age at Time of Referral Unit');
          
          if (ageUnitList) {
            // Get the items for this pick list
            const items = await pickListsApi.getItemsByListId(ageUnitList.list_id);
            setAgeUnitOptions(items.map(item => item.value));
          } else {
            // Fallback to default options if pick list not found
            setAgeUnitOptions(['Years', 'Months']);
          }
        } else {
          // Fallback if category not found
          setAgeUnitOptions(['Years', 'Months']);
        }
      } catch (err) {
        console.error('Failed to load age unit pick list:', err);
        // Fallback to default options if API call fails
        setAgeUnitOptions(['Years', 'Months']);
      } finally {
        setLoadingPickLists(false);
      }
    };
    
    fetchAgeUnitPickList();
  }, []);

  // Load other picklist options (Race, Religion, Language, States, Counties)
  useEffect(() => {
    const loadOtherPickListOptions = async () => {
      try {
        setLoadingPickLists(true);
        
        // Get all categories
        const categories = await pickListsApi.getAllCategories();
        
        // Load People category options (for race, religion, language)
        const peopleCategory = categories.find(c => c.category_name === 'People Tab');
        if (peopleCategory) {
          const pickLists = await pickListsApi.getPickListsByCategoryId(peopleCategory.category_id);
          
          for (const list of pickLists) {
            const items = await pickListsApi.getItemsByListId(list.list_id);
            const values = items.map(item => item.value);
            
            if (list.list_name === 'Race') {
              setRaceOptions(values);
            } else if (list.list_name === 'Religion') {
              setReligionOptions(values);
            } else if (list.list_name === 'Language' || list.list_name === 'First Language') {
              setLanguageOptions(values);
            }
          }
        }
        
        // Load States from agencies API, fallback to default list
        try {
          const response = await fetch('http://localhost:5000/api/agencies/states/all');
          if (response.ok) {
            const states = await response.json();
            const stateNames = states.map(s => s.state_name || s);
            // Ensure we have all 50 states + DC
            if (stateNames.length >= 50) {
              setStateOptions(stateNames);
            } else {
              // Use default list if API doesn't return all states
              setStateOptions(defaultStateOptions);
            }
          } else {
            // Use default list if API fails
            setStateOptions(defaultStateOptions);
          }
        } catch (err) {
          console.error('Failed to load states:', err);
          // Use default list as fallback
          setStateOptions(defaultStateOptions);
        }
        
        // Initialize county options based on current state (if any)
        if (formData.contactState) {
          const counties = getCountiesForState(formData.contactState);
          setCountyOptions(counties);
        } else {
          // Set default county options (DC Wards) if no state selected
          setCountyOptions([
            'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 
            'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8'
          ]);
        }
        
      } catch (err) {
        console.error('Failed to load other pick list options:', err);
        // Set fallback options
        setRaceOptions(['American Indian/Alaska Native', 'Asian', 'Black/African American', 'Hispanic/Latino', 'Native Hawaiian/Pacific Islander', 'White', 'Multiple races', 'Other', 'Unknown']);
        setReligionOptions(['Buddhist', 'Catholic', 'Hindu', 'Jewish', 'Mormon', 'Muslim', 'None', 'Protestant', 'Southern Baptist', 'Unknown']);
        setLanguageOptions(['English', 'Spanish', 'French', 'Chinese', 'Arabic', 'Other', 'Unknown']);
        setStateOptions(['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming']);
        setCountyOptions(['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8']);
      } finally {
        setLoadingPickLists(false);
      }
    };
    
    loadOtherPickListOptions();
    
    // Load Referral options
    const loadReferralOptions = async () => {
      try {
        setLoadingReferralOptions(true);
        
        // Load Referral Agencies
        try {
          const agencies = await agenciesApi.getAllAgencies();
          setReferralAgencyOptions(agencies.map(agency => agency.agency_name || agency.name || agency));
        } catch (err) {
          console.error('Failed to load referral agencies:', err);
          setReferralAgencyOptions([]);
        }
        
        // Load Referral Persons (Employees)
        try {
          const employees = await employeesApi.getAllEmployees();
          const employeeNames = employees.map(emp => {
            const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
            return name || emp.employee_name || emp.name || emp;
          });
          setReferralPersonOptions(employeeNames);
        } catch (err) {
          console.error('Failed to load referral persons:', err);
          // Even if API fails, set empty options
          setReferralPersonOptions([]);
        }
        
        // Load Service Locations (from picklists or use default)
        try {
          const categories = await pickListsApi.getAllCategories();
          const referralCategory = categories.find(c => 
            c.category_name === 'Referral' || 
            c.category_name.toLowerCase().includes('referral') ||
            c.category_name === 'Service Location'
          );
          
          if (referralCategory) {
            const pickLists = await pickListsApi.getPickListsByCategoryId(referralCategory.category_id);
            const serviceLocationList = pickLists.find(list => 
              list.list_name === 'Service Location' || 
              list.list_name.toLowerCase().includes('service location')
            );
            
            if (serviceLocationList) {
              const items = await pickListsApi.getItemsByListId(serviceLocationList.list_id);
              setServiceLocationOptions(items.map(item => item.value));
            } else {
              // Default options if not found
              setServiceLocationOptions(['Hopes Place', 'New Place']);
            }
          } else {
            // Default options if category not found
            setServiceLocationOptions(['Hopes Place', 'New Place']);
          }
        } catch (err) {
          console.error('Failed to load service locations:', err);
          setServiceLocationOptions(['Hopes Place', 'New Place']);
        }
      } catch (err) {
        console.error('Failed to load referral options:', err);
      } finally {
        setLoadingReferralOptions(false);
      }
    };
    
    loadReferralOptions();
  }, []);
  
  // Update county options when state changes
  useEffect(() => {
    if (formData.contactState) {
      const counties = getCountiesForState(formData.contactState);
      setCountyOptions(counties);
      // Clear county selection if it's not valid for the new state
      if (formData.contactCounty && !counties.includes(formData.contactCounty)) {
        setFormData(prev => ({ ...prev, contactCounty: '' }));
      }
    } else {
      // Reset to default DC Wards if no state selected
      setCountyOptions([
        'Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 
        'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8'
      ]);
    }
  }, [formData.contactState]);
  
  // Legacy useEffect for race (keeping for backward compatibility)
  useEffect(() => {
    const fetchRacePickList = async () => {
      try {
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
        setLoadingPickLists(false);
      }
    };
    
    fetchRacePickList();
  }, []);

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
        console.warn('[NewCase] Invalid date in calculateAgeAtReferral:', { dob, receivedDate, birthDate, referralDate });
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
      console.error('[NewCase] Error calculating age:', error, { dob, receivedDate });
      return '';
    }
  };

  // Handle manual input change
  const handleManualInputChange = (fieldName, value) => {
    setManualInputValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Update formData with manual input value
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Handle text field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
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
      setFormData(prev => ({
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
    
    // If State is changed, update County options and clear County value
    if (name === 'contactState') {
      const counties = getCountiesForState(value);
      setCountyOptions(counties);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        contactCounty: '' // Clear county when state changes
      }));
      return;
    }
    
    // Handle SSN formatting
    if (name === 'ssn') {
      const formatted = formatSSN(value);
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
      // Clear validation error for this field when user starts typing
      if (validationErrors[name]) {
        setValidationErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
      return;
    }
    
    // Update form data and auto-calculate age if needed
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // Auto-calculate age when date of birth or date received by CAC changes
      if (name === 'dateOfBirth' || name === 'dateReceivedByCac') {
        const dob = name === 'dateOfBirth' ? value : updated.dateOfBirth;
        const receivedDate = name === 'dateReceivedByCac' ? value : updated.dateReceivedByCac;
        
        if (dob && receivedDate && !updated.unknownDateOfBirth) {
          const calculatedAge = calculateAgeAtReferral(dob, receivedDate);
          if (calculatedAge) {
            updated.ageAtReferral = calculatedAge;
          } else {
            updated.ageAtReferral = '';
          }
        } else if (name === 'dateOfBirth' && (!value || updated.unknownDateOfBirth)) {
          // Clear age if DOB is cleared or unknown
          updated.ageAtReferral = '';
        }
      }
      
      return updated;
    });
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Check if this is a change to person data and we have original data to compare
    if (originalPersonData && 
        (name === 'firstName' || name === 'middleName' || name === 'lastName' || 
         name === 'suffix' || name === 'dateOfBirth' || name === 'gender')) {
      // Compare with original data
      if (originalPersonData[name] !== value) {
        console.log(`Person data changed: ${name} from "${originalPersonData[name]}" to "${value}"`);
        // We'll check for showing the modal during form submission
      }
    }
  };

  // Handle radio button changes
  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field when user selects an option
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle checkbox for unknown DOB
  const handleUnknownDOB = (e) => {
    const { checked } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        unknownDateOfBirth: checked,
        dateOfBirth: checked ? '' : prev.dateOfBirth
      };
      
      // Clear age if DOB is unknown, or recalculate if DOB is provided again
      if (checked) {
        updated.ageAtReferral = '';
      } else if (updated.dateOfBirth && updated.dateReceivedByCac) {
        const calculatedAge = calculateAgeAtReferral(updated.dateOfBirth, updated.dateReceivedByCac);
        updated.ageAtReferral = calculatedAge;
      }
      
      return updated;
    });
  };

  // Unified form validation - handles both victim and other people scenarios
  const validateForm = () => {
    // Check if we're coming from CasePersonList (adding person to existing case)
    const fromCasePersonList = location.state?.returnTo === '/CasePersonList';
    
    // Initialize error object
    const errors = {
      firstName: '',
      lastName: '',
      reasonForReferral: '',
      relationship: ''
    };
    let hasErrors = false;
    
    // Validation logic differs based on personType and context
    if (fromCasePersonList) {
      // Coming from CasePersonList - validate based on personType
      if (isOther) {
        // For Other People: relationship (highest priority), firstName, lastName
        if (relationships.length === 0) {
          errors.relationship = 'You Must Specify A Relationship for each Alleged Victim/Client';
          hasErrors = true;
        }
        
        if (!formData.firstName || !formData.firstName.trim()) {
          errors.firstName = 'First Name is required';
          hasErrors = true;
        }
        
        if (!formData.lastName || !formData.lastName.trim()) {
          errors.lastName = 'Last Name is required';
          hasErrors = true;
        }
      } else {
        // For Victims: firstName, lastName, reasonForReferral
        if (!formData.firstName || !formData.firstName.trim()) {
          errors.firstName = 'First Name is required';
          hasErrors = true;
        }
        
        if (!formData.lastName || !formData.lastName.trim()) {
          errors.lastName = 'Last Name is required';
          hasErrors = true;
        }
        
        if (!formData.reasonForReferral || !formData.reasonForReferral.trim()) {
          errors.reasonForReferral = 'Reason for Referral is required for victims';
          hasErrors = true;
        }
      }
      
      // If errors found, set validation errors and return false
      if (hasErrors) {
        setValidationErrors(errors);
        setShowValidationErrors(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }
      
      // Clear validation errors if validation passes
      setValidationErrors({
        firstName: '',
        lastName: '',
        reasonForReferral: '',
        relationship: ''
      });
      setShowValidationErrors(false);
      return true;
    } else {
      // Original flow: Create new case - validate standard fields
      const errorMessages = [];
      
      if (!formData.lastName?.trim()) {
        errorMessages.push("Last name is required");
      }
      
      if (!formData.firstName?.trim()) {
        errorMessages.push("First name is required");
      }
      
      if (!formData.dateReceivedByCac) {
        errorMessages.push("Date received by CAC is required");
      }
      
      if (!formData.reasonForReferral?.trim()) {
        errorMessages.push("Reason for referral is required");
      }
      
      if (!selectedCacId) {
        errorMessages.push("Please select a CAC center");
      }
      
      if (errorMessages.length > 0) {
        setError(errorMessages.join(', '));
        return false;
      }
      
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setError(null);
    setSuccess(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Check if person data has been changed
    if (originalPersonData && originalPersonData.person_id) {
      const personDataChanged = 
        originalPersonData.firstName !== formData.firstName ||
        originalPersonData.middleName !== formData.middleName ||
        originalPersonData.lastName !== formData.lastName ||
        originalPersonData.suffix !== formData.suffix ||
        originalPersonData.dateOfBirth !== formData.dateOfBirth ||
        originalPersonData.dateOfDeath !== formData.dateOfDeath ||
        originalPersonData.gender !== formData.biologicalSex;
      
      if (personDataChanged) {
        // Store the changes for use in confirmation
        setPendingChanges({
          person_id: originalPersonData.person_id,
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          suffix: formData.suffix,
          date_of_birth: formData.dateOfBirth,
          date_of_death: formData.dateOfDeath,
          gender: formData.biologicalSex === 'Male' ? 'M' : formData.biologicalSex === 'Female' ? 'F' : null
        });
        
        // Show confirmation modal
        setConfirmModalOpen(true);
        return; // Stop here and wait for confirmation
      }
    }
    
    // No changes to person data or no person selected, proceed normally
    submitForm();
  };

  // Helper function to save person and case_person immediately to database
  const savePersonAndAssociate = async (caseIdToUse) => {
    let personId;
    
    // Check if person already exists (from lookup)
    if (originalPersonData && originalPersonData.person_id && !originalPersonData.person_id.toString().startsWith('temp_')) {
      // Use existing person
      personId = originalPersonData.person_id;
      console.log('✅ Using existing person:', personId, 'Type:', typeof personId);
    } else {
      // Create new person in database
      personId = await createNewPerson();
      console.log('✅ Created new person:', personId, 'Type:', typeof personId);
    }
    
    // ⚠️ CRITICAL: Validate personId before proceeding
    if (!personId || personId === null || personId === undefined) {
      throw new Error('Failed to get or create person_id. personId is invalid.');
    }
    
    // Ensure personId is a number
    const personIdNum = typeof personId === 'string' ? parseInt(personId, 10) : personId;
    if (isNaN(personIdNum)) {
      throw new Error(`Invalid personId: ${personId}`);
    }
    personId = personIdNum;
    
    // ⭐ CORE RULE: Check if this is the first person for this case
    // If case has no case_person records yet, this person MUST be a victim (role_id = 1)
    let isFirstPerson = false;
    try {
      const existingPeople = await peopleApi.getPeopleByCaseId(caseIdToUse);
      isFirstPerson = !existingPeople || existingPeople.length === 0;
      console.log('Is first person for this case:', isFirstPerson, 'Existing people count:', existingPeople?.length || 0);
    } catch (err) {
      console.error('Error checking existing people for case:', err);
      // If we can't check, assume it's the first person to be safe
      isFirstPerson = true;
    }
    
    // Determine role_id
    let roleIdToUse;
    if (isFirstPerson) {
      // ⭐ CORE RULE: First person is ALWAYS a victim, regardless of user selection
      roleIdToUse = 1; // Alleged Co-victim
      console.log('First person for case - forcing role_id to 1 (Alleged Co-victim)');
    } else if (isVictim) {
      roleIdToUse = 1; // Alleged Co-victim
    } else {
      // For other people, use the role from first relationship, or default to 4 (Other)
      // But if roleId is null, empty, or not selected, default to 4 (Other)
      const selectedRoleId = relationships.length > 0 ? relationships[0].roleId : null;
      if (selectedRoleId === null || selectedRoleId === '' || selectedRoleId === undefined) {
        roleIdToUse = 4; // Default to 'Other'
      } else {
        roleIdToUse = selectedRoleId;
      }
    }
    
    // Determine relationship_id (for other people)
    const relationshipIdToUse = isOther && relationships.length > 0 ? relationships[0].relationshipId : null;
    
    // Associate person with case (creates case_person record)
    const cacId = parseInt(location.state?.selectedCacId || selectedCacId, 10);
    
    console.log('🔗 Associating person with case:', {
      personId: personId,
      personIdType: typeof personId,
      caseId: caseIdToUse,
      caseIdType: typeof caseIdToUse,
      cacId: cacId
    });
    
    // ⚠️ CRITICAL: Validate all IDs before API call
    if (!personId || isNaN(personId)) {
      throw new Error(`Invalid personId: ${personId}`);
    }
    if (!caseIdToUse || isNaN(caseIdToUse)) {
      throw new Error(`Invalid caseId: ${caseIdToUse}`);
    }
    if (!cacId || isNaN(cacId)) {
      throw new Error(`Invalid cacId: ${cacId}`);
    }
    
    const associationResult = await peopleApi.associatePersonWithCase(personId, caseIdToUse, cacId);
    console.log('✅ Successfully associated person with case:', associationResult);
    
    // Prepare case_person details
    const truncate = (str, maxLength) => {
      if (!str) return null;
      return str.substring(0, maxLength);
    };
    
    const getStateAbbr = (stateName) => {
      if (!stateName) return null;
      const stateMap = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
        'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
        'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
        'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
        'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
        'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
        'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
        'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
        'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
        'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
        'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
        'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
        'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
      };
      if (stateName.length === 2) {
        return stateName.toUpperCase();
      }
      return stateMap[stateName] || null;
    };
    
    const formatDateForAPI = (dateStr) => {
      if (!dateStr) return null;
      try {
        // Use Dallas timezone formatting
        const formatted = formatDateForBackend(dateStr);
        return formatted ? formatted.split('T')[0] : null;
      } catch {
        return null;
      }
    };
    
    // Ensure age is correctly parsed as integer
    let ageValue = null;
    if (formData.ageAtReferral) {
      const parsedAge = parseInt(formData.ageAtReferral, 10);
      if (!isNaN(parsedAge)) {
        ageValue = parsedAge;
      }
      console.log('[NewCase] Age value for case_person:', {
        original: formData.ageAtReferral,
        parsed: parsedAge,
        final: ageValue
      });
    }
    
    // Prepare Other Direct Services data as JSON string
    let otherDirectServicesJson = null;
    if (formData.reasonForReferral === 'Requesting Other Direct Services' && formData.otherDirectServices) {
      // Convert the otherDirectServices object to JSON string
      // Filter out false values to only save selected services
      const selectedServices = Object.entries(formData.otherDirectServices)
        .filter(([key, value]) => value === true)
        .map(([key]) => key);
      
      // Create a compact JSON structure
      const servicesData = {
        reasonForReferral: formData.reasonForReferral,
        selectedServices: selectedServices,
        allServices: formData.otherDirectServices
      };
      
      otherDirectServicesJson = JSON.stringify(servicesData);
      // Truncate to 255 characters if needed (database limit)
      if (otherDirectServicesJson.length > 255) {
        console.warn('⚠️ Other Direct Services JSON exceeds 255 characters, truncating...', {
          originalLength: otherDirectServicesJson.length,
          truncatedLength: 255
        });
        otherDirectServicesJson = otherDirectServicesJson.substring(0, 255);
      }
      console.log('💾 Saving Other Direct Services:', {
        selectedServices,
        jsonLength: otherDirectServicesJson.length,
        json: otherDirectServicesJson
      });
    }
    
    // Prepare Incident Information data as JSON string (for "Allegation Of Abuse")
    let incidentInformationJson = null;
    if (formData.reasonForReferral === 'Allegation Of Abuse') {
      // Filter out false values to only save selected maltreatment types
      const selectedMaltreatmentTypes = Object.entries(formData.allegedMaltreatment || {})
        .filter(([key, value]) => value === true)
        .map(([key]) => key);
      
      // Create incident information structure
      const incidentData = {
        reasonForReferral: formData.reasonForReferral,
        dateFirstReported: formData.dateFirstReported || null,
        selectedMaltreatmentTypes: selectedMaltreatmentTypes,
        allMaltreatmentTypes: formData.allegedMaltreatment || {},
        locationDescription: formData.locationDescription || null,
        incidentState: formData.incidentState || null,
        incidentCounty: formData.incidentCounty || null,
        locationType: formData.locationType || null,
        narrativeDescription: formData.narrativeDescription || null
      };
      
      incidentInformationJson = JSON.stringify(incidentData);
      // Truncate to 255 characters if needed (database limit)
      if (incidentInformationJson.length > 255) {
        console.warn('⚠️ Incident Information JSON exceeds 255 characters, truncating...', {
          originalLength: incidentInformationJson.length,
          truncatedLength: 255
        });
        // Try to preserve essential data by truncating less important fields first
        if (incidentData.narrativeDescription && incidentData.narrativeDescription.length > 100) {
          incidentData.narrativeDescription = incidentData.narrativeDescription.substring(0, 100) + '...';
          incidentInformationJson = JSON.stringify(incidentData);
        }
        if (incidentInformationJson.length > 255) {
          incidentInformationJson = incidentInformationJson.substring(0, 255);
        }
      }
      console.log('💾 Saving Incident Information:', {
        dateFirstReported: formData.dateFirstReported,
        selectedMaltreatmentTypes,
        locationDescription: formData.locationDescription,
        incidentState: formData.incidentState,
        incidentCounty: formData.incidentCounty,
        locationType: formData.locationType,
        narrativeDescription: formData.narrativeDescription,
        jsonLength: incidentInformationJson.length,
        json: incidentInformationJson
      });
    }
    
    // Prepare Reason for Referral data
    let reasonForReferralData = null;
    if (formData.reasonForReferral) {
      reasonForReferralData = truncate(formData.reasonForReferral, 255);
      console.log('💾 Saving Reason for Referral:', reasonForReferralData);
    }
    
    const casePersonDetails = {
      role_id: roleIdToUse,
      relationship_id: relationshipIdToUse,
      age: ageValue,
      age_unit: truncate(formData.ageUnit, 20),
      address_line_1: truncate(formData.contactStreetAddress, 200),
      address_line_2: truncate(formData.contactAddressLine2, 200),
      city: truncate(formData.contactCity, 50),
      state_abbr: getStateAbbr(formData.contactState),
      zip: truncate(formData.contactZip, 20),
      county: truncate(formData.contactCounty, 20),
      region: truncate(formData.contactRegion, 20),
      out_of_country: formData.contactResidesOutOfCountry || false,
      start_date: formatDateForAPI(formData.contactStartDate),
      end_date: formatDateForAPI(formData.contactEndDate),
      home_phone_number: truncate(formData.contactHomePhone, 200),
      cell_phone_number: truncate(formData.contactCellPhone, 200),
      work_phone_number: truncate(formData.contactWorkPhone, 200),
      email_address: truncate(formData.contactEmailAddress, 200),
      same_household: isOther && relationships.length > 0 ? relationships[0].sameHousehold : false,
      custody: isOther && relationships.length > 0 ? relationships[0].custody : false,
      school_or_employer: truncate(formData.schoolOrEmployer, 200),
      // Case Specific Information fields with manual input support
      // For manual input, save as string in victim_status field (for education, marital, income, military type)
      // For fields that support string values directly, save the manual input value
      victim_status: truncate(formData.victimStatus, 200),
      // Note: education_level_id, marital_status_id, income_level_id, mili_type_id are ID fields
      // Manual input values should be saved as strings in victim_status or custom fields
      // For now, we'll save manual input values directly as strings where supported
      mili_dependent_relationship: truncate(formData.militaryDependentRelationship, 200),
      custom_field_1: truncate(formData.customField1, 200),
      housing_insecurity_risk: truncate(formData.doTheyLikeCookies, 200),
      // Save Reason for Referral, Other Direct Services, Incident Information, and MDT Meeting
      // Use case_person_custom_field_7 for Reason for Referral (TEXT field, can store longer strings)
      case_person_custom_field_7: reasonForReferralData || null,
      // Use case_person_custom_field_6 for Other Direct Services JSON (when "Requesting Other Direct Services" is selected)
      case_person_custom_field_6: otherDirectServicesJson || null,
      // Use case_person_custom_field_8 for Incident Information JSON (when "Allegation Of Abuse" is selected)
      case_person_custom_field_8: incidentInformationJson || null,
      // Use case_person_custom_field_9 for MDT Meeting (TEXT field)
      case_person_custom_field_9: formData.mdtMeeting ? truncate(formData.mdtMeeting, 255) : null
    };
    
    // Log MDT Meeting data for debugging
    if (formData.mdtMeeting) {
      console.log('💾 Saving MDT Meeting:', {
        mdtMeeting: formData.mdtMeeting,
        savedTo: 'case_person_custom_field_9'
      });
    }
    
    // Update case_person details
    await peopleApi.updateCasePersonDetails(personId, caseIdToUse, casePersonDetails);
    
    return { personId, caseId: caseIdToUse };
  };

  // Function to handle actual form submission
  const submitForm = async () => {
    console.log('Form submitted:', formData);
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if we're coming from CasePersonList (adding person to existing case)
      const fromCasePersonList = location.state?.returnTo === '/CasePersonList';
      
      if (fromCasePersonList) {
        // Validation is already done in validateForm(), so we can proceed directly
        
        const existingCaseId = location.state?.caseId || location.state?.caseData?.case_id;
        
        // ⭐ CORE RULE: If case doesn't exist yet, create it immediately
        // The first person added will automatically be a victim (role_id = 1) regardless of user selection
        let caseIdToUse = existingCaseId;
        if (!existingCaseId) {
          try {
            // Format date for API
            let cacReceivedDate = null;
            if (formData.dateReceivedByCac) {
              try {
                const dateParts = formData.dateReceivedByCac.split('/');
                if (dateParts.length === 3) {
                  cacReceivedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
                } else {
                  cacReceivedDate = formatDateForBackend(formData.dateReceivedByCac)?.split('T')[0] || getTodayDateDallas();
                }
              } catch (e) {
                cacReceivedDate = getTodayDateDallas();
              }
            } else {
              cacReceivedDate = getTodayDateDallas();
            }
            
            const caseDataToCreate = {
              cac_id: parseInt(location.state?.selectedCacId || selectedCacId, 10),
              case_number: null, // Will be auto-generated
              cac_received_date: cacReceivedDate,
              created_date: getTodayDateDallas()
            };
            
            const newCase = await casesApi.createCase(caseDataToCreate);
            caseIdToUse = newCase.case_id;
            setCreatedCaseId(newCase.case_id);
            console.log('Created new case immediately for first victim:', newCase.case_id);
          } catch (caseErr) {
            console.error('Error creating case for first victim:', caseErr);
            setError(`Failed to create case: ${caseErr.message}`);
            setLoading(false);
            return;
          }
        }
        
        // Ensure case exists for other people
        if (isOther && !caseIdToUse) {
          setError('Case ID is required for adding other people. Please ensure a case has been created first.');
          setLoading(false);
          return;
        }
        
        // IMMEDIATELY save person and case_person to database
        const { personId, caseId } = await savePersonAndAssociate(caseIdToUse);
        console.log('✅ Saved person and case_person to database:', { 
          personId, 
          caseId,
          personIdType: typeof personId,
          caseIdType: typeof caseId
        });
        
        // ⚠️ CRITICAL: Ensure caseId is valid before navigation
        if (!caseId) {
          console.error('❌ ERROR: caseId is missing after savePersonAndAssociate!');
          setError('Failed to create case association. Please try again.');
          setLoading(false);
          return;
        }
        
        // If returnTo is specified, navigate to that path (e.g., CasePersonList)
        // Otherwise, navigate to CaseCreationSummary (for "Save and Open Case(s)" flow)
        if (returnTo) {
          const targetPath = returnTo;
          console.log('🔄 Navigating to returnTo path:', targetPath, 'with caseId:', caseId);
        navigate(targetPath, {
          state: {
            caseId: caseId, // Pass the case_id (must be a valid integer)
            selectedCacId: location.state?.selectedCacId || selectedCacId
            // Do NOT pass victims/otherPeople - CasePersonList will load from database
          }
        });
      } else {
          // Navigate to CaseCreationSummary (for "Save and Open Case(s)" flow)
          console.log('🔄 Navigating to CaseCreationSummary with caseId:', caseId);
          navigate('/CaseCreationSummary', {
            state: {
              caseId: caseId, // Pass the case_id (must be a valid integer)
              selectedCacId: location.state?.selectedCacId || selectedCacId
              // Do NOT pass victims/otherPeople - CaseCreationSummary will load from database if needed
            }
          });
        }
      } else {
        // Original flow: Create case and person, then navigate to CaseGeneral
        // Format date if it exists (convert from MM/DD/YYYY to YYYY-MM-DD)
        let cacReceivedDate = null;
        if (formData.dateReceivedByCac) {
          try {
            const dateParts = formData.dateReceivedByCac.split('/');
            if (dateParts.length === 3) {
              cacReceivedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
            } else {
              cacReceivedDate = formatDateForBackend(formData.dateReceivedByCac)?.split('T')[0] || getTodayDateDallas();
            }
          } catch (e) {
            cacReceivedDate = getTodayDateDallas();
          }
        } else {
          cacReceivedDate = getTodayDateDallas();
        }

        // Create case first
        const caseDataToCreate = {
          cac_id: parseInt(selectedCacId, 10),
          case_number: formData.caseNumber || null,
          cac_received_date: cacReceivedDate,
          created_date: new Date().toISOString().split('T')[0]
        };
        
        const newCase = await casesApi.createCase(caseDataToCreate);
        const createdCaseId = newCase.case_id;
        console.log('✅ Created new case:', createdCaseId);
        
        // Create person and associate with case
        const { personId, caseId: finalCaseId } = await savePersonAndAssociate(createdCaseId);
        console.log('✅ Saved person and case_person to database:', { 
          personId, 
          caseId: finalCaseId
        });
        
        // Navigate to CaseCreationSummary (for "Save and Open Case(s)" flow)
        console.log('🔄 Navigating to CaseCreationSummary with caseId:', finalCaseId);
        navigate('/CaseCreationSummary', {
          state: {
            caseId: finalCaseId, // Pass the case_id (must be a valid integer)
            selectedCacId: selectedCacId
            // Do NOT pass victims/otherPeople - CaseCreationSummary will load from database if needed
          }
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(`Failed to save data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new person in the database
  const createNewPerson = async () => {
    // Validate required fields
    if (!formData.lastName || !formData.firstName) {
      throw new Error('Last name and first name are required');
    }
    
    // Check for duplicate by name + date of birth before creating
    try {
      const duplicatePeople = await peopleApi.searchByName(
        formData.firstName.trim(),
        formData.lastName.trim()
      );
      const inputDobNorm = formData.dateOfBirth
        ? new Date(formData.dateOfBirth).toISOString().split('T')[0]
        : null;
      const normDob = (d) => {
        if (!d) return null;
        const s = typeof d === 'string' ? d : (d instanceof Date ? d.toISOString() : String(d));
        const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
        return m ? m[1] : null;
      };
      const exactMatches = duplicatePeople.filter(person => {
        const personFirstName = (person.first_name || '').trim().toLowerCase();
        const personLastName = (person.last_name || '').trim().toLowerCase();
        const inputFirstName = formData.firstName.trim().toLowerCase();
        const inputLastName = formData.lastName.trim().toLowerCase();
        if (personFirstName !== inputFirstName || personLastName !== inputLastName) return false;
        const personDob = normDob(person.date_of_birth);
        if (inputDobNorm !== personDob) return false;
        return true;
      });
      if (exactMatches.length > 0) {
        setShowDuplicateWarning(true);
        setDuplicateCheckSearchTerm(formData.lastName.trim());
        setDuplicateCheckFirstName(formData.firstName.trim());
        setLookupModalOpen(true);
        const errorMessage = 'A person with the same name and date of birth already exists.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      if (err.message && err.message.includes('same name and date of birth')) {
        throw err;
      }
      console.warn('Error checking for duplicate name+DOB:', err);
    }
    
    // Helper function to truncate strings to specified length
    const truncate = (str, maxLength) => {
      if (!str) return null;
      return str.substring(0, maxLength);
    };
    
    try {
      if (!selectedCacId) {
        throw new Error('Please select a CAC center');
      }
      
      const cacId = parseInt(selectedCacId, 10);
      console.log('Using selected CAC ID:', cacId);
      
      // Get race_id from race selection (same as PersonBio.js)
      let raceId = null;
      if (formData.race) {
        try {
          // Find the race ID by looking up the list items
          const categories = await pickListsApi.getAllCategories();
          const peopleCategory = categories.find(c => c.category_name === 'People Tab');
          
          if (peopleCategory) {
            const pickLists = await pickListsApi.getPickListsByCategoryId(peopleCategory.category_id);
            const raceList = pickLists.find(list => list.list_name === 'Race');
            
            if (raceList) {
              const items = await pickListsApi.getItemsByListId(raceList.list_id);
              const raceItem = items.find(item => item.value === formData.race);
              if (raceItem) {
                raceId = raceItem.item_id;
              }
            }
          }
        } catch (err) {
          console.error('Error getting race ID:', err);
        }
      }
    
    // Prepare person data with proper string length constraints (same as PersonBio.js)
    // Convert formatted SSN to unformatted (pure digits) for database storage
    const ssnForDB = formData.ssn ? unformatSSN(formData.ssn) : null;
    
    const personData = {
      cac_id: cacId,
      first_name: truncate(formData.firstName, 256),
      middle_name: truncate(formData.middleName, 256),
      last_name: truncate(formData.lastName, 256),
      suffix: truncate(formData.suffix, 256),
      nick_name: truncate(formData.nickName, 256),
      ssn: ssnForDB || null,
      date_of_birth: formData.dateOfBirth || null,
      date_of_death: formData.dateOfDeath || null,
      gender: formData.biologicalSex === 'Male' ? 'M' : 
              formData.biologicalSex === 'Female' ? 'F' : null,
      pronouns: formData.pronouns || null,
      race: formData.race || null, // Save as string, same as PersonBio.js
      religion: formData.religion || null, // Save as string, same as PersonBio.js
      first_language: formData.language || null, // Save as string, same as PersonBio.js
      prior_convictions: false,
      convicted_against_children: false,
      sex_offender: false,
      sex_predator: false
    };
      
      console.log('Person data to submit:', personData);
      
      // Create person in database
      const newPerson = await peopleApi.createPerson(personData);
      console.log('Created new person:', newPerson);
      
      return newPerson.person_id;
    } catch (error) {
      console.error('Error creating new person:', error);
      throw error;
    }
  };

  // Function to create a new case in the database
  const createNewCase = async (personId) => {
    // Validate required fields
    if (!formData.dateReceivedByCac || !formData.reasonForReferral) {
      throw new Error('Date received and reason for referral are required');
    }
    
    // Format date for API in ISO-8601 DateTime format using Dallas timezone
    const formatDateISO = (dateStr) => {
      if (!dateStr) return null;
      
      // For strings that already include time component
      if (dateStr.includes('T')) {
        return dateStr;
      }
      
      // Use Dallas timezone formatting
      return formatDateForBackend(dateStr);
    };
    
    try {
      if (!selectedCacId) {
        throw new Error('Please select a CAC center');
      }
      
      const cacId = parseInt(selectedCacId, 10);
      console.log('Using selected CAC ID for case:', cacId);
      
      // Get the maximum case ID to generate the next one
      const casesResponse = await fetch('http://localhost:5000/api/cases');
      if (!casesResponse.ok) {
        throw new Error('Failed to fetch cases');
      }
      
      const cases = await casesResponse.json();
      // Find the max case_id in the existing cases, or use 1 if no cases exist
      const maxCaseId = cases.length > 0 
        ? Math.max(...cases.map(c => c.case_id)) 
        : 0;
      const newCaseId = maxCaseId + 1;
      console.log('Generated new case ID:', newCaseId);
      
      // Prepare case data with proper date formatting
      const caseData = {
        case_id: newCaseId,
        cac_id: cacId,
        cac_received_date: formatDateISO(formData.dateReceivedByCac),
        case_number: `CASE-${Date.now()}`.substring(0, 20), // Limit to 20 chars
        created_date: formatDateISO(getTodayDateDallas()),
      };
      
      console.log('Case data to submit:', caseData);
      
      // Create case in database
      const newCase = await casesApi.createCase(caseData);
      console.log('Created new case:', newCase);
      
      // Associate person with case
      await peopleApi.associatePersonWithCase(personId, newCase.case_id, cacId);
      
      // Helper function to truncate strings to specified length
      const truncate = (str, maxLength) => {
        if (!str) return null;
        return str.substring(0, maxLength);
      };
      
      // Helper function to convert state name to abbreviation
      const getStateAbbr = (stateName) => {
        if (!stateName) return null;
        
        // State name to abbreviation mapping
        const stateMap = {
          'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
          'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
          'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
          'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
          'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
          'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
          'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
          'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
          'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
          'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
          'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
          'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
          'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
        };
        
        // If already an abbreviation (2 characters), return as is
        if (stateName.length === 2) {
          return stateName.toUpperCase();
        }
        
        // Look up in map
        return stateMap[stateName] || null;
      };
      
      // Helper function to format date for API
      const formatDateForAPI = (dateStr) => {
        if (!dateStr) return null;
        try {
          const date = new Date(dateStr);
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        } catch {
          return null;
        }
      };
      
      // Ensure age is correctly parsed as integer
      let ageValue = null;
      if (formData.ageAtReferral) {
        const parsedAge = parseInt(formData.ageAtReferral, 10);
        if (!isNaN(parsedAge)) {
          ageValue = parsedAge;
        }
        console.log('[NewCase] Age value for case_person (create case flow):', {
          original: formData.ageAtReferral,
          parsed: parsedAge,
          final: ageValue
        });
      }
      
      // Update case-person details with Contact Information and Case Specific Information
      const casePersonDetails = {
        role_id: 1, // role_id = 1 for Alleged Co-victim (aligned with CasesTab.js)
        relationship_id: null,
        age: ageValue,
        age_unit: truncate(formData.ageUnit, 20),
        // Contact Information fields
        address_line_1: truncate(formData.contactStreetAddress, 200),
        address_line_2: truncate(formData.contactAddressLine2, 200),
        city: truncate(formData.contactCity, 50),
        state_abbr: getStateAbbr(formData.contactState),
        zip: truncate(formData.contactZip, 20),
        // New fields from Prisma schema
        county: truncate(formData.contactCounty, 20),
        region: truncate(formData.contactRegion, 20),
        out_of_country: formData.contactResidesOutOfCountry || false,
        start_date: formatDateForAPI(formData.contactStartDate),
        end_date: formatDateForAPI(formData.contactEndDate),
        home_phone_number: truncate(formData.contactHomePhone, 200),
        cell_phone_number: truncate(formData.contactCellPhone, 200),
        work_phone_number: truncate(formData.contactWorkPhone, 200),
        email_address: truncate(formData.contactEmailAddress, 200),
        // Case Specific Information fields
        same_household: false,
        school_or_employer: truncate(formData.schoolOrEmployer, 200),
        // Case Specific Information fields with manual input support
        victim_status: truncate(formData.victimStatus, 200),
        mili_dependent_relationship: truncate(formData.militaryDependentRelationship, 200),
        custom_field_1: truncate(formData.customField1, 200),
        housing_insecurity_risk: truncate(formData.doTheyLikeCookies, 200)
      };
      
      await peopleApi.updateCasePersonDetails(personId, newCase.case_id, casePersonDetails);
      
      return newCase.case_id;
    } catch (error) {
      console.error('Error creating new case:', error);
      throw error;
    }
  };

  // Function to save Contact Information
  const handleSaveContactInfo = async () => {
    try {
      setSavingContactInfo(true);
      setError(null);
      
      // Get caseId and personId
      let caseId = createdCaseId;
      let personId = createdPersonId;
      
      // If not available from created IDs, try to get from currentCase
      if (!caseId && currentCase && currentCase !== 'create-new' && currentCase !== 'search-case') {
        caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
        
        // Try to get personId from the case
        if (caseId && !isNaN(caseId)) {
          try {
            const casePeople = await peopleApi.getPeopleByCaseId(caseId);
            if (casePeople && casePeople.length > 0) {
              personId = casePeople[0].person_id;
            }
          } catch (err) {
            console.error('Error fetching people for case:', err);
          }
        }
      }
      
      // Validate that we have both IDs
      if (!caseId || !personId) {
        setError('Please create a case first before saving contact information.');
        setSavingContactInfo(false);
        return;
      }
      
      // Helper function to truncate strings
      const truncate = (str, maxLength) => {
        if (!str) return null;
        return str.substring(0, maxLength);
      };
      
      // Helper function to convert state name to abbreviation
      const getStateAbbr = (stateName) => {
        if (!stateName) return null;
        
        const stateMap = {
          'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
          'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
          'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
          'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
          'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
          'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
          'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
          'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
          'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
          'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
          'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
          'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
          'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
        };
        
        if (stateName.length === 2) {
          return stateName.toUpperCase();
        }
        
        return stateMap[stateName] || null;
      };
      
      // Helper function to format date for API
      const formatDateForAPI = (dateStr) => {
        if (!dateStr) return null;
        try {
          const date = new Date(dateStr);
          return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        } catch {
          return null;
        }
      };
      
      // Prepare contact information data with all fields from Prisma schema
      const contactInfoData = {
        address_line_1: truncate(formData.contactStreetAddress, 200),
        address_line_2: truncate(formData.contactAddressLine2, 200),
        city: truncate(formData.contactCity, 50),
        state_abbr: getStateAbbr(formData.contactState),
        zip: truncate(formData.contactZip, 20),
        // New fields from Prisma schema
        county: truncate(formData.contactCounty, 20),
        region: truncate(formData.contactRegion, 20),
        out_of_country: formData.contactResidesOutOfCountry || false,
        start_date: formatDateForAPI(formData.contactStartDate),
        end_date: formatDateForAPI(formData.contactEndDate),
        home_phone_number: truncate(formData.contactHomePhone, 200),
        cell_phone_number: truncate(formData.contactCellPhone, 200),
        work_phone_number: truncate(formData.contactWorkPhone, 200),
        email_address: truncate(formData.contactEmailAddress, 200)
      };
      
      // Update case-person details
      await peopleApi.updateCasePersonDetails(personId, caseId, contactInfoData);
      
      setSuccess('Contact Information saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving contact information:', error);
      setError(`Failed to save contact information: ${error.message}`);
    } finally {
      setSavingContactInfo(false);
    }
  };

  // Function to update person in database
  const updatePersonInDatabase = async (personData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/people/${personData.person_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(personData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update person: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Person updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error updating person:', error);
      throw error;
    }
  };

  // Handle confirmation
  const handleConfirmChanges = () => {
    setConfirmModalOpen(false);
    submitForm();
  };

  // Handle cancellation
  const handleCancelChanges = () => {
    setConfirmModalOpen(false);
    setPendingChanges(null);
  };

  // Handle checkbox changes for gender identity
  const handleGenderChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      selfIdentifiedGender: {
        ...prev.selfIdentifiedGender,
        [name]: checked
      }
    }));
  };

  // Handle checkbox changes for VOCA Classification
  const handleVocaChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      vocaClassification: {
        ...prev.vocaClassification,
        [name]: checked
      }
    }));
  };

  // Handle checkbox changes for Special Populations
  const handleSpecialPopulationsChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      specialPopulations: {
        ...prev.specialPopulations,
        [name]: checked
      }
    }));
  };

  // Handle checkbox changes for Risk Factors
  const handleRiskFactorsChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      riskFactors: {
        ...prev.riskFactors,
        [name]: checked
      }
    }));
  };

  // Handle checkbox changes for CSEC
  const handleCsecChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      csec: {
        ...prev.csec,
        [name]: checked
      }
    }));
  };

  // Handle checkbox changes for Child Pornography Involvement
  const handleChildPornographyInvolvementChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      childPornographyInvolvement: {
        ...prev.childPornographyInvolvement,
        [name]: checked
      }
    }));
  };

  // Handle checkbox changes for Alleged Maltreatment
  const handleAllegedMaltreatmentChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      allegedMaltreatment: {
        ...prev.allegedMaltreatment,
        [name]: checked
      }
    }));
  };

  // Handle checkbox changes for Other Direct Services
  const handleOtherDirectServicesChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      otherDirectServices: {
        ...prev.otherDirectServices,
        [name]: checked
      }
    }));
  };

  // Handle checkbox changes for CSEC Involvement
  const handleCsecInvolvementChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      csecInvolvement: {
        ...prev.csecInvolvement,
        [name]: checked
      }
    }));
  };

 // Handle checkbox changes for Ethnicity
 const handleEthnicityChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      ethnicity: {
        ...prev.ethnicity,
        [name]: checked
      }
    }));
  };

  // Handle checkbox changes for Community
  const handleCommunityChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      community: {
        ...prev.community,
        [name]: checked
      }
    }));
  };

  // Handle changes in new runaway incident form
  const handleRunawayIncidentChange = (e) => {
    const { name, value } = e.target;
    setNewRunawayIncident(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle changes in new prior interview form
  const handlePriorInterviewChange = (e) => {
    const { name, value } = e.target;
    setNewPriorInterview(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add a new prior interview
  const addPriorInterview = () => {
    // Validate the new interview has required fields
    if (!newPriorInterview.agency || !newPriorInterview.interviewDate) {
      return; // Don't add incomplete records
    }
    
    // Add the new interview to the priorInterviews array
    setFormData(prev => ({
      ...prev,
      priorInterviews: [...prev.priorInterviews, { ...newPriorInterview, id: Date.now() }]
    }));
    
    // Clear the form for the next entry
    setNewPriorInterview({
      agency: '',
      interviewDate: ''
    });
  };

  // Add a new runaway incident
  const addRunawayIncident = () => {
    // Validate the new incident has required fields
    if (!newRunawayIncident.startDate) {
      return; // Don't add incomplete records
    }
    
    // Add the new incident to the runawayIncidents array
    setFormData(prev => ({
      ...prev,
      runawayIncidents: [...prev.runawayIncidents, { ...newRunawayIncident, id: Date.now() }]
    }));
    
    // Clear the form for the next entry
    setNewRunawayIncident({
      startDate: '',
      lengthOfTime: '',
      location: ''
    });
  };

  // Remove a runaway incident
  const removeRunawayIncident = (id) => {
    setFormData(prev => ({
      ...prev,
      runawayIncidents: prev.runawayIncidents.filter(incident => incident.id !== id)
    }));
  };
  
  // Handle Add Another Person - immediately save to database and navigate to CasePersonList
  const handleAddAnotherPerson = async () => {
    // Reset validation errors
    setValidationErrors({
      firstName: '',
      lastName: '',
      reasonForReferral: ''
    });
    setShowValidationErrors(false);
    
    // Validate required fields
    const errors = {
      firstName: '',
      lastName: '',
      reasonForReferral: ''
    };
    let hasErrors = false;
    
    // Validate First Name
    if (!formData.firstName || !formData.firstName.trim()) {
      errors.firstName = 'First Name is required';
      hasErrors = true;
    }
    
    // Validate Last Name
    if (!formData.lastName || !formData.lastName.trim()) {
      errors.lastName = 'Last Name is required';
      hasErrors = true;
    }
    
    // Validate Reason for Referral (only for victim mode)
    if (isVictim && (!formData.reasonForReferral || !formData.reasonForReferral.trim())) {
      errors.reasonForReferral = 'Reason for Referral is required';
      hasErrors = true;
    }
    
    // If validation fails, show errors and prevent navigation
    if (hasErrors) {
      setValidationErrors(errors);
      setShowValidationErrors(true);
      // Scroll to top to show error list
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Validation passed - immediately save to database
    setLoading(true);
    setError(null);
    
    try {
      // Check if we're coming from CasePersonList
      const fromCasePersonList = location.state?.returnTo === '/CasePersonList';
      const existingCaseId = location.state?.caseId || location.state?.caseData?.case_id;
      
      let caseIdToUse = existingCaseId;
      
      // ⭐ CORE RULE: If case doesn't exist yet, create it immediately
      // The first person added will automatically be a victim (role_id = 1) regardless of user selection
      if (!existingCaseId) {
        try {
          // Format date for API
          let cacReceivedDate = null;
          if (formData.dateReceivedByCac) {
            try {
              const dateParts = formData.dateReceivedByCac.split('/');
              if (dateParts.length === 3) {
                cacReceivedDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
              } else {
                cacReceivedDate = new Date(formData.dateReceivedByCac).toISOString().split('T')[0];
              }
            } catch (e) {
              cacReceivedDate = new Date().toISOString().split('T')[0];
            }
          } else {
            cacReceivedDate = new Date().toISOString().split('T')[0];
          }
          
          const caseDataToCreate = {
            cac_id: parseInt(location.state?.selectedCacId || selectedCacId, 10),
            case_number: null, // Will be auto-generated
            cac_received_date: cacReceivedDate,
            created_date: new Date().toISOString().split('T')[0]
          };
          
          const newCase = await casesApi.createCase(caseDataToCreate);
          caseIdToUse = newCase.case_id;
          setCreatedCaseId(newCase.case_id);
          console.log('Created new case immediately for first victim:', newCase.case_id);
        } catch (caseErr) {
          console.error('Error creating case for first victim:', caseErr);
          setError(`Failed to create case: ${caseErr.message}`);
          setLoading(false);
          return;
        }
      }
      
      // Ensure case exists for other people
      if (isOther && !caseIdToUse) {
        setError('Case ID is required for adding other people. Please ensure a case has been created first.');
        setLoading(false);
        return;
      }
      
      // IMMEDIATELY save person and case_person to database
      const { personId, caseId } = await savePersonAndAssociate(caseIdToUse);
      console.log('✅ Saved person and case_person to database (Add Another Person):', { 
        personId, 
        caseId,
        personIdType: typeof personId,
        caseIdType: typeof caseId
      });
      
      // ⚠️ CRITICAL: Ensure caseId is valid before navigation
      if (!caseId) {
        console.error('❌ ERROR: caseId is missing after savePersonAndAssociate!');
        setError('Failed to create case association. Please try again.');
        setLoading(false);
        return;
      }
      
      // Navigate to CasePersonList - it will reload from database
      console.log('🔄 Navigating to CasePersonList with caseId:', caseId);
      navigate('/CasePersonList', {
        state: {
          caseId: caseId, // Pass the case_id (must be a valid integer)
          selectedCacId: location.state?.selectedCacId || selectedCacId
          // Do NOT pass victims/otherPeople - CasePersonList will load from database
        }
      });
    } catch (error) {
      console.error('Error saving person:', error);
      setError(`Failed to save person: ${error.message}`);
      setLoading(false);
    }
  };

  // Handle cancel - navigate to returnTo if available, otherwise home
  const handleCancel = () => {
    if (returnTo) {
      navigate(returnTo, {
        state: {
          caseData: location.state?.caseData,
          selectedCacId: location.state?.selectedCacId || selectedCacId,
          victims: location.state?.victims || [],
          otherPeople: location.state?.otherPeople || []
        }
      });
    } else {
      navigate('/');
    }
  };

  // Action buttons component - to reuse at top and bottom of form
  const ActionButtons = () => (
    <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
      {/* Hide "Add Another Person" when personType === 'other' */}
      {personType !== 'other' && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddAnotherPerson}
        >
          Add Another Person
        </Button>
      )}
      
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
            Saving...
          </Box>
        ) : (
          personType === 'other' ? "Save Person" : "Save and Open Case(s)"
        )}
      </Button>
      <Button
        variant="contained"
        color="error"
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
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpenLookupModal}
      >
        Lookup Person
      </Button>
    </Box>
  );

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100%', 
      margin: '0 auto', 
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: 'Arial, sans-serif'
    }}>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
      
      {/* Validation Errors Summary */}
      {showValidationErrors && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Please fix the following errors:
          </Typography>
          <Box component="ul" sx={{ margin: 0, paddingLeft: 3 }}>
            {validationErrors.firstName && (
              <li>{validationErrors.firstName}</li>
            )}
            {validationErrors.lastName && (
              <li>{validationErrors.lastName}</li>
            )}
            {validationErrors.reasonForReferral && (
              <li>{validationErrors.reasonForReferral}</li>
            )}
            {validationErrors.relationship && (
              <li>{validationErrors.relationship}</li>
            )}
          </Box>
        </Alert>
      )}
      
      <Box sx={{ 
        backgroundColor: '#ffffff', 
        p: 3, 
        borderRadius: 2,
        boxShadow: 1,
        mb: 4
      }}>
        {/* Action buttons - above Personal Profile */}
        <ActionButtons />
        
      <Paper elevation={3} sx={{ 
        p: 0, 
        my: 4,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderBottom: '1px solid #ddd' }}>
          <Typography variant="h6" sx={{ fontWeight: 'normal', m: 0 }}>
            Personal Profile
          </Typography>
        </Box>
        <Box sx={{ p: 4 }}>
        <Box component="form" sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {/* Name section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>First Name</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                variant="outlined"
                error={!!validationErrors.firstName}
                helperText={validationErrors.firstName}
              />
            </Grid>

            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Middle Name</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>Last Name</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                variant="outlined"
                error={!!validationErrors.lastName}
                helperText={validationErrors.lastName}
              />
            </Grid>

            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Suffix</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                name="suffix"
                value={formData.suffix}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Nick Name</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                name="nickName"
                value={formData.nickName}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>SSN</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="ssn"
                value={formData.ssn || ''}
                onChange={handleChange}
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
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Date of Birth</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                variant="outlined"
                disabled={formData.unknownDateOfBirth}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.unknownDateOfBirth}
                    onChange={handleUnknownDOB}
                    name="unknownDateOfBirth"
                  />
                }
                label="Unknown Date of Birth"
              />
            </Grid>

            {/* Date of Death section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Date of Death</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="dateOfDeath"
                type="date"
                value={formData.dateOfDeath}
                onChange={handleChange}
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Biological Sex section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>Biological Sex</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <RadioGroup
                row
                name="biologicalSex"
                value={formData.biologicalSex}
                onChange={handleRadioChange}
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
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>Pronouns</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <RadioGroup
                row
                name="pronouns"
                value={formData.pronouns}
                onChange={handleRadioChange}
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
              {manualInputFields.race ? (
                <TextField
                  fullWidth
                  name="race"
                  value={manualInputValues.race || ''}
                  onChange={(e) => handleManualInputChange('race', e.target.value)}
                  variant="outlined"
                  placeholder="Enter value manually"
                />
              ) : (
                <TextField
                  select
                  fullWidth
                  name="race"
                  value={formData.race || ''}
                  onChange={handleChange}
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
              {manualInputFields.religion ? (
                <TextField
                  fullWidth
                  name="religion"
                  value={manualInputValues.religion || ''}
                  onChange={(e) => handleManualInputChange('religion', e.target.value)}
                  variant="outlined"
                  placeholder="Enter value manually"
                />
              ) : (
                <TextField
                  select
                  fullWidth
                  name="religion"
                  value={formData.religion || ''}
                  onChange={handleChange}
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
              {manualInputFields.language ? (
                <TextField
                  fullWidth
                  name="language"
                  value={manualInputValues.language || ''}
                  onChange={(e) => handleManualInputChange('language', e.target.value)}
                  variant="outlined"
                  placeholder="Enter value manually"
                />
              ) : (
                <TextField
                  select
                  fullWidth
                  name="language"
                  value={formData.language || ''}
                  onChange={handleChange}
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

            {/* VOCA Classification section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, mt: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>VOCA Classification</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.autism} onChange={handleVocaChange} name="autism" />}
                      label="Autism"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.behavioralIssues} onChange={handleVocaChange} name="behavioralIssues" />}
                      label="Behavioral Issues"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.autismSpectrum} onChange={handleVocaChange} name="autismSpectrum" />}
                      label="Autism Spectrum"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.deaf} onChange={handleVocaChange} name="deaf" />}
                      label="Deaf"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.lgbtqCommunity} onChange={handleVocaChange} name="lgbtqCommunity" />}
                      label="LGBTQ Community"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.physicallyHandicapped} onChange={handleVocaChange} name="physicallyHandicapped" />}
                      label="Physically Handicapped"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.adultWithSubstantialImpairment} onChange={handleVocaChange} name="adultWithSubstantialImpairment" />}
                      label="Adult with Substantial Impairment"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.asperbergers} onChange={handleVocaChange} name="asperbergers" />}
                      label="Asperberger's"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.blind} onChange={handleVocaChange} name="blind" />}
                      label="Blind"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.homeless} onChange={handleVocaChange} name="homeless" />}
                      label="Homeless"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.mmr} onChange={handleVocaChange} name="mmr" />}
                      label="MMR"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.vocaClassification.veteran} onChange={handleVocaChange} name="veteran" />}
                      label="Veteran"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </Grid>

            {/* Special Populations section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, mt: 1 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>Special Populations</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.deafHardOfHearing} onChange={handleSpecialPopulationsChange} name="deafHardOfHearing" />}
                      label="Deaf/Hard of Hearing"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.immigrantsRefugees} onChange={handleSpecialPopulationsChange} name="immigrantsRefugees" />}
                      label="Immigrants/Refugee or Asylum Seeking"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.militaryDependent} onChange={handleSpecialPopulationsChange} name="militaryDependent" />}
                      label="Military-Dependent"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.limitedEnglish} onChange={handleSpecialPopulationsChange} name="limitedEnglish" />}
                      label="Limited English Proficiency"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.indigenousTribal} onChange={handleSpecialPopulationsChange} name="indigenousTribal" />}
                      label="Indigenous/Tribal community"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.unstablyHoused} onChange={handleSpecialPopulationsChange} name="unstablyHoused" />}
                      label="Unstably Housed/Unhoused"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.lgbtqiaPlus} onChange={handleSpecialPopulationsChange} name="lgbtqiaPlus" />}
                      label="LGBTQIA+"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.cognitivePhysicalMental} onChange={handleSpecialPopulationsChange} name="cognitivePhysicalMental" />}
                      label="Cognitive, Physical, or Mental Disability"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.visionImpaired} onChange={handleSpecialPopulationsChange} name="visionImpaired" />}
                      label="Vision Impaired"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.specialPopulations.other} onChange={handleSpecialPopulationsChange} name="other" />}
                      label="Other"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </Grid>

            {/* Risk Factors section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, mt: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Risk Factors</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.riskFactors.giftsBribes} onChange={handleRiskFactorsChange} name="giftsBribes" />}
                      label="Gifts/Bribes from non-caregivers"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.riskFactors.other} onChange={handleRiskFactorsChange} name="other" />}
                      label="Other"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.riskFactors.runaway} onChange={handleRiskFactorsChange} name="runaway" />}
                      label="Runaway"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.riskFactors.substanceAbuse} onChange={handleRiskFactorsChange} name="substanceAbuse" />}
                      label="Substance Abuse"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.riskFactors.highRiskSexual} onChange={handleRiskFactorsChange} name="highRiskSexual" />}
                      label="High Risk Sexual Behavior"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.riskFactors.riskyOnline} onChange={handleRiskFactorsChange} name="riskyOnline" />}
                      label="Risky Online Behavior"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.riskFactors.streetLanguage} onChange={handleRiskFactorsChange} name="streetLanguage" />}
                      label="Street Language"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </Grid>

            {/* CSEC section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, mt: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>CSEC</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.csec.childPornography} onChange={handleCsecChange} name="childPornography" />}
                      label="Child Pornography"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.csec.sexTourism} onChange={handleCsecChange} name="sexTourism" />}
                      label="Sex Tourism"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.csec.other} onChange={handleCsecChange} name="other" />}
                      label="Other"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.csec.sexTrafficking} onChange={handleCsecChange} name="sexTrafficking" />}
                      label="Sex Trafficking"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </Grid>

            {/* Child Pornography Involvement section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, mt: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Child Pornography Involvement</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.childPornographyInvolvement.distribution} onChange={handleChildPornographyInvolvementChange} name="distribution" />}
                      label="Distribution"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.childPornographyInvolvement.other} onChange={handleChildPornographyInvolvementChange} name="other" />}
                      label="Other"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.childPornographyInvolvement.trading} onChange={handleChildPornographyInvolvementChange} name="trading" />}
                      label="Trading"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.childPornographyInvolvement.manufacturing} onChange={handleChildPornographyInvolvementChange} name="manufacturing" />}
                      label="Manufacturing"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.childPornographyInvolvement.possession} onChange={handleChildPornographyInvolvementChange} name="possession" />}
                      label="Possession"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </Grid>

            {/* Special Needs Special Text section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Special Needs Special Text</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  name="specialNeeds"
                  value={formData.specialNeeds}
                  onChange={handleChange}
                  variant="outlined"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
                  <Button variant="contained" sx={{ minWidth: 'auto', mb: 0.5 }}>+</Button>
                  <Button variant="contained" sx={{ minWidth: 'auto' }}>-</Button>
                </Box>
              </Box>
            </Grid>

            {/* Comments section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Comments</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  variant="outlined"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1 }}>
                  <Button variant="contained" sx={{ minWidth: 'auto', mb: 0.5 }}>+</Button>
                  <Button variant="contained" sx={{ minWidth: 'auto' }}>-</Button>
                </Box>
              </Box>
            </Grid>

            {/* Housing Insecurity Risk? (1) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Housing Insecurity Risk? (1)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              {manualInputFields.doTheyLikeCookies ? (
                <TextField
                  fullWidth
                  name="doTheyLikeCookies"
                  value={manualInputValues.doTheyLikeCookies || ''}
                  onChange={(e) => handleManualInputChange('doTheyLikeCookies', e.target.value)}
                  variant="outlined"
                  placeholder="Enter value manually"
                />
              ) : (
                <TextField
                  select
                  fullWidth
                  name="doTheyLikeCookies"
                  value={formData.doTheyLikeCookies || ''}
                  onChange={handleChange}
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
                  <MenuItem value=""></MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                  <MenuItem value="Unknown">Unknown</MenuItem>
                  <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                </TextField>
              )}
            </Grid>

            {/* Developmental Age section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Developmental Age (2)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="developmentalAge"
                value={formData.developmentalAge}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            {/* Date Added section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Date Added (3)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="dateAdded"
                type="date"
                value={formData.dateAdded}
                onChange={handleChange}
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {/* CSEC Involvement section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, mt: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>CSEC Involvement (4)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={4}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.csecInvolvement.usa} onChange={handleCsecInvolvementChange} name="usa" />}
                      label="USA"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.csecInvolvement.mexico} onChange={handleCsecInvolvementChange} name="mexico" />}
                      label="Mexico"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.csecInvolvement.fosterCare} onChange={handleCsecInvolvementChange} name="fosterCare" />}
                      label="Foster Care Awol History"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.csecInvolvement.canada} onChange={handleCsecInvolvementChange} name="canada" />}
                      label="Canada"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.csecInvolvement.nicaragua} onChange={handleCsecInvolvementChange} name="nicaragua" />}
                      label="Nicaragua"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormGroup>
                    <FormControlLabel
                      control={<Checkbox checked={formData.csecInvolvement.elSalvador} onChange={handleCsecInvolvementChange} name="elSalvador" />}
                      label="El Salvador"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={formData.csecInvolvement.uzbekistan} onChange={handleCsecInvolvementChange} name="uzbekistan" />}
                      label="Uzbekistan"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </Grid>

            {/* Custom Field section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Custom Field (5)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="customField"
                value={formData.customField}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            {/* Ethnicity section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Ethnicity 6</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <FormGroup row>
                <FormControlLabel
                  control={<Checkbox checked={formData.ethnicity.nonHispanic} onChange={handleEthnicityChange} name="nonHispanic" />}
                  label="Non-Hispanic"
                />
                <Box sx={{ width: 200 }} /> {/* Spacer */}
                <FormControlLabel
                  control={<Checkbox checked={formData.ethnicity.hispanic} onChange={handleEthnicityChange} name="hispanic" />}
                  label="Hispanic"
                />
              </FormGroup>
            </Grid>

            {/* Bio Custom Field 7 section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Bio Custom Field 7</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="bioCustomField1"
                value={formData.bioCustomField1}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            {/* Bio Custom Field 8 section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Bio Custom Field 8</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="bioCustomField2"
                value={formData.bioCustomField2}
                onChange={handleChange}
                variant="outlined"
              />
            </Grid>

            {/* New Mexico Pueblo or Tribe section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>New Mexico Pueblo or Tribe</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                select
                fullWidth
                name="puebloORtribe"
                value={formData.puebloORtribe || ''}
                onChange={handleChange}
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
                {puebloTribeOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Runaway Incidents section - Only show for victim mode */}
          {isVictim && (
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2, mt: 3, mb: 3, border: '1px solid #ddd' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'normal' }}>
                  Runaway Incidents
                </Typography>
                
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<span>+</span>}
                  onClick={addRunawayIncident}
                  sx={{ mb: 2 }}
                >
                  Add new record
                </Button>
                
                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                  <Box sx={{ display: 'flex', width: '100%', bgcolor: 'background.default', borderBottom: '1px solid #ddd' }}>
                    <Box sx={{ width: '20%', p: 1, fontWeight: 'bold', borderRight: '1px solid #ddd' }}>Action</Box>
                    <Box sx={{ width: '25%', p: 1, fontWeight: 'bold', borderRight: '1px solid #ddd' }}>Start Date</Box>
                    <Box sx={{ width: '25%', p: 1, fontWeight: 'bold', borderRight: '1px solid #ddd' }}>Length of Time</Box>
                    <Box sx={{ width: '30%', p: 1, fontWeight: 'bold' }}>Location</Box>
                  </Box>
                  
                  {/* New incident input row */}
                  <Box sx={{ display: 'flex', width: '100%', borderBottom: '1px solid #ddd' }}>
                    <Box sx={{ width: '20%', p: 1, borderRight: '1px solid #ddd' }}>
                      {/* Action button will be the submission */}
                    </Box>
                    <Box sx={{ width: '25%', p: 1, borderRight: '1px solid #ddd' }}>
                      <TextField
                        type="date"
                        name="startDate"
                        size="small"
                        fullWidth
                        value={newRunawayIncident.startDate}
                        onChange={handleRunawayIncidentChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ width: '25%', p: 1, borderRight: '1px solid #ddd' }}>
                      <TextField
                        size="small"
                        fullWidth
                        name="lengthOfTime"
                        value={newRunawayIncident.lengthOfTime}
                        onChange={handleRunawayIncidentChange}
                        placeholder="e.g., 3 days"
                      />
                    </Box>
                    <Box sx={{ width: '30%', p: 1 }}>
                      <TextField
                        size="small"
                        fullWidth
                        name="location"
                        value={newRunawayIncident.location}
                        onChange={handleRunawayIncidentChange}
                        placeholder="Location"
                      />
                    </Box>
                  </Box>
                  
                  {/* List of existing incidents */}
                  {formData.runawayIncidents.length > 0 ? (
                    formData.runawayIncidents.map(incident => (
                      <Box key={incident.id} sx={{ display: 'flex', width: '100%', borderBottom: '1px solid #ddd' }}>
                        <Box sx={{ width: '20%', p: 1, borderRight: '1px solid #ddd' }}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="error"
                            onClick={() => removeRunawayIncident(incident.id)}
                          >
                            Delete
                          </Button>
                        </Box>
                        <Box sx={{ width: '25%', p: 1, borderRight: '1px solid #ddd' }}>
                          {incident.startDate}
                        </Box>
                        <Box sx={{ width: '25%', p: 1, borderRight: '1px solid #ddd' }}>
                          {incident.lengthOfTime}
                        </Box>
                        <Box sx={{ width: '30%', p: 1 }}>
                          {incident.location}
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      No items to display
                    </Box>
                  )}
                  
                  {/* Pagination controls */}
                  <Box sx={{ display: 'flex', p: 1, borderTop: '1px solid #ddd' }}>
                    <Button size="small" disabled>«</Button>
                    <Button size="small" disabled>‹</Button>
                    <Button size="small" variant="contained" sx={{ bgcolor: 'primary.main' }}>0</Button>
                    <Button size="small" disabled>›</Button>
                    <Button size="small" disabled>»</Button>
                    <Box sx={{ flexGrow: 1, textAlign: 'right', color: 'text.secondary' }}>
                      No items to display
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          )}
        </Box>
        </Box>
      </Paper>

            {/* Contact Information section */}
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 0, mt: 3, mb: 3, border: '1px solid #ddd' }}>
                <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderBottom: '1px solid #ddd' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'normal', m: 0 }}>
                    Contact Information
                  </Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                  {/* Street Address */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Street Address</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="contactStreetAddress"
                      value={formData.contactStreetAddress}
                        onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Address Line 2 */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Address Line 2</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="contactAddressLine2"
                      value={formData.contactAddressLine2}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* City, State, Zip in one line */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>City, State, Zip</Typography>
                  </Grid>

                  <Grid item xs={12} sm={9}>
                    <Grid container spacing={2}>
                      {/* City */}
                      <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                          name="contactCity"
                          value={formData.contactCity}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                      {/* State */}
                      <Grid item xs={12} sm={3}>
                        <TextField
                          select
                          fullWidth
                          name="contactState"
                          value={formData.contactState || ''}
                          onChange={handleChange}
                          variant="outlined"
                          disabled={loadingPickLists}
                          SelectProps={{
                            displayEmpty: true,
                            renderValue: (value) => {
                              if (!value) {
                                return loadingPickLists ? 'Loading...' : '';
                              }
                              return value;
                            },
                          }}
                        >
                          {stateOptions.length > 0 ? (
                            stateOptions.map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))
                          ) : (
                            <MenuItem disabled>No states available</MenuItem>
                          )}
                        </TextField>
                  </Grid>

                      {/* Zip */}
                      <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                          name="contactZip"
                          value={formData.contactZip}
                      onChange={handleChange}
                      variant="outlined"
                    />
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* County, Region */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>County, Region</Typography>
                  </Grid>

                  <Grid item xs={12} sm={9}>
                    <Grid container spacing={2}>
                      {/* County (free text input) */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          name="contactCounty"
                          value={formData.contactCounty || ''}
                          onChange={handleChange}
                          variant="outlined"
                          placeholder="County"
                        />
                      </Grid>

                      {/* Region (dropdown with only 'null') */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          fullWidth
                          name="contactRegion"
                          value={formData.contactRegion || 'null'}
                          onChange={handleChange}
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
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Resides Out of Country</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9} sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.contactResidesOutOfCountry}
                          onChange={(e) => setFormData({...formData, contactResidesOutOfCountry: e.target.checked})}
                        />
                      }
                      label="Yes"
                    />
                  </Grid>

                  {/* Start Date */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Start Date</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="contactStartDate"
                      type="date"
                      value={formData.contactStartDate}
                      onChange={handleChange}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* End Date */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>End Date</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="contactEndDate"
                      type="date"
                      value={formData.contactEndDate}
                        onChange={handleChange}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* Home Phone */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Home Phone</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="contactHomePhone"
                      value={formData.contactHomePhone}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Cell Phone */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Cell Phone</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="contactCellPhone"
                      value={formData.contactCellPhone}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Work Phone */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Work Phone</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="contactWorkPhone"
                      value={formData.contactWorkPhone}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Email Address */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Email Address</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="contactEmailAddress"
                      type="email"
                      value={formData.contactEmailAddress}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Case Specific Information section */}
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 0, mt: 3, mb: 3, border: '1px solid #ddd' }}>
                <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderBottom: '1px solid #ddd' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'normal', m: 0 }}>
                    Case Specific Information
                  </Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                  {/* Victim Status */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Victim Status</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      select
                      fullWidth
                      name="victimStatus"
                      value={formData.victimStatus || ''}
                      onChange={handleChange}
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
                      {victimStatusOptions.length > 0 ? (
                        victimStatusOptions.map(option => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>No options available</MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  {/* Age at Time of Referral */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>Age at Time of Referral</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="ageAtReferral"
                      value={formData.ageAtReferral}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      select
                      fullWidth
                      name="ageUnit"
                      value={formData.ageUnit || 'Years'}
                      onChange={handleChange}
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

                  {/* School or Employer */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>School Or Employer</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="schoolOrEmployer"
                      value={formData.schoolOrEmployer}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Education Level */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Education Level</Typography>
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
                        value={formData.educationLevel || ''}
                        onChange={handleChange}
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
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Marital Status</Typography>
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
                        value={formData.maritalStatus || ''}
                        onChange={handleChange}
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
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Income Level of Household</Typography>
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
                        value={formData.incomeLevel || ''}
                        onChange={handleChange}
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
                      checked={formData.youthSexualBehaviors}
                      onChange={(e) => setFormData({...formData, youthSexualBehaviors: e.target.checked})}
                    />
                  </Grid>

                  {/* Military Connection */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Military Connection</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <Checkbox
                      checked={formData.militaryConnection}
                      onChange={(e) => setFormData({...formData, militaryConnection: e.target.checked})}
                    />
                  </Grid>

                  {/* Military Type */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Military Type</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    {manualInputFields.militaryType ? (
                      <TextField
                        fullWidth
                        name="militaryType"
                        value={manualInputValues.militaryType || ''}
                        onChange={(e) => handleManualInputChange('militaryType', e.target.value)}
                        variant="outlined"
                        placeholder="Enter value manually"
                        disabled={!formData.militaryConnection}
                      />
                    ) : (
                      <TextField
                        select
                        fullWidth
                        name="militaryType"
                        value={formData.militaryType || ''}
                        onChange={handleChange}
                        variant="outlined"
                        disabled={!formData.militaryConnection}
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
                        <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                      </TextField>
                    )}
                  </Grid>

                  {/* Military Dependent Relationship */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Military Dependent Relationship</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    {manualInputFields.militaryDependentRelationship ? (
                      <TextField
                        fullWidth
                        name="militaryDependentRelationship"
                        value={manualInputValues.militaryDependentRelationship || ''}
                        onChange={(e) => handleManualInputChange('militaryDependentRelationship', e.target.value)}
                        variant="outlined"
                        placeholder="Enter value manually"
                        disabled={!formData.militaryConnection}
                      />
                    ) : (
                      <TextField
                        select
                        fullWidth
                        name="militaryDependentRelationship"
                        value={formData.militaryDependentRelationship || ''}
                        onChange={handleChange}
                        variant="outlined"
                        disabled={!formData.militaryConnection}
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
                        <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                      </TextField>
                    )}
                  </Grid>

                  {/* Military Connection Name */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Military Connection Name</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="militaryConnectionName"
                      value={formData.militaryConnectionName}
                      onChange={handleChange}
                      variant="outlined"
                      disabled={!formData.militaryConnection}
                    />
                  </Grid>

                  {/* Custom Field (1) */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Custom Field (1)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    {manualInputFields.customField1 ? (
                      <TextField
                        fullWidth
                        name="customField1"
                        value={manualInputValues.customField1 || ''}
                        onChange={(e) => handleManualInputChange('customField1', e.target.value)}
                        variant="outlined"
                        placeholder="Enter value manually"
                      />
                    ) : (
                      <TextField
                        select
                        fullWidth
                        name="customField1"
                        value={formData.customField1 || ''}
                        onChange={handleChange}
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
                        {customField1Options.length > 0 ? (
                          customField1Options.map(option => (
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

                  {/* CSF Eligible (2) */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>CSF Eligible (2)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9} sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Checkbox 
                          checked={formData.csfEligible} 
                          onChange={(e) => setFormData({...formData, csfEligible: e.target.checked})}
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
                    <TextField
                      fullWidth
                      name="transportationAssistance"
                      value={formData.transportationAssistance}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Custom Field (4) */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Custom Field (4)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="customField4"
                      value={formData.customField4}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Community (5) */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Community (5)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={formData.community.westHills} 
                              onChange={handleCommunityChange} 
                              name="westHills"
                            />
                          }
                          label="West Hills"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={formData.community.glenview} 
                              onChange={handleCommunityChange} 
                              name="glenview"
                            />
                          }
                          label="Glenview"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={formData.community.cedarBluffApartments} 
                              onChange={handleCommunityChange} 
                              name="cedarBluffApartments"
                            />
                          }
                          label="Cedar Bluff Apartments"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={formData.community.hardinValley} 
                              onChange={handleCommunityChange} 
                              name="hardinValley"
                            />
                          }
                          label="Hardin Valley"
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Case Person Custom Field 6 */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Case Person Custom Field 6</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="casePersonCustomField6"
                      value={formData.casePersonCustomField6}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Case Person Custom Field 7 */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Case Person Custom Field 7</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="casePersonCustomField7"
                      value={formData.casePersonCustomField7}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Case Person Custom Field 8 */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Case Person Custom Field 8</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="casePersonCustomField8"
                      value={formData.casePersonCustomField8}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Case Person Custom Field 9 */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Case Person Custom Field 9</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="casePersonCustomField9"
                      value={formData.casePersonCustomField9}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
                </Box>
              </Paper>
            </Grid>

            {/* Referral Section - Only show for victim mode */}
            {isVictim && (
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 2, mt: 3, mb: 3, border: '1px solid #ddd' }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'normal', bgcolor: 'background.default', p: 1 }}>
                    Referral
                  </Typography>

                <Grid container spacing={2}>
                  {/* Date Received by CAC */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>Date Received by CAC *</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="dateReceivedByCac"
                      type="date"
                      value={formData.dateReceivedByCac}
                      onChange={handleChange}
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  {/* Referral Agency */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Referral Agency</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      name="referralAgency"
                      value={formData.referralAgency || ''}
                      onChange={handleChange}
                      variant="outlined"
                      disabled={loadingReferralOptions}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => {
                          if (!value) {
                            return loadingReferralOptions ? 'Loading options...' : '';
                          }
                          return value;
                        }
                      }}
                    >
                      {referralAgencyOptions.length > 0 ? (
                        referralAgencyOptions.map(option => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>
                          {loadingReferralOptions ? 'Loading...' : 'No agencies available'}
                        </MenuItem>
                      )}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      startIcon={<span>+</span>}
                    >
                      Add
                    </Button>
                  </Grid>

                  {/* Referral Person */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Referral Person</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      name="referralPerson"
                      value={formData.referralPerson || ''}
                      onChange={handleChange}
                      variant="outlined"
                      disabled={loadingReferralOptions}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => {
                          if (!value) {
                            return loadingReferralOptions ? 'Loading options...' : '';
                          }
                          return value;
                        }
                      }}
                    >
                      {referralPersonOptions.length > 0 ? (
                        referralPersonOptions.map(option => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>
                          {loadingReferralOptions ? 'Loading...' : 'No persons available'}
                        </MenuItem>
                      )}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      startIcon={<span>+</span>}
                    >
                      Add
                    </Button>
                  </Grid>

                  {/* Reason for Referral */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" color="error" sx={{ fontWeight: 'bold' }}>Reason for Referral</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <RadioGroup
                      name="reasonForReferral"
                      value={formData.reasonForReferral}
                      onChange={handleRadioChange}
                    >
                      <FormControlLabel 
                        value="Allegation Of Abuse" 
                        control={<Radio />} 
                        label="Allegation Of Abuse" 
                      />
                      <FormControlLabel 
                        value="Requesting Other Direct Services" 
                        control={<Radio />} 
                        label="Requesting Other Direct Services" 
                      />
                      <FormControlLabel 
                        value="Requesting Other Indirect Services" 
                        control={<Radio />} 
                        label="Requesting Other Indirect Services" 
                      />
                    </RadioGroup>
                    {validationErrors.reasonForReferral && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                        {validationErrors.reasonForReferral}
                      </Typography>
                    )}
                  </Grid>

                  {/* Incident Information - Show only when "Allegation Of Abuse" is selected */}
                  {formData.reasonForReferral === 'Allegation Of Abuse' && (
                    <Grid item xs={12}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 0, 
                          mt: 2, 
                          mb: 2,
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: '#f5f5f5',
                            p: 2,
                            borderBottom: '1px solid #e0e0e0'
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
                            Incident Information
                          </Typography>
                        </Box>
                        <Box sx={{ p: 3 }}>

                        <Grid container spacing={2}>
                          {/* Date First Reported */}
                          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Date First Reported</Typography>
                          </Grid>
                          <Grid item xs={12} sm={9}>
                            <TextField
                              fullWidth
                              name="dateFirstReported"
                              type="date"
                              value={formData.dateFirstReported}
                              onChange={handleChange}
                              variant="outlined"
                              size="small"
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>

                          {/* Alleged Maltreatment */}
                          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, pt: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Alleged Maltreatment</Typography>
                          </Grid>
                          <Grid item xs={12} sm={9}>
                            <Grid container spacing={2}>
                              {/* Left Column */}
                              <Grid item xs={12} sm={6}>
                                <FormGroup>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="adultSurvivorVOCAV1"
                                        checked={formData.allegedMaltreatment.adultSurvivorVOCAV1}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Adult Survivor VOCA V1"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="childFatality"
                                        checked={formData.allegedMaltreatment.childFatality}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Child Fatality"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="childPornography"
                                        checked={formData.allegedMaltreatment.childPornography}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Child Pornography"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="childTrafficking"
                                        checked={formData.allegedMaltreatment.childTrafficking}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Child Trafficking"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="commerciallySexuallyExploitedChildren"
                                        checked={formData.allegedMaltreatment.commerciallySexuallyExploitedChildren}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Commercially Sexually Exploited Children"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="childSexTrafficking"
                                        checked={formData.allegedMaltreatment.childSexTrafficking}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Child Sex Trafficking"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="domesticMinorSexTrafficking"
                                        checked={formData.allegedMaltreatment.domesticMinorSexTrafficking}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Domestic Minor Sex Trafficking"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="csec"
                                        checked={formData.allegedMaltreatment.csec}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="CSEC"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="humanTraffickingLaborExploitation"
                                        checked={formData.allegedMaltreatment.humanTraffickingLaborExploitation}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Human Trafficking - Labor Exploitation"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="humanTraffickingSexualAbuse"
                                        checked={formData.allegedMaltreatment.humanTraffickingSexualAbuse}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Human Trafficking: Sexual Abuse"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="massViolence"
                                        checked={formData.allegedMaltreatment.massViolence}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Mass Violence"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="neglect"
                                        checked={formData.allegedMaltreatment.neglect}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Neglect"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="physicalAbuse"
                                        checked={formData.allegedMaltreatment.physicalAbuse}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Physical Abuse"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="sextortion"
                                        checked={formData.allegedMaltreatment.sextortion}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Sextortion"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="teenDatingVictimization"
                                        checked={formData.allegedMaltreatment.teenDatingVictimization}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Teen Dating Victimization"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="vocaAbuseType"
                                        checked={formData.allegedMaltreatment.vocaAbuseType}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="VOCA Abuse Type"
                                  />
                                </FormGroup>
                              </Grid>

                              {/* Right Column */}
                              <Grid item xs={12} sm={6}>
                                <FormGroup>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="bullyingVOCAV2"
                                        checked={formData.allegedMaltreatment.bullyingVOCAV2}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Bullying VOCA V2"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="childLaborTrafficking"
                                        checked={formData.allegedMaltreatment.childLaborTrafficking}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Child Labor Trafficking"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="childSexualAbuseMaterial"
                                        checked={formData.allegedMaltreatment.childSexualAbuseMaterial}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Child Sexual Abuse Material"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="commercialSexualExploitationOfChildren"
                                        checked={formData.allegedMaltreatment.commercialSexualExploitationOfChildren}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Commercial Sexual Exploitation of Children (CSEC)"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="communityViolence"
                                        checked={formData.allegedMaltreatment.communityViolence}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Community Violence"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="heroinExposure"
                                        checked={formData.allegedMaltreatment.heroinExposure}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Heroin Exposure"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="drugEndangered"
                                        checked={formData.allegedMaltreatment.drugEndangered}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Drug Endangered"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="drugExposureOpiods"
                                        checked={formData.allegedMaltreatment.drugExposureOpiods}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Drug Exposure - Opiods"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="humanTraffickingSexualExploitation"
                                        checked={formData.allegedMaltreatment.humanTraffickingSexualExploitation}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Human Trafficking - Sexual Exploitation"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="interpersonalViolenceFamilyViolence"
                                        checked={formData.allegedMaltreatment.interpersonalViolenceFamilyViolence}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Interpersonal Violence/Family Violence"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="methamphetamineExposure2"
                                        checked={formData.allegedMaltreatment.methamphetamineExposure2}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Methamphetamine Exposure 2"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="newAbuseType"
                                        checked={formData.allegedMaltreatment.newAbuseType}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="New Abuse Type"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="psychologicalAbuse"
                                        checked={formData.allegedMaltreatment.psychologicalAbuse}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Psychological Abuse"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="sexualAbuse"
                                        checked={formData.allegedMaltreatment.sexualAbuse}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Sexual Abuse"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        name="witnessToViolence"
                                        checked={formData.allegedMaltreatment.witnessToViolence}
                                        onChange={handleAllegedMaltreatmentChange}
                                      />
                                    }
                                    label="Witness to Violence"
                                  />
                                </FormGroup>
                              </Grid>
                            </Grid>
                          </Grid>

                          {/* Location Description */}
                          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Location Description</Typography>
                          </Grid>
                          <Grid item xs={12} sm={9}>
                            <TextField
                              fullWidth
                              name="locationDescription"
                              value={formData.locationDescription}
                              onChange={handleChange}
                              variant="outlined"
                              size="small"
                            />
                          </Grid>

                          {/* Incident State and County - Side by side */}
                          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Incident State</Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              select
                              fullWidth
                              name="incidentState"
                              value={formData.incidentState}
                              onChange={(e) => {
                                handleChange(e);
                                // Clear county when state changes (since county is now a text input)
                                setFormData(prev => ({ ...prev, incidentCounty: '' }));
                              }}
                              variant="outlined"
                              size="small"
                              SelectProps={{
                                displayEmpty: true,
                                renderValue: (value) => {
                                  if (!value) return '';
                                  return value;
                                }
                              }}
                            >
                              {stateOptions.length > 0 ? (
                                stateOptions.map((option) => (
                                  <MenuItem key={option} value={option}>
                                    {option}
                                  </MenuItem>
                                ))
                              ) : (
                                defaultStateOptions.map((option) => (
                                  <MenuItem key={option} value={option}>
                                    {option}
                                  </MenuItem>
                                ))
                              )}
                            </TextField>
                          </Grid>
                          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Incident County</Typography>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              name="incidentCounty"
                              value={formData.incidentCounty || ''}
                              onChange={handleChange}
                              variant="outlined"
                              size="small"
                              placeholder="County"
                            />
                          </Grid>

                          {/* Location Type */}
                          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Location Type</Typography>
                          </Grid>
                          <Grid item xs={12} sm={9}>
                            <TextField
                              select
                              fullWidth
                              name="locationType"
                              value={formData.locationType}
                              onChange={handleChange}
                              variant="outlined"
                              size="small"
                              SelectProps={{
                                displayEmpty: true,
                                renderValue: (value) => {
                                  if (!value) return '';
                                  return value;
                                }
                              }}
                            >
                              <MenuItem value="Abandoned Home">Abandoned Home</MenuItem>
                              <MenuItem value="Alleged Offender's Home">Alleged Offender's Home</MenuItem>
                              <MenuItem value="Child's Home">Child's Home</MenuItem>
                              <MenuItem value="Child's School">Child's School</MenuItem>
                              <MenuItem value="Church/Temple">Church/Temple</MenuItem>
                              <MenuItem value="Other">Other</MenuItem>
                              <MenuItem value="Place of Business">Place of Business</MenuItem>
                              <MenuItem value="Victim's Home">Victim's Home</MenuItem>
                            </TextField>
                          </Grid>

                          {/* Narrative Description */}
                          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, pt: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Narrative Description</Typography>
                          </Grid>
                          <Grid item xs={12} sm={9}>
                            <TextField
                              fullWidth
                              name="narrativeDescription"
                              value={formData.narrativeDescription}
                              onChange={handleChange}
                              variant="outlined"
                              multiline
                              rows={4}
                              size="small"
                            />
                          </Grid>
                        </Grid>
                        </Box>
                      </Paper>
                    </Grid>
                  )}

                  {/* Other Direct Services - Show only when "Requesting Other Direct Services" is selected */}
                  {formData.reasonForReferral === 'Requesting Other Direct Services' && (
                    <Grid item xs={12}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 3, 
                          mt: 2, 
                          mb: 2,
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <Grid container spacing={2}>
                          {/* Other Direct Services */}
                          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, pt: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Other Direct Services</Typography>
                          </Grid>
                          <Grid item xs={12} sm={9}>
                            <Grid container spacing={2}>
                                {/* Left Column */}
                                <Grid item xs={12} sm={6}>
                                  <FormGroup>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="caseManagementForDVVictim"
                                          checked={formData.otherDirectServices.caseManagementForDVVictim}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Case Management for DV Victim"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="crisisCounseling"
                                          checked={formData.otherDirectServices.crisisCounseling}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Crisis Counseling"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="fosterCarePhysical"
                                          checked={formData.otherDirectServices.fosterCarePhysical}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Foster Care Physical"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="medicalExamNotAbuse"
                                          checked={formData.otherDirectServices.medicalExamNotAbuse}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Medical exam - not abuse"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="therapy"
                                          checked={formData.otherDirectServices.therapy}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Therapy"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="fathersDayCamp"
                                          checked={formData.otherDirectServices.fathersDayCamp}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Father's Day Camp"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="voca"
                                          checked={formData.otherDirectServices.voca}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="VOCA"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="adultTraumaHistory"
                                          checked={formData.otherDirectServices.adultTraumaHistory}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Adult Trauma History"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="movedToAnotherCAC"
                                          checked={formData.otherDirectServices.movedToAnotherCAC}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Moved to another CAC"
                                    />
                                  </FormGroup>
                                </Grid>

                                {/* Right Column */}
                                <Grid item xs={12} sm={6}>
                                  <FormGroup>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="courtesyInterview"
                                          checked={formData.otherDirectServices.courtesyInterview}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Courtesy Interview"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="adultVictimsGroupTherapy"
                                          checked={formData.otherDirectServices.adultVictimsGroupTherapy}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Adult Victims Group Therapy"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="kidsSafetyPreventionGroup"
                                          checked={formData.otherDirectServices.kidsSafetyPreventionGroup}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Kids Safety Prevention Group"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="siblingInterview"
                                          checked={formData.otherDirectServices.siblingInterview}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Sibling Interview"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="adultRapeCrisisCenterClient"
                                          checked={formData.otherDirectServices.adultRapeCrisisCenterClient}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Adult Rape Crisis Center Client"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="satp"
                                          checked={formData.otherDirectServices.satp}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="SATP"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="gap"
                                          checked={formData.otherDirectServices.gap}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="GAP"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="servicesWereDeclined"
                                          checked={formData.otherDirectServices.servicesWereDeclined}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Services were declined"
                                    />
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name="youthWithProblematicSexualBehavior"
                                          checked={formData.otherDirectServices.youthWithProblematicSexualBehavior}
                                          onChange={handleOtherDirectServicesChange}
                                        />
                                      }
                                      label="Youth with Problematic Sexual Behavior"
                                    />
                                  </FormGroup>
                                </Grid>
                              </Grid>
                            </Grid>

                            {/* Direct Service Comments */}
                            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, pt: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Direct Service Comments</Typography>
                            </Grid>
                            <Grid item xs={12} sm={9}>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                <TextField
                                  fullWidth
                                  name="directServiceComments"
                                  value={formData.directServiceComments}
                                  onChange={handleChange}
                                  variant="outlined"
                                  multiline
                                  rows={4}
                                  size="small"
                                />
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <IconButton
                                    color="primary"
                                    size="small"
                                    sx={{ 
                                      backgroundColor: 'primary.main',
                                      color: 'white',
                                      borderRadius: 1,
                                      minWidth: '32px',
                                      height: '32px',
                                      '&:hover': {
                                        backgroundColor: 'primary.dark'
                                      }
                                    }}
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    color="primary"
                                    size="small"
                                    sx={{ 
                                      backgroundColor: 'primary.main',
                                      color: 'white',
                                      borderRadius: 1,
                                      minWidth: '32px',
                                      height: '32px',
                                      '&:hover': {
                                        backgroundColor: 'primary.dark'
                                      }
                                    }}
                                  >
                                    <RemoveIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Box>
                            </Grid>
                          </Grid>
                      </Paper>
                    </Grid>
                  )}

                  {/* Service Location 1 */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Service Location 1</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    {manualInputFields.serviceLocation ? (
                      <TextField
                        fullWidth
                        name="serviceLocation"
                        value={manualInputValues.serviceLocation || ''}
                        onChange={(e) => handleManualInputChange('serviceLocation', e.target.value)}
                        variant="outlined"
                        placeholder="Enter value manually"
                        disabled={loadingReferralOptions}
                      />
                    ) : (
                      <TextField
                        select
                        fullWidth
                        name="serviceLocation"
                        value={formData.serviceLocation || ''}
                        onChange={handleChange}
                        variant="outlined"
                        disabled={loadingReferralOptions}
                        SelectProps={{
                          displayEmpty: true,
                          renderValue: (value) => {
                            if (!value) {
                              return loadingReferralOptions ? 'Loading options...' : '';
                            }
                            return value;
                          }
                        }}
                      >
                        {serviceLocationOptions.length > 0 ? (
                          serviceLocationOptions.map(option => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled>
                            {loadingReferralOptions ? 'Loading...' : 'No locations available'}
                          </MenuItem>
                        )}
                        <MenuItem value="__MANUAL_INPUT__">No search found, input manually</MenuItem>
                      </TextField>
                    )}
                  </Grid>

                  {/* COVID Related? (2) */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>COVID Related? (2)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.covidRelated}
                          onChange={(e) => setFormData(prev => ({ ...prev, covidRelated: e.target.checked }))}
                          name="covidRelated"
                        />
                      }
                      label="COVID Related"
                    />
                  </Grid>

                  {/* History of Drugs/Violence (3) */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, pt: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>History of Drugs/Violence (3)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {formData.historyOfDrugsViolence.map((item, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, flex: 1 }}>
                          <TextField
                            fullWidth
                            value={item}
                            onChange={(e) => {
                              const newArray = [...formData.historyOfDrugsViolence];
                              newArray[index] = e.target.value;
                              setFormData(prev => ({ ...prev, historyOfDrugsViolence: newArray }));
                            }}
                            variant="outlined"
                          />
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => {
                                const newArray = [...formData.historyOfDrugsViolence];
                                newArray.push('');
                                setFormData(prev => ({ ...prev, historyOfDrugsViolence: newArray }));
                              }}
                              sx={{ minWidth: '40px', height: '28px', p: 0 }}
                            >
                              +
                            </Button>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => {
                                if (formData.historyOfDrugsViolence.length > 1) {
                                  const newArray = formData.historyOfDrugsViolence.filter((_, i) => i !== index);
                                  setFormData(prev => ({ ...prev, historyOfDrugsViolence: newArray }));
                                }
                              }}
                              disabled={formData.historyOfDrugsViolence.length === 1}
                              sx={{ minWidth: '40px', height: '28px', p: 0 }}
                            >
                              -
                            </Button>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Grid>

                  {/* Polyvictimization (4) */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Polyvictimization (4)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      select
                      fullWidth
                      name="polyvictimization"
                      value={formData.polyvictimization || ''}
                      onChange={handleChange}
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
                      <MenuItem value=""></MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                      <MenuItem value="Unknown">Unknown</MenuItem>
                    </TextField>
                  </Grid>

                  {/* Which Center's Case (5) */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Which Center's Case (5)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <FormGroup row>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.whichCenterCase.kidsHope}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              whichCenterCase: { ...prev.whichCenterCase, kidsHope: e.target.checked }
                            }))}
                            name="kidsHope"
                          />
                        }
                        label="Kid's Hope"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.whichCenterCase.newHope}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              whichCenterCase: { ...prev.whichCenterCase, newHope: e.target.checked }
                            }))}
                            name="newHope"
                          />
                        }
                        label="New Hope"
                      />
                    </FormGroup>
                  </Grid>

                  {/* Custom Field (6) */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Custom Field (6)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      fullWidth
                      name="referralCustomField6"
                      value={formData.referralCustomField6}
                      onChange={handleChange}
                      variant="outlined"
                    />
                  </Grid>

                  {/* Presenting - Custom Field 7 */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, pt: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Presenting - Custom Field 7</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {formData.presentingCustomField7.map((item, index) => (
                        <Box key={index} sx={{ display: 'flex', gap: 1, flex: 1 }}>
                          <TextField
                            fullWidth
                            value={item}
                            onChange={(e) => {
                              const newArray = [...formData.presentingCustomField7];
                              newArray[index] = e.target.value;
                              setFormData(prev => ({ ...prev, presentingCustomField7: newArray }));
                            }}
                            variant="outlined"
                          />
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => {
                                const newArray = [...formData.presentingCustomField7];
                                newArray.push('');
                                setFormData(prev => ({ ...prev, presentingCustomField7: newArray }));
                              }}
                              sx={{ minWidth: '40px', height: '28px', p: 0 }}
                            >
                              +
                            </Button>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => {
                                if (formData.presentingCustomField7.length > 1) {
                                  const newArray = formData.presentingCustomField7.filter((_, i) => i !== index);
                                  setFormData(prev => ({ ...prev, presentingCustomField7: newArray }));
                                }
                              }}
                              disabled={formData.presentingCustomField7.length === 1}
                              sx={{ minWidth: '40px', height: '28px', p: 0 }}
                            >
                              -
                            </Button>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Grid>

                  {/* Presenting - Custom Field Chp8 */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Presenting - Custom Field Chp8</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <TextField
                      select
                      fullWidth
                      name="presentingCustomFieldChp8"
                      value={formData.presentingCustomFieldChp8 || ''}
                      onChange={handleChange}
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
                      <MenuItem value=""></MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                      <MenuItem value="Unknown">Unknown</MenuItem>
                    </TextField>
                  </Grid>

                  {/* Presenting - Custom Field Chp9 */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Presenting - Custom Field Chp9</Typography>
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <FormGroup row>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.presentingCustomFieldChp9.fbi}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              presentingCustomFieldChp9: { ...prev.presentingCustomFieldChp9, fbi: e.target.checked }
                            }))}
                            name="fbi"
                          />
                        }
                        label="FBI"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.presentingCustomFieldChp9.yes}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              presentingCustomFieldChp9: { ...prev.presentingCustomFieldChp9, yes: e.target.checked }
                            }))}
                            name="yes"
                          />
                        }
                        label="Yes"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.presentingCustomFieldChp9.no}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              presentingCustomFieldChp9: { ...prev.presentingCustomFieldChp9, no: e.target.checked }
                            }))}
                            name="no"
                          />
                        }
                        label="No"
                      />
                    </FormGroup>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            )}

            {/* Prior Interviews Section - Only show for victim mode */}
            {isVictim && (
              <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2, mt: 3, mb: 3, border: '1px solid #ddd' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'normal', bgcolor: 'background.default', p: 1 }}>
                  Prior Interviews
                </Typography>
                
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<span>+</span>}
                  onClick={addPriorInterview}
                  sx={{ mb: 2 }}
                >
                  Add new record
                </Button>
                
                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                  <Box sx={{ display: 'flex', width: '100%', bgcolor: 'background.default', borderBottom: '1px solid #ddd' }}>
                    <Box sx={{ width: '50%', p: 1, fontWeight: 'bold', borderRight: '1px solid #ddd' }}>Agency</Box>
                    <Box sx={{ width: '50%', p: 1, fontWeight: 'bold' }}>Interview Date</Box>
                  </Box>
                  
                  {/* New interview input row */}
                  <Box sx={{ display: 'flex', width: '100%', borderBottom: '1px solid #ddd' }}>
                    <Box sx={{ width: '50%', p: 1, borderRight: '1px solid #ddd' }}>
                      <TextField
                        size="small"
                        fullWidth
                        name="agency"
                        value={newPriorInterview.agency}
                        onChange={handlePriorInterviewChange}
                        placeholder="Agency"
                      />
                    </Box>
                    <Box sx={{ width: '50%', p: 1 }}>
                      <TextField
                        type="date"
                        name="interviewDate"
                        size="small"
                        fullWidth
                        value={newPriorInterview.interviewDate}
                        onChange={handlePriorInterviewChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                  </Box>
                  
                  {/* List of existing interviews */}
                  {formData.priorInterviews.length > 0 ? (
                    formData.priorInterviews.map(interview => (
                      <Box key={interview.id} sx={{ display: 'flex', width: '100%', borderBottom: '1px solid #ddd' }}>
                        <Box sx={{ width: '50%', p: 1, borderRight: '1px solid #ddd' }}>
                          {interview.agency}
                        </Box>
                        <Box sx={{ width: '50%', p: 1 }}>
                          {interview.interviewDate}
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      No items to display
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
            )}

            {/* MDT Section - Only show for victim mode */}
            {isVictim && (
              <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2, mt: 3, mb: 3, border: '1px solid #ddd' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'normal', bgcolor: 'background.default', p: 1 }}>
                  MDT
                </Typography>

                <Grid container spacing={2}>
                  {/* MDT Meeting */}
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                    <Typography variant="body1">MDT Meeting</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      name="mdtMeeting"
                      value={formData.mdtMeeting || ''}
                      onChange={handleChange}
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
                      <MenuItem value="">
                        <em>Select...</em>
                      </MenuItem>
                      {mdtMeetingOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      startIcon={<span>+</span>}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            )}

            {/* Relationship to Alleged Victims/Clients Section - Only show for other mode */}
            {isOther && (
              <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 0, mt: 3, mb: 3, border: '1px solid #ddd' }}>
                <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderBottom: '1px solid #ddd' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0, color: '#d32f2f' }}>
                    Relationship to Alleged Victims/Clients
                  </Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  {/* Relationship table will be added here */}
                  <Box sx={{ width: '100%', overflowX: 'auto' }}>
                    <TableContainer sx={{ border: '1px solid #d1d5db' }}>
                      <Table 
                        size="small"
                        sx={{
                          '& .MuiTableCell-root': {
                            border: '1px solid #d1d5db',
                          }
                        }}
                      >
                        <TableHead>
                          {/* Add new record button row */}
                          <TableRow>
                            <TableCell colSpan={6} sx={{ bgcolor: '#f5f5f5', p: 1 }}>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<span>+</span>}
                                onClick={() => setRelationshipModalOpen(true)}
                                sx={{ 
                                  borderColor: '#d1d5db',
                                  color: '#000000',
                                  backgroundColor: '#ffffff',
                                  '&:hover': {
                                    borderColor: '#9ca3af',
                                    backgroundColor: '#ffffff'
                                  }
                                }}
                              >
                                Add new record
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Action</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Alleged Victim/Client</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Relationship</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Role</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Same Household</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Custody</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {relationships.map((rel, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => removeRelationship(index)}
                                    sx={{
                                      borderColor: '#d1d5db',
                                      color: '#000000',
                                      backgroundColor: '#ffffff',
                                      '&:hover': {
                                        borderColor: '#9ca3af',
                                        backgroundColor: '#f9fafb'
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<EditIcon />}
                                    onClick={() => handleEditRelationship(index)}
                                    sx={{
                                      borderColor: '#d1d5db',
                                      color: '#000000',
                                      backgroundColor: '#ffffff',
                                      '&:hover': {
                                        borderColor: '#9ca3af',
                                        backgroundColor: '#f9fafb'
                                      }
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </Box>
                              </TableCell>
                              <TableCell>{rel.victimName || 'N/A'}</TableCell>
                              <TableCell>{rel.relationshipName || 'N/A'}</TableCell>
                              <TableCell>{rel.roleName || 'N/A'}</TableCell>
                              <TableCell>
                                <Checkbox checked={rel.sameHousehold || false} disabled />
                              </TableCell>
                              <TableCell>
                                <Checkbox checked={rel.custody || false} disabled />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Box>
              </Paper>
              </Grid>
            )}
      </Box>

      <ConfirmationModal
        open={confirmModalOpen}
        title="Update Person Information"
        message={`You are attempting to change the information of a person already in CARE. This will change the person's information on all cases in CARE. Are you sure you want to do this?`}
        onConfirm={handleConfirmChanges}
        onCancel={handleCancelChanges}
      />
      
      {/* Lookup Person Modal */}
      <Dialog
        open={lookupModalOpen}
        onClose={handleCloseLookupModal}
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
            onPersonSelect={handlePersonSelect} 
            onClose={handleCloseLookupModal}
            currentCaseId={currentCaseId}
            returnTo={returnTo || '/NewCase'}
            initialSearchTerm={duplicateCheckSearchTerm}
            initialFirstName={duplicateCheckFirstName}
            autoSearch={showDuplicateWarning}
          />
        </DialogContent>
      </Dialog>

      

      {/* Relationship Modal - Only for other mode */}
      {isOther && (
        <Dialog
          open={relationshipModalOpen}
          onClose={() => {
            setRelationshipModalOpen(false);
            setEditingRelationshipIndex(null);
            setNewRelationship({
              victimId: '',
              relationshipId: '',
              roleId: '',
              sameHousehold: false,
              custody: false
            });
          }}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" component="div">
                {editingRelationshipIndex !== null ? 'Edit Relationship to Alleged Victim/Client' : 'Add Relationship to Alleged Victim/Client'}
              </Typography>
              <IconButton
                onClick={() => {
                  setRelationshipModalOpen(false);
                  setEditingRelationshipIndex(null);
                  setNewRelationship({
                    victimId: '',
                    relationshipId: '',
                    roleId: '',
                    sameHousehold: false,
                    custody: false
                  });
                }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Alleged Victim/Client</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  select
                  fullWidth
                  value={newRelationship.victimId || ''}
                  onChange={(e) => setNewRelationship(prev => ({ ...prev, victimId: e.target.value }))}
                  variant="outlined"
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value) => {
                      if (!value) {
                        return '';
                      }
                      const victim = victimsList.find(v => String(v.person_id) === String(value));
                      return victim ? `${victim.first_name || ''} ${victim.last_name || ''}`.trim() || 'Unnamed Victim' : '';
                    }
                  }}
                >
                  {victimsList.length === 0 ? (
                    <MenuItem disabled value="">
                      <em>No victims available</em>
                    </MenuItem>
                  ) : (
                    victimsList.map(victim => (
                      <MenuItem key={victim.person_id} value={String(victim.person_id)}>
                        {`${victim.first_name || ''} ${victim.last_name || ''}`.trim() || 'Unnamed Victim'}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Relationship</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  select
                  fullWidth
                  value={newRelationship.relationshipId || ''}
                  onChange={(e) => setNewRelationship(prev => ({ ...prev, relationshipId: e.target.value }))}
                  variant="outlined"
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value) => {
                      if (!value) {
                        return '';
                      }
                      return RELATIONSHIP_MAP[parseInt(value, 10)] || '';
                    }
                  }}
                >
                  <MenuItem disabled value="">
                    <em></em>
                  </MenuItem>
                  {Object.entries(RELATIONSHIP_MAP).map(([id, name]) => (
                    <MenuItem key={id} value={String(id)}>
                      {name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Role</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <TextField
                  select
                  fullWidth
                  value={newRelationship.roleId || ''}
                  onChange={(e) => setNewRelationship(prev => ({ ...prev, roleId: e.target.value }))}
                  variant="outlined"
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value) => {
                      if (!value) {
                        return '';
                      }
                      return ROLE_MAP[parseInt(value, 10)] || '';
                    }
                  }}
                >
                  <MenuItem disabled value="">
                    <em></em>
                  </MenuItem>
                  {/* Exclude victim role (1) for other people */}
                  {Object.entries(ROLE_MAP)
                    .filter(([id]) => parseInt(id) !== 1)
                    .map(([id, name]) => (
                      <MenuItem key={id} value={String(id)}>
                        {name}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Same Household</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Checkbox
                  checked={newRelationship.sameHousehold}
                  onChange={(e) => setNewRelationship(prev => ({ ...prev, sameHousehold: e.target.checked }))}
                />
              </Grid>
              
              <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Custody</Typography>
              </Grid>
              <Grid item xs={12} sm={9}>
                <Checkbox
                  checked={newRelationship.custody}
                  onChange={(e) => setNewRelationship(prev => ({ ...prev, custody: e.target.checked }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'flex-end', borderTop: '1px solid #e0e0e0' }}>
            <Button
              onClick={handleAddRelationship}
              variant="contained"
              color="primary"
              startIcon={<CheckCircleIcon />}
            >
              {editingRelationshipIndex !== null ? 'Update' : 'Add'}
            </Button>
            <Button
              onClick={() => {
                setRelationshipModalOpen(false);
                setEditingRelationshipIndex(null);
                setNewRelationship({
                  victimId: '',
                  relationshipId: '',
                  roleId: '',
                  sameHousehold: false,
                  custody: false
                });
              }}
              variant="outlined"
              startIcon={<CancelIcon />}
              sx={{ color: '#666', borderColor: '#666' }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}

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
    </Box>
  );
};

export default NewCase;