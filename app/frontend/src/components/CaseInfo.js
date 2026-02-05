// app/frontend/src/components/CaseInfo.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  IconButton
} from '@mui/material';
import { FirstPage, LastPage, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { casesApi, peopleApi, pickListsApi } from '../services/api';
import { formatSSN, unformatSSN } from '../utils/ssnFormatter';
import { getCountiesForState } from '../constants/stateCounties';
import { stateOptions as defaultStateOptions } from '../constants/options';
import ConfirmationModal from './ConfirmationModal';

const CaseInfo = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get personId from location state (if provided)
  const targetPersonId = location.state?.personId;
  
  const [caseData, setCaseData] = useState(null);
  const [primaryPerson, setPrimaryPerson] = useState(null);
  const [casePersonData, setCasePersonData] = useState(null);
  const [firstVictimPersonId, setFirstVictimPersonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  
  // Store original data for cancel functionality
  const [originalPersonalProfileData, setOriginalPersonalProfileData] = useState(null);
  const [originalCaseSpecificData, setOriginalCaseSpecificData] = useState(null);
  
  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingPersonUpdateData, setPendingPersonUpdateData] = useState(null);
  const [pendingCasePersonUpdateData, setPendingCasePersonUpdateData] = useState(null);
  
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
  const [customField1Options, setCustomField1Options] = useState([]);
  const [relationshipOptions, setRelationshipOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [militaryConnectionOptions, setMilitaryConnectionOptions] = useState([]);
  const [loadingPickLists, setLoadingPickLists] = useState(false);
  const [countyOptions, setCountyOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);
  // State dropdown options (full state names)
  const [stateOptions, setStateOptions] = useState(defaultStateOptions || []);

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
    streetAddress: '',
    addressLine2: '',
    cityStateZip: '',
    state: '',
    county: '',
    region: '',
    countyRegion: '', // Keep for backward compatibility
    residesOutOfCountry: false,
    startDate: '',
    endDate: '',
    homePhone: '',
    cellPhone: '',
    workPhone: '',
    emailAddress: '',
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

  // Load picklists for Case Specific Information
  useEffect(() => {
    const loadPickLists = async () => {
      try {
        setLoadingPickLists(true);
        const categories = await pickListsApi.getAllCategories();
        const caseCategory = categories.find(c => 
          c.category_name === 'Case Specific Information'
        );

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
        }
      } catch (err) {
        console.error('Failed to load picklists:', err);
      } finally {
        setLoadingPickLists(false);
      }
    };

    loadPickLists();
  }, []);

  // Load case data and primary person
  useEffect(() => {
    const loadCaseData = async () => {
      if (!caseId) {
        // No case ID - this is normal, just show empty form
        setError(null);
        setLoading(false);
        setCaseData(null);
        setPrimaryPerson(null);
        setCasePersonData(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch case data with case_person relationships
        const caseDataResponse = await casesApi.getCaseById(parseInt(caseId));
        setCaseData(caseDataResponse);

        // Find primary person (role_id = 1, which is Alleged Co-victim)
        if (caseDataResponse.case_person && caseDataResponse.case_person.length > 0) {
          // Find the first victim (role_id = 1, smallest person_id)
          const victims = caseDataResponse.case_person.filter(cp => cp.role_id === 1);
          if (victims.length > 0) {
            const sortedVictims = [...victims].sort((a, b) => a.person_id - b.person_id);
            setFirstVictimPersonId(sortedVictims[0].person_id);
            console.log('First victim person_id:', sortedVictims[0].person_id);
          } else {
            setFirstVictimPersonId(null);
          }
          
          // Find the case_person record to display
          // If targetPersonId is provided, use that person; otherwise use primary person
          let targetCasePerson = null;
          if (targetPersonId) {
            // Find the specific person's case_person record
            targetCasePerson = caseDataResponse.case_person.find(
              cp => cp.person_id === parseInt(targetPersonId)
            );
            if (!targetCasePerson) {
              console.warn(`Person ${targetPersonId} not found in case ${caseId}, falling back to primary person`);
            }
          }
          
          // If no target person found or no targetPersonId provided, use primary person
          if (!targetCasePerson) {
          // Sort by role_id to prioritize Alleged Co-victim (role_id = 1)
          const sortedCasePersons = [...caseDataResponse.case_person].sort((a, b) => {
            const roleA = a.role_id || 999;
            const roleB = b.role_id || 999;
            return roleA - roleB;
          });
            targetCasePerson = sortedCasePersons[0];
          }

          setCasePersonData(targetCasePerson);

          if (targetCasePerson.person) {
            // Load full person data
            const personData = await peopleApi.getPersonById(targetCasePerson.person_id);
            setPrimaryPerson(personData);

            // Format date for input fields
            let formattedDob = '';
            if (personData.date_of_birth) {
              const date = new Date(personData.date_of_birth);
              formattedDob = date.toISOString().split('T')[0];
            }

            // Fetch race information to map race_id to race name
            let raceName = '';
            if (personData.race_id) {
              try {
                const categories = await pickListsApi.getAllCategories();
                const peopleCategory = categories.find(c => c.category_name === 'People Tab');
                
                if (peopleCategory) {
                  const pickLists = await pickListsApi.getPickListsByCategoryId(peopleCategory.category_id);
                  const raceList = pickLists.find(list => list.list_name === 'Race');
                  
                  if (raceList) {
                    const items = await pickListsApi.getItemsByListId(raceList.list_id);
                    const raceItem = items.find(item => item.item_id === personData.race_id);
                    if (raceItem) {
                      raceName = raceItem.value;
                    }
                  }
                }
              } catch (err) {
                console.error('Failed to map race ID to name:', err);
              }
            }

            // Initialize Personal Profile form data
            // Format SSN if it exists
            const formattedSSN = personData.ssn ? formatSSN(personData.ssn) : '';
            const personalProfileFormData = {
              firstName: personData.first_name || '',
              middleName: personData.middle_name || '',
              lastName: personData.last_name || '',
              suffix: personData.suffix || '',
              nickName: personData.nick_name || '',
              ssn: formattedSSN,
              dateOfBirth: formattedDob || '',
              unknownDateOfBirth: !formattedDob,
              dateOfDeath: personData.date_of_death ? new Date(personData.date_of_death).toISOString().split('T')[0] : '',
              dateAdded: personData.date_added ? new Date(personData.date_added).toISOString().split('T')[0] : '',
              biologicalSex:
                personData.gender === 'M' ? 'Male' :
                personData.gender === 'F' ? 'Female' :
                personData.gender === 'I' ? 'Intersex' :
                personData.gender === 'U' ? 'Unknown' :
                personData.gender === 'D' ? 'Decline to Answer' :
                '',
              race: raceName || personData.race || '',
              religion: personData.religion || '',
              firstLanguage: personData.first_language || '',
              voca: personData.voca ? personData.voca.split(',').map(s => s.trim()) : [],
              specialPopulations: personData.special_populations ? personData.special_populations.split(',').map(s => s.trim()) : [],
              riskFactors: personData.risk_factors ? personData.risk_factors.split(',').map(s => s.trim()) : [],
              csec: personData.csec ? personData.csec.split(',').map(s => s.trim()) : [],
              csecInvolvement: personData.csec_involvement ? personData.csec_involvement.split(',').map(s => s.trim()) : [],
              selfIdentifiedGender: personData.self_identified_gender ? personData.self_identified_gender.split(',').map(s => s.trim()) : [],
              pronouns: personData.pronouns || '',
              ethnicity6: personData.ethnicity_6 ? personData.ethnicity_6.split(',').map(s => s.trim()) : [],
              materialInvolvement: personData.material_involvement ? personData.material_involvement.split(',').map(s => s.trim()) : [],
              housingInsecurityRisk: personData.housing_insecurity_risk || '',
              tribe: personData.tribe || '',
              priorConvictions: !!personData.prior_convictions,
              convictedAgainstChildren: !!personData.convicted_against_children,
              sexOffender: !!personData.sex_offender,
              sexPredator: !!personData.sex_predator,
              specialNeeds: personData.special_needs || '',
              commentsForPeople: personData.comments_for_people || '',
              developmentalAge: personData.developmental_age || '',
              customField: personData.custom_field || '',
              bioCustomField7: personData.bio_custom_field_7 || '',
              bioCustomField8: personData.bio_custom_field_8 || ''
            };
            setPersonalProfileData(personalProfileFormData);
            setOriginalPersonalProfileData(JSON.parse(JSON.stringify(personalProfileFormData)));
          }

          // Parse community_5 string into community object
          const communityValue = targetCasePerson.community_5 || '';
          const communityObj = {
            westHills: communityValue.includes('West Hills') || false,
            glenview: communityValue.includes('Glenview') || false,
            cedarBluffApartments: communityValue.includes('Cedar Bluff Apartments') || false,
            hardinValley: communityValue.includes('Hardin Valley') || false
          };

          // Populate Case Specific Information from case_person
          // Parse city, state, zip separately
          const city = targetCasePerson.city || '';
          // Convert state_abbr to full state name for dropdown
          let state = '';
          if (targetCasePerson.state_abbr) {
            // Try to find full state name from abbreviation
            const stateAbbr = targetCasePerson.state_abbr.toUpperCase();
            const stateMap = {
              'OK': 'Oklahoma', 'TX': 'Texas', 'CA': 'California', 'NY': 'New York',
              'FL': 'Florida', 'IL': 'Illinois', 'PA': 'Pennsylvania', 'OH': 'Ohio',
              'GA': 'Georgia', 'NC': 'North Carolina', 'MI': 'Michigan', 'NJ': 'New Jersey',
              'VA': 'Virginia', 'WA': 'Washington', 'AZ': 'Arizona', 'MA': 'Massachusetts',
              'TN': 'Tennessee', 'IN': 'Indiana', 'MO': 'Missouri', 'MD': 'Maryland',
              'WI': 'Wisconsin', 'CO': 'Colorado', 'MN': 'Minnesota', 'SC': 'South Carolina',
              'AL': 'Alabama', 'LA': 'Louisiana', 'KY': 'Kentucky', 'OR': 'Oregon',
              'CT': 'Connecticut', 'OK': 'Oklahoma', 'IA': 'Iowa', 'UT': 'Utah',
              'AR': 'Arkansas', 'NV': 'Nevada', 'MS': 'Mississippi', 'KS': 'Kansas',
              'NM': 'New Mexico', 'NE': 'Nebraska', 'WV': 'West Virginia', 'ID': 'Idaho',
              'HI': 'Hawaii', 'NH': 'New Hampshire', 'ME': 'Maine', 'RI': 'Rhode Island',
              'MT': 'Montana', 'DE': 'Delaware', 'SD': 'South Dakota', 'ND': 'North Dakota',
              'AK': 'Alaska', 'DC': 'District of Columbia', 'VT': 'Vermont', 'WY': 'Wyoming'
            };
            state = stateMap[stateAbbr] || targetCasePerson.state_abbr;
          }
          const zip = targetCasePerson.zip || '';
          
          // Format cityStateZip for backward compatibility
          let cityStateZip = '';
          if (city) {
            cityStateZip = city;
            if (state) {
              cityStateZip += `, ${state}`;
            }
            if (zip) {
              cityStateZip += ` ${zip}`;
            }
          }
          
          // Format county, region
          let countyRegion = '';
          if (targetCasePerson.county) {
            countyRegion = targetCasePerson.county;
            if (targetCasePerson.region) {
              countyRegion += `, ${targetCasePerson.region}`;
            }
          }

          const caseSpecificFormData = {
            relationshipId: targetCasePerson.relationship_id?.toString() || '',
            roleId: targetCasePerson.role_id?.toString() || '',
            victimStatus: targetCasePerson.victim_status || '',
            ageAtReferral: targetCasePerson.age?.toString() || '',
            ageUnit: targetCasePerson.age_unit || 'Years',
            sameHousehold: targetCasePerson.same_household || false,
            custody: targetCasePerson.custody || false,
            streetAddress: targetCasePerson.address_line_1 || '',
            addressLine2: targetCasePerson.address_line_2 || '',
            city: city,
            state: state,
            zip: zip,
            cityStateZip: cityStateZip, // Keep for backward compatibility
            county: targetCasePerson.county || '',
            region: targetCasePerson.region || '',
            countyRegion: countyRegion, // Keep for backward compatibility
            residesOutOfCountry: false, // Not in database yet
            startDate: targetCasePerson.start_date ? new Date(targetCasePerson.start_date).toISOString().split('T')[0] : '',
            endDate: targetCasePerson.end_date ? new Date(targetCasePerson.end_date).toISOString().split('T')[0] : '',
            homePhone: targetCasePerson.home_phone_number || '',
            cellPhone: targetCasePerson.cell_phone_number || '',
            workPhone: targetCasePerson.work_phone_number || '',
            emailAddress: targetCasePerson.email_address || '',
            schoolOrEmployer: targetCasePerson.school_or_employer || '',
            educationLevel: targetCasePerson.education_level_id || '',
            maritalStatus: targetCasePerson.marital_status_id || '',
            incomeLevel: targetCasePerson.income_level_id || '',
            youthSexualBehaviors: targetCasePerson.problematic_sex || false,
            militaryConnection: targetCasePerson.mili_connection ? 'Yes' : '',
            militaryType: targetCasePerson.mili_type_id || '',
            militaryDependentRelationship: targetCasePerson.mili_dependent_relationship || '',
            militaryConnectionName: targetCasePerson.mili_connection_name || '',
            customField1: targetCasePerson.custom_field_1 || '',
            csfEligible: targetCasePerson.csf_eligible_2 || false,
            transportationAssistance: targetCasePerson.family_transport_assistance_3 || false,
            customField4: targetCasePerson.custom_field_4 || '',
            community: communityObj,
            casePersonCustomField6: targetCasePerson.case_person_custom_field_6 || '',
            casePersonCustomField7: targetCasePerson.case_person_custom_field_7 || '',
            casePersonCustomField8: targetCasePerson.case_person_custom_field_8 || '',
            casePersonCustomField9: targetCasePerson.case_person_custom_field_9 || ''
          };
          setCaseSpecificData(caseSpecificFormData);
          setOriginalCaseSpecificData(JSON.parse(JSON.stringify(caseSpecificFormData)));
        } else {
          // No people in case - this is normal for a new case, just show empty form
          setError(null);
          setCaseData(caseDataResponse);
          setPrimaryPerson(null);
          setCasePersonData(null);
        }
      } catch (err) {
        console.error('Failed to load case data:', err);
        // Provide more detailed error message
        const errorMessage = err.message || err.toString();
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setError('Network error: Unable to connect to the server. Please check if the backend API is running.');
        } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          // 404 means case doesn't exist - this is normal, don't show as error
          setError(null);
          setCaseData(null);
          setPrimaryPerson(null);
          setCasePersonData(null);
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
          setError('Server error: The server encountered an error. Please try again later or contact support.');
        } else {
          // Other errors - check if it's a data issue or real error
          if (errorMessage.includes('No people') || errorMessage.includes('not found')) {
            setError(null);
            setCaseData(null);
            setPrimaryPerson(null);
            setCasePersonData(null);
          } else {
            setError(`Failed to load case information: ${errorMessage}. Please try again.`);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadCaseData();
  }, [caseId, targetPersonId]);

  // Handle Personal Profile input change
  const handlePersonalProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    
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
      
      setPersonalProfileData((prev) => ({
        ...prev,
        [name]: value
      }));
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

  // Handle Case Specific Information input change
  const handleCaseSpecificChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Update county options when state changes
    if (name === 'state') {
      if (value) {
        const counties = getCountiesForState(value);
        console.log('[CaseInfo] State selected:', {
          state: value,
          countiesCount: counties ? counties.length : 0,
          counties: counties
        });
        setCountyOptions(counties || []);
      } else {
        setCountyOptions([]);
      }
    }
    
    setCaseSpecificData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Update county options when state changes (same as NewCase.js and AddNewPerson.js)
  useEffect(() => {
    if (caseSpecificData.state) {
      const counties = getCountiesForState(caseSpecificData.state);
      setCountyOptions(counties || []);
    } else {
      setCountyOptions([]);
    }
  }, [caseSpecificData.state]);

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

  // Handle Save - Modified to show confirmation modal for person changes
  const handleSave = async () => {
    if (!primaryPerson || !caseId) {
      setError('Missing person or case information');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Always prepare person update data (even if unchanged, we'll check in handleConfirmSave)
      let personUpdateData = null;
      if (originalPersonalProfileData) {
          // Map personal profile data to API format
          // Convert formatted SSN to unformatted (pure digits) for database storage
          const ssnForDB = personalProfileData.ssn ? unformatSSN(personalProfileData.ssn) : null;
          
        personUpdateData = {
            first_name: personalProfileData.firstName || null,
            middle_name: personalProfileData.middleName || null,
            last_name: personalProfileData.lastName || null,
            suffix: personalProfileData.suffix || null,
            nick_name: personalProfileData.nickName || null,
            ssn: ssnForDB,
            date_of_birth: personalProfileData.dateOfBirth ? new Date(personalProfileData.dateOfBirth) : null,
            date_of_death: personalProfileData.dateOfDeath ? new Date(personalProfileData.dateOfDeath) : null,
            date_added: personalProfileData.dateAdded ? new Date(personalProfileData.dateAdded) : null,
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
      }

      // Always prepare case_person update data (even if unchanged, we'll check in handleConfirmSave)
      let casePersonUpdateData = null;
      if (originalCaseSpecificData) {
          // Convert community object to string
          const communityArray = [];
          if (caseSpecificData.community.westHills) communityArray.push('West Hills');
          if (caseSpecificData.community.glenview) communityArray.push('Glenview');
          if (caseSpecificData.community.cedarBluffApartments) communityArray.push('Cedar Bluff Apartments');
          if (caseSpecificData.community.hardinValley) communityArray.push('Hardin Valley');
          const communityString = communityArray.join(', ');

          // Map case specific data to API format
          // Use separate city, state, zip fields if available, otherwise parse from cityStateZip
          let city = caseSpecificData.city || null;
          let state = caseSpecificData.state || null;
          let zip = caseSpecificData.zip || null;
          
          // If separate fields are empty, try to parse from cityStateZip (backward compatibility)
          if (!city && !state && !zip && caseSpecificData.cityStateZip) {
            const cityStateZipParts = caseSpecificData.cityStateZip.split(',');
            city = cityStateZipParts[0]?.trim() || null;
            const stateZip = cityStateZipParts[1]?.trim() || '';
            const stateMatch = stateZip.match(/^([A-Z]{2})\s/);
            state = stateMatch ? stateMatch[1] : null;
            const zipMatch = stateZip.match(/\s+(\d{5}(-\d{4})?)/);
            zip = zipMatch ? zipMatch[1] : null;
          }
          
          // Convert full state name to abbreviation if needed
          if (state && state.length > 2) {
            const stateNameToAbbr = {
              'Oklahoma': 'OK', 'Texas': 'TX', 'California': 'CA', 'New York': 'NY',
              'Florida': 'FL', 'Illinois': 'IL', 'Pennsylvania': 'PA', 'Ohio': 'OH',
              'Georgia': 'GA', 'North Carolina': 'NC', 'Michigan': 'MI', 'New Jersey': 'NJ',
              'Virginia': 'VA', 'Washington': 'WA', 'Arizona': 'AZ', 'Massachusetts': 'MA',
              'Tennessee': 'TN', 'Indiana': 'IN', 'Missouri': 'MO', 'Maryland': 'MD',
              'Wisconsin': 'WI', 'Colorado': 'CO', 'Minnesota': 'MN', 'South Carolina': 'SC',
              'Alabama': 'AL', 'Louisiana': 'LA', 'Kentucky': 'KY', 'Oregon': 'OR',
              'Connecticut': 'CT', 'Iowa': 'IA', 'Utah': 'UT', 'Arkansas': 'AR',
              'Nevada': 'NV', 'Mississippi': 'MS', 'Kansas': 'KS', 'New Mexico': 'NM',
              'Nebraska': 'NE', 'West Virginia': 'WV', 'Idaho': 'ID', 'Hawaii': 'HI',
              'New Hampshire': 'NH', 'Maine': 'ME', 'Rhode Island': 'RI', 'Montana': 'MT',
              'Delaware': 'DE', 'South Dakota': 'SD', 'North Dakota': 'ND', 'Alaska': 'AK',
              'District of Columbia': 'DC', 'Vermont': 'VT', 'Wyoming': 'WY'
            };
            state = stateNameToAbbr[state] || state;
          }
          
          // Use separate county, region fields if available, otherwise parse from countyRegion
          let county = caseSpecificData.county || null;
          let region = caseSpecificData.region || null;
          
          // If separate fields are empty, try to parse from countyRegion (backward compatibility)
          if (!county && !region && caseSpecificData.countyRegion) {
            const countyRegionParts = caseSpecificData.countyRegion.split(',');
            county = countyRegionParts[0]?.trim() || null;
            region = countyRegionParts[1]?.trim() || null;
          }

        casePersonUpdateData = {
            relationship_id: caseSpecificData.relationshipId ? parseInt(caseSpecificData.relationshipId) : null,
            role_id: caseSpecificData.roleId ? parseInt(caseSpecificData.roleId) : null,
            victim_status: caseSpecificData.victimStatus || null,
            age: caseSpecificData.ageAtReferral ? parseInt(caseSpecificData.ageAtReferral) : null,
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
            start_date: caseSpecificData.startDate ? new Date(caseSpecificData.startDate) : null,
            end_date: caseSpecificData.endDate ? new Date(caseSpecificData.endDate) : null,
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
      }

      // Always show confirmation modal when clicking save
      setPendingPersonUpdateData(personUpdateData);
      setPendingCasePersonUpdateData(casePersonUpdateData);
      setConfirmModalOpen(true);
    } catch (err) {
      console.error('Failed to save data:', err);
      setError(`Failed to save data: ${err.message}`);
      setSaving(false);
    }
  };

  // Handle actual save after confirmation
  const handleConfirmSave = async () => {
    if (!primaryPerson || !caseId) {
      setError('Missing person or case information');
      setConfirmModalOpen(false);
      return;
    }

    setSaving(true);
    setConfirmModalOpen(false);
    setError(null);
    setSuccess(null);

    try {
      // Check if person data has changed
      let personDataChanged = false;
      if (pendingPersonUpdateData && originalPersonalProfileData) {
        personDataChanged = JSON.stringify(personalProfileData) !== JSON.stringify(originalPersonalProfileData);
      }

      // Check if case_person data has changed
      let casePersonDataChanged = false;
      if (pendingCasePersonUpdateData && originalCaseSpecificData) {
        casePersonDataChanged = JSON.stringify(caseSpecificData) !== JSON.stringify(originalCaseSpecificData);
      }

      // Update person data if changed
      if (personDataChanged && pendingPersonUpdateData) {
        await peopleApi.updatePerson(primaryPerson.person_id, pendingPersonUpdateData);
      setOriginalPersonalProfileData(JSON.parse(JSON.stringify(personalProfileData)));
      }

      // Update case_person data if changed
      if (casePersonDataChanged && pendingCasePersonUpdateData) {
        await peopleApi.updateCasePersonDetails(primaryPerson.person_id, parseInt(caseId), pendingCasePersonUpdateData);
      setOriginalCaseSpecificData(JSON.parse(JSON.stringify(caseSpecificData)));
      }

      if (personDataChanged || casePersonDataChanged) {
      setSuccess('Data saved successfully!');
      } else {
        setSuccess('No changes to save');
      }

      setPendingPersonUpdateData(null);
      setPendingCasePersonUpdateData(null);
      
      // Navigate back to People page after successful save
      // Wait a moment to show success message, then navigate
      setTimeout(() => {
        navigate('/CasePeople');
      }, 500);
    } catch (err) {
      console.error('Failed to save data:', err);
      setError(`Failed to save data: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancellation of save
  const handleCancelSave = () => {
    setConfirmModalOpen(false);
    setPendingPersonUpdateData(null);
    setPendingCasePersonUpdateData(null);
  };

  // Handle Cancel
  const handleCancel = () => {
    if (originalPersonalProfileData) {
      setPersonalProfileData(JSON.parse(JSON.stringify(originalPersonalProfileData)));
    }
    if (originalCaseSpecificData) {
      setCaseSpecificData(JSON.parse(JSON.stringify(originalCaseSpecificData)));
    }
    setError(null);
    setSuccess(null);
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
          {primaryPerson ? (
            <>
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

                {/* Race section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" color="error" sx={{ fontWeight: 600, textAlign: 'right' }}>Race</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
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
                  </TextField>
                </Grid>

                {/* Religion section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Religion</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
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
                  </TextField>
                </Grid>

                {/* Language section */}
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Language</Typography>
                </Grid>
                <Grid item xs={12} sm={9}>
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
                  </TextField>
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

            {/* ALIASES Section */}
            <Box sx={{ mb: 4, mt: 4 }}>
              <Box sx={{ 
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}>
                {/* Title Section */}
                <Box sx={{ 
                  bgcolor: '#f5f5f5',
                  backgroundColor: '#f5f5f5',
                  p: 1.5,
                  borderBottom: '1px solid #d1d5db'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
                    ALIASES
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
                      console.log('Add new alias');
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
                        <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'left' }}>First Name</TableCell>
                        <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'left' }}>Middle Name</TableCell>
                        <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'left' }}>Last Name</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>

            {/* DATA PROVIDER PERSON IDS Section */}
            <Box sx={{ mb: 4, mt: 4 }}>
              <Box sx={{ 
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}>
                {/* Title Section */}
                <Box sx={{ 
                  bgcolor: '#f5f5f5',
                  backgroundColor: '#f5f5f5',
                  p: 1.5,
                  borderBottom: '1px solid #d1d5db'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', m: 0 }}>
                    DATA PROVIDER PERSON IDS
                  </Typography>
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
                        <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'left' }}>Data Provider</TableCell>
                        <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'left' }}>Person ID</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell
                          colSpan={3}
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
            </Box>
            </>
          ) : (
            <Alert severity="info">No primary person found for this case.</Alert>
          )}
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
                disabled={primaryPerson && primaryPerson.person_id === firstVictimPersonId}
                InputProps={{
                  readOnly: primaryPerson && primaryPerson.person_id === firstVictimPersonId,
                  sx: primaryPerson && primaryPerson.person_id === firstVictimPersonId ? {
                    backgroundColor: '#f0f0f0',
                    cursor: 'not-allowed',
                    '& .MuiInputBase-input': {
                      cursor: 'not-allowed'
                    }
                  } : {}
                }}
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

            {/* City, State, Zip */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>City, State, Zip</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    name="city"
                    value={caseSpecificData.city || ''}
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
                    value={caseSpecificData.state || ''}
                    onChange={handleCaseSpecificChange}
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
                    value={caseSpecificData.zip || ''}
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
                {/* County as free text input */}
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
                {/* Region dropdown with only 'null' option */}
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
              </TextField>
            </Grid>

            {/* Marital Status */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Marital Status</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
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
              </TextField>
            </Grid>

            {/* Income Level of Household */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Income Level of Household</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
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
              </TextField>
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={confirmModalOpen}
        title=""
        message="Are you sure you want to change this person's bio?"
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
      />
    </Box>
  );
};

export default CaseInfo;
