import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Container,
  Grid,
  FormGroup,
  CircularProgress,
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Radio,
  RadioGroup,
  FormControl,
  Select,
  MenuItem,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  IconButton
} from '@mui/material';
import { FirstPage, LastPage, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { peopleApi, pickListsApi, casesApi } from '../services/api';
import { useCase } from '../context/CaseContext';
import ConfirmationModal from './ConfirmationModal'; // Import the ConfirmationModal component
import ContactInfoTab from './ContactInfoTab'; // Import the ContactInfoTab component
import CasesTab from './CasesTab'; // Import the CasesTab component
import { formatSSN, unformatSSN } from '../utils/ssnFormatter';

const PersonBio = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCase } = useCase();

  // Get personId from location state, URL params, or derive from currentCase
  const getPersonIdFromLocation = () => {
    // If we're in create mode, explicitly return null to prevent loading existing person
    if (location.state?.createMode === true) {
      return null;
    }
    
    // Check if we have personId in the location state (but only if not explicitly null)
    if (location.state && location.state.personId !== null && location.state.personId !== undefined) {
      return location.state.personId;
    }
    
    // Check URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const urlPersonId = queryParams.get('personId');
    if (urlPersonId) {
      return urlPersonId;
    }
    
    // If no personId found, return null (will be handled in useEffect)
    return null;
  };
  
  const personId = getPersonIdFromLocation();

  // Tab state & handler - check if tab is specified in location state
  const [currentTab, setCurrentTab] = useState(() => {
    // Check if tab is specified in location state (when navigating from PersonCases)
    return location.state?.tab !== undefined ? location.state.tab : 0;
  }); // 0: Personal Profile, 1: Cases, 2: Contact Info
  
  const handleTabChange = (_event, newValue) => {
    // All tabs now stay on PersonBio page
    setCurrentTab(newValue);
  };
  
  // Race options
  const [raceOptions, setRaceOptions] = useState([]);
  const [loadingPickLists, setLoadingPickLists] = useState(false);

  // Options
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

  const riskFactorOptions = [
    'Gifts/Bribes from non-caregivers',
    'High Risk Sexual Behavior',
    'Other',
    'Risky Online Behavior',
    'Runaway',
    'Street Language',
    'Substance Abuse'
  ];

  const csecOptions = [
    'Child Pornography',
    'Other',
    'Sex Tourism',
    'Sex Trafficking'
  ];

  const childSexualAbuseMaterialOptions = [
    'Distribution',
    'Manufacturing',
    'Other',
    'Possession',
    'Trading'
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

  // Form state for person data
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
  
  // Additional states
  const [originalData, setOriginalData] = useState(null);
  const [currentPerson, setCurrentPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [clientContactInfo, setClientContactInfo] = useState(null);
  const [latestCaseInfo, setLatestCaseInfo] = useState(null);

  // Add confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  const formatCityStateZip = (info) => {
    if (!info) return '';
    const city = info.city ? info.city.trim() : '';
    const state = info.state ? info.state.trim() : '';
    const zip = info.zip ? info.zip.trim() : '';

    if (!city && !state && !zip) {
      return '';
    }

    let line = '';
    if (city) {
      line += city;
    }
    if (state) {
      line += line ? `, ${state}` : state;
    }
    if (zip) {
      line += state ? ` ${zip}` : (line ? ` ${zip}` : zip);
    }
    return line;
  };

  // Helper function to format age with unit
  const formatAge = (age, ageUnit) => {
    if (!age && age !== 0) return '';
    if (!ageUnit) return age?.toString() || '';
    return `${age} ${ageUnit}`;
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

  const handleContactInfoLinkClick = (event) => {
    event.preventDefault();
    setCurrentTab(2);
  };

  const contactAddressLine1 = clientContactInfo?.addressLine1
    ? clientContactInfo.addressLine1.trim()
    : '';
  const contactAddressLine2 = clientContactInfo?.addressLine2
    ? clientContactInfo.addressLine2.trim()
    : '';
  const contactCityStateZip = formatCityStateZip(clientContactInfo);
  const hasClientContactDetails =
    !!(contactAddressLine1 || contactAddressLine2 || contactCityStateZip);
  
  useEffect(() => {
    const fetchRacePickList = async () => {
      try {
        setLoadingPickLists(true);
        
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

  // Load person data when component mounts or personId/currentCase changes
  useEffect(() => {
    const fetchPersonData = async () => {
      // Check if we're in create mode - if so, skip all data loading
      const isCreateMode = location.state?.createMode === true;
      
      if (isCreateMode) {
        // Clear all form data and ensure we're in create mode
        setOriginalData(null);
        setClientContactInfo(null);
        setError(null);
        setLoading(false);
        // Reset formData to empty state
        setFormData(prev => {
          // Return empty form data structure
          return {
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
            specialNeeds: '',
            commentsForPeople: '',
            developmentalAge: '',
            customField: '',
            bioCustomField7: '',
            bioCustomField8: ''
          };
        });
        return;
      }
      
      let targetPersonId = personId;
      
      console.log('PersonBio useEffect - personId:', personId, 'currentCase:', currentCase, 'createMode:', isCreateMode);
      
      // If no personId provided, try to get it from currentCase
      // BUT ONLY if we're NOT in create mode
      if (!targetPersonId && currentCase && !isCreateMode) {
        try {
          console.log('Attempting to get person from currentCase:', currentCase);
          // Try to get the primary person from the current case
          const casePeople = await peopleApi.getPeopleByCaseId(currentCase);
          console.log('Case people result:', casePeople);
          if (casePeople && casePeople.length > 0) {
            // Get the first person (assuming primary person is first)
            targetPersonId = casePeople[0].person_id;
            console.log('Derived personId from currentCase:', targetPersonId);
          }
        } catch (err) {
          console.error('Failed to get person from current case:', err);
        }
      }
      
      // If still no personId, we're in "create" mode. Don't fetch; allow
      // the empty form to be shown so the user can create a new person.
      if (!targetPersonId) {
        // Ensure we don't show an error; leave formData as the initialized empty values.
        setOriginalData(null);
        setError(null);
        setLoading(false);
        return;
      }
      // Immediately reset local form state when personId changes to avoid
      // showing stale data from previous person while we fetch the new one.
      setFormData({
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
        // Reset new text fields
        specialNeeds: '',
        commentsForPeople: '',
        developmentalAge: '',
        customField: '',
        bioCustomField7: '',
        bioCustomField8: ''
      });
      setOriginalData(null);
      setClientContactInfo(null);
      setError(null);
      
      try {
        setLoading(true);
        
        // Fetch person details
        const personData = await peopleApi.getPersonById(targetPersonId);
        
        // Format date for input fields
        let formattedDob = '';
        if (personData.date_of_birth) {
          const date = new Date(personData.date_of_birth);
          formattedDob = date.toISOString().split('T')[0];
        }
        
        // Set current person data for display
        setCurrentPerson(personData);

        // Fetch case-specific contact information and latest case info
        let contactInfoData = null;
        let latestCaseData = null;
        try {
          const casesForPerson = await peopleApi.getCasesForPerson(targetPersonId);
          if (casesForPerson && casesForPerson.length > 0) {
            const normalizedCurrentCase = currentCase ? Number(currentCase) : null;
            let matchedCase = null;
            if (normalizedCurrentCase) {
              matchedCase = casesForPerson.find(
                (caseItem) => Number(caseItem.case_id) === normalizedCurrentCase
              );
            }
            if (!matchedCase) {
              matchedCase = casesForPerson[0];
            }

            if (matchedCase) {
              contactInfoData = {
                addressLine1: matchedCase.address_line_1 || '',
                addressLine2: matchedCase.address_line_2 || '',
                city: matchedCase.city || '',
                state: matchedCase.state_abbr || '',
                zip: matchedCase.zip || ''
              };
              
              // Store latest case info for LATEST CASE INFORMATION section
              latestCaseData = matchedCase;
            }
          }
        } catch (contactErr) {
          console.error('Failed to load case contact info:', contactErr);
        }
        setClientContactInfo(contactInfoData);
        setLatestCaseInfo(latestCaseData);
        
        // Set original data for comparison when saving
        // Normalize the voca, special_populations, risk_factors, csec, and material_involvement
        // fields so comparisons aren't affected by whitespace
        setOriginalData({
          ...personData,
          self_identified_gender: personData.self_identified_gender ? personData.self_identified_gender.split(',').map(s => s.trim()).join(',') : null,
          pronouns: personData.pronouns || null,
          voca: personData.voca ? personData.voca.split(',').map(s => s.trim()).join(',') : null,
          special_populations: personData.special_populations ? personData.special_populations.split(',').map(s => s.trim()).join(',') : null,
          risk_factors: personData.risk_factors ? personData.risk_factors.split(',').map(s => s.trim()).join(',') : null,
          csec: personData.csec ? personData.csec.split(',').map(s => s.trim()).join(',') : null,
          csec_involvement: personData.csec_involvement ? personData.csec_involvement.split(',').map(s => s.trim()).join(',') : null,
          ethnicity_6: personData.ethnicity_6 ? personData.ethnicity_6.split(',').map(s => s.trim()).join(',') : null,
          material_involvement: personData.material_involvement ? personData.material_involvement.split(',').map(s => s.trim()).join(',') : null,
          date_added: personData.date_added || null,
          housing_insecurity_risk: personData.housing_insecurity_risk || null,
          tribe: personData.tribe || null,
          prior_convictions: personData.prior_convictions ?? null,
          convicted_against_children: personData.convicted_against_children ?? null,
          sex_offender: personData.sex_offender ?? null,
          sex_predator: personData.sex_predator ?? null,
          special_needs: personData.special_needs || null,
          comments_for_people: personData.comments_for_people || null,
          developmental_age: personData.developmental_age || null,
          custom_field: personData.custom_field || null,
          bio_custom_field_7: personData.bio_custom_field_7 || null,
          bio_custom_field_8: personData.bio_custom_field_8 || null
        });
        
        // Fetch race information to map race_id to race name
        let raceName = '';
        if (personData.race_id) {
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
                
                // Find the race name by ID
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
        
        // Set form data
        console.log('Setting form data - race:', raceName || personData.race, 'religion:', personData.religion);
        // Format SSN if it exists
        const formattedSSN = personData.ssn ? formatSSN(personData.ssn) : '';
        setFormData({
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
          // Trim items when converting the saved comma string into an array
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
        });
        
        setError(null);
      } catch (err) {
        console.error('Failed to load person data:', err);
        setError('Failed to load person information. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPersonData();
  }, [personId, currentCase]);
 
  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    console.log('handleChange - name:', name, 'value:', value, 'type:', type);
    
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: checked
      }));
    } else {
      // Handle SSN formatting
      if (name === 'ssn') {
        const formatted = formatSSN(value);
        setFormData((prev) => {
          const newData = {
            ...prev,
            [name]: formatted
          };
          console.log('Updated formData:', newData);
          return newData;
        });
        return;
      }
      
      setFormData((prev) => {
        const newData = {
          ...prev,
          [name]: value
        };
        console.log('Updated formData:', newData);
        return newData;
      });
    }
  };
  
  // Handle unknown DOB checkbox
  const handleUnknownDOB = (e) => {
    const { checked } = e.target;
    setFormData(prev => ({
      ...prev,
      unknownDateOfBirth: checked,
      dateOfBirth: checked ? '' : prev.dateOfBirth
    }));
  };
  
  // Modified handleSave to show confirmation modal
  const handleSave = async () => {
    try {
      // Get race_id from race selection
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
      
      // Prepare person data for API
      // Convert formatted SSN to unformatted (pure digits) for database storage
      const ssnForDB = formData.ssn ? unformatSSN(formData.ssn) : null;
      
      const personData = {
        person_id: personId,
        first_name: formData.firstName,
        middle_name: formData.middleName,
        last_name: formData.lastName,
        suffix: formData.suffix,
        nick_name: formData.nickName,
        ssn: ssnForDB,
        date_of_birth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        date_of_death: formData.dateOfDeath ? new Date(formData.dateOfDeath).toISOString() : null,
        date_added: formData.dateAdded ? new Date(formData.dateAdded).toISOString() : null,
        gender: formData.biologicalSex === 'Male' ? 'M' :
                formData.biologicalSex === 'Female' ? 'F' :
                formData.biologicalSex === 'Intersex' ? 'I' :
                formData.biologicalSex === 'Unknown' ? 'U' :
                formData.biologicalSex === 'Decline to Answer' ? 'D' :
                null,
        race: formData.race || null,
        religion: formData.religion || null,
        first_language: formData.firstLanguage || null,
        voca: (Array.isArray(formData.voca) && formData.voca.length > 0) ? formData.voca.join(',') : null,
        special_populations: (Array.isArray(formData.specialPopulations) && formData.specialPopulations.length > 0) ? formData.specialPopulations.join(',') : null,
        risk_factors: (Array.isArray(formData.riskFactors) && formData.riskFactors.length > 0) ? formData.riskFactors.join(',') : null,
        csec: (Array.isArray(formData.csec) && formData.csec.length > 0) ? formData.csec.join(',') : null,
        csec_involvement: (Array.isArray(formData.csecInvolvement) && formData.csecInvolvement.length > 0) ? formData.csecInvolvement.join(',') : null,
        ethnicity_6: (Array.isArray(formData.ethnicity6) && formData.ethnicity6.length > 0) ? formData.ethnicity6.join(',') : null,
        self_identified_gender: (Array.isArray(formData.selfIdentifiedGender) && formData.selfIdentifiedGender.length > 0) ? formData.selfIdentifiedGender.join(',') : null,
        pronouns: formData.pronouns ?? null,
        material_involvement: (Array.isArray(formData.materialInvolvement) && formData.materialInvolvement.length > 0) ? formData.materialInvolvement.join(',') : null,
        special_needs: formData.specialNeeds || null,
        comments_for_people: formData.commentsForPeople || null,
        developmental_age: formData.developmentalAge || null,
        custom_field: formData.customField || null,
        bio_custom_field_7: formData.bioCustomField7 || null,
        bio_custom_field_8: formData.bioCustomField8 || null,
        housing_insecurity_risk: formData.housingInsecurityRisk || null,
        tribe: formData.tribe || null,
        prior_convictions: formData.priorConvictions ?? null,
        convicted_against_children: formData.convictedAgainstChildren ?? null,
        sex_offender: formData.sexOffender ?? null,
        sex_predator: formData.sexPredator ?? null,
      };

      // If there's no personId we treat this as a create operation
      if (!personId) {
        try {
          setSaving(true);

          // Get cac_id from location state (if coming from CasePersonList) or from currentCase
          const selectedCacId = location.state?.selectedCacId;
          let cacId = null;

          if (selectedCacId) {
            // Use CAC ID from location state (from CasePersonList)
            cacId = parseInt(selectedCacId, 10);
          } else if (currentCase) {
            // Fetch the case to obtain cac_id
            let fetchedCaseData = null;
            try {
              fetchedCaseData = await casesApi.getCaseById(currentCase);
            } catch (caseErr) {
              console.error('Failed to fetch case for cac_id:', caseErr);
            }

            if (fetchedCaseData && fetchedCaseData.cac_id) {
              cacId = fetchedCaseData.cac_id;
            }
          }

          if (!cacId) {
            setNotification({ show: true, message: 'Cannot create person: no CAC ID available', type: 'error' });
            setSaving(false);
            return;
          }

          // Check for duplicate names before creating
          if (personData.first_name && personData.last_name) {
            try {
              const duplicatePeople = await peopleApi.searchByName(
                personData.first_name.trim(),
                personData.last_name.trim()
              );
              
              // Filter for exact matches (case-insensitive)
              const exactMatches = duplicatePeople.filter(person => {
                const personFirstName = (person.first_name || '').trim().toLowerCase();
                const personLastName = (person.last_name || '').trim().toLowerCase();
                const inputFirstName = personData.first_name.trim().toLowerCase();
                const inputLastName = personData.last_name.trim().toLowerCase();
                return personFirstName === inputFirstName && personLastName === inputLastName;
              });
              
              if (exactMatches.length > 0) {
                // Found duplicate names - show warning
                const errorMessage = `Duplicate names found: "${personData.first_name} ${personData.last_name}" already exists in the database. Please review the duplicate names before creating a new person.`;
                setNotification({ show: true, message: errorMessage, type: 'error' });
                setSaving(false);
                return;
              }
            } catch (err) {
              // For errors (e.g., network errors), log but continue
              console.warn('Error checking for duplicate names:', err);
            }
          }

          // Attach cac_id to payload
          personData.cac_id = cacId;

          // Create new person
          const created = await peopleApi.createPerson(personData);

          setNotification({ show: true, message: 'Person created successfully', type: 'success' });
          setTimeout(() => { setNotification({ show: false, message: '', type: 'success' }); }, 3000);

          // Check if we came from CasePersonList or PersonLookupModal
          const returnTo = location.state?.returnTo;
          const personType = location.state?.personType;
          const caseDataForReturn = location.state?.caseData;
          // selectedCacId is already declared above (line 631)

            if (returnTo === '/CasePersonList') {
              // Get current lists from location state to preserve them
              const currentVictims = location.state?.victims || [];
              const currentOtherPeople = location.state?.otherPeople || [];
              const existingCaseId = location.state?.caseId || location.state?.caseData?.case_id;
              
              // If creating victim and case doesn't exist yet, create case immediately
              // Note: We check if existingCaseId is null, not just if currentVictims.length === 0
              // because the victim might be a temporary entry that hasn't been saved yet
              let caseIdToUse = existingCaseId;
              if (personType === 'victim' && !existingCaseId) {
                try {
                  // Format date for API (use current date if not available)
                  const cacReceivedDate = new Date().toISOString().split('T')[0];
                  
                  const caseDataToCreate = {
                    cac_id: cacId,
                    case_number: null, // Will be auto-generated
                    cac_received_date: cacReceivedDate,
                    created_date: new Date().toISOString().split('T')[0]
                  };
                  
                  const newCase = await casesApi.createCase(caseDataToCreate);
                  caseIdToUse = newCase.case_id;
                  console.log('Created new case immediately for first victim in PersonBio:', newCase.case_id);
                  
                  // Associate the newly created person with the case
                  await peopleApi.associatePersonWithCase(
                    created.person_id,
                    newCase.case_id,
                    cacId
                  );
                  
                  // Update case_person with role_id = 1 (Alleged Co-victim)
                  await peopleApi.updateCasePersonDetails(created.person_id, newCase.case_id, {
                    role_id: 1 // Alleged Co-victim
                  });
                } catch (caseErr) {
                  console.error('Error creating case for first victim in PersonBio:', caseErr);
                  setNotification({ show: true, message: `Failed to create case: ${caseErr.message}`, type: 'error' });
                  setSaving(false);
                  return;
                }
              } else if (personType === 'victim' && existingCaseId) {
                // Associate the newly created person with existing case
                try {
                  await peopleApi.associatePersonWithCase(
                    created.person_id,
                    existingCaseId,
                    cacId
                  );
                  
                  // Update case_person with role_id = 1 (Alleged Co-victim)
                  await peopleApi.updateCasePersonDetails(created.person_id, existingCaseId, {
                    role_id: 1 // Alleged Co-victim
                  });
                } catch (assocErr) {
                  console.error('Error associating person with case:', assocErr);
                }
              }
              
              // Return to CasePersonList with the new person
            const newPerson = {
              person_id: created.person_id,
              first_name: created.first_name,
              last_name: created.last_name,
              middle_name: created.middle_name,
              date_of_birth: created.date_of_birth,
              ssn: created.ssn || null,
              personType: personType || 'victim'
            };

              navigate('/CasePersonList', {
              state: {
                newPerson: newPerson,
                caseId: caseIdToUse, // Pass the case_id (newly created or existing)
                caseData: caseDataForReturn ? { ...caseDataForReturn, case_id: caseIdToUse } : { case_id: caseIdToUse },
                selectedCacId: selectedCacId,
                victims: currentVictims,
                otherPeople: currentOtherPeople
              }
            });
          } else {
            // Default: return to CasePeople (for backward compatibility)
            navigate('/CasePeople');
          }
        } catch (err) {
          console.error('Failed to create person:', err);
          setNotification({ show: true, message: 'Failed to create person', type: 'error' });
        } finally {
          setSaving(false);
        }

        return;
      }
      
      // Always show confirmation modal when saving existing person (personId exists)
        // Store pending changes and show confirmation modal
        setPendingChanges(personData);
        setConfirmModalOpen(true);
    } catch (err) {
      console.error('Error preparing data for save:', err);
      setNotification({
        show: true,
        message: 'Error preparing data for save',
        type: 'error'
      });
    }
  };
  
  // New function to handle actual save after confirmation
  const handleConfirmSave = async () => {
    try {
      setSaving(true);
      setConfirmModalOpen(false);

      // Check if any changes were made
      if (!pendingChanges || !originalData) {
        setSaving(false);
        setNotification({
          show: true,
          message: 'No changes were made to the person information',
          type: 'info'
        });
        setTimeout(() => {
          setNotification({ show: false, message: '', type: 'success' });
        }, 3000);
        return;
      }

      const isDataChanged = Boolean(
        originalData.first_name !== pendingChanges.first_name ||
        originalData.middle_name !== pendingChanges.middle_name ||
        originalData.last_name !== pendingChanges.last_name ||
        originalData.suffix !== pendingChanges.suffix ||
        originalData.nick_name !== pendingChanges.nick_name ||
        originalData.ssn !== pendingChanges.ssn ||
        originalData.date_of_birth !== pendingChanges.date_of_birth ||
        originalData.date_of_death !== pendingChanges.date_of_death ||
        originalData.date_added !== pendingChanges.date_added ||
        originalData.self_identified_gender !== pendingChanges.self_identified_gender ||
        originalData.pronouns !== pendingChanges.pronouns ||
        originalData.gender !== pendingChanges.gender ||
        originalData.race !== pendingChanges.race ||
        originalData.religion !== pendingChanges.religion ||
        originalData.first_language !== pendingChanges.first_language ||
        originalData.voca !== pendingChanges.voca ||
        originalData.special_populations !== pendingChanges.special_populations ||
        originalData.csec_involvement !== pendingChanges.csec_involvement ||
        originalData.risk_factors !== pendingChanges.risk_factors ||
        originalData.csec !== pendingChanges.csec ||
        originalData.material_involvement !== pendingChanges.material_involvement ||
        originalData.ethnicity_6 !== pendingChanges.ethnicity_6 ||
        originalData.special_needs !== pendingChanges.special_needs ||
        originalData.comments_for_people !== pendingChanges.comments_for_people ||
        originalData.developmental_age !== pendingChanges.developmental_age ||
        originalData.custom_field !== pendingChanges.custom_field ||
        originalData.bio_custom_field_7 !== pendingChanges.bio_custom_field_7 ||
        originalData.bio_custom_field_8 !== pendingChanges.bio_custom_field_8 ||
        originalData.housing_insecurity_risk !== pendingChanges.housing_insecurity_risk ||
        originalData.tribe !== pendingChanges.tribe ||
        originalData.prior_convictions !== pendingChanges.prior_convictions ||
        originalData.convicted_against_children !== pendingChanges.convicted_against_children ||
        originalData.sex_offender !== pendingChanges.sex_offender ||
        originalData.sex_predator !== pendingChanges.sex_predator
      );

      if (!isDataChanged) {
        setSaving(false);
        setNotification({
          show: true,
          message: 'No changes were made to the person information',
          type: 'info'
        });
        setTimeout(() => {
          setNotification({ show: false, message: '', type: 'success' });
        }, 3000);
        return;
      }

      // Update person in API
      await peopleApi.updatePerson(personId, pendingChanges);

      // After update, re-fetch the person to ensure we display fresh, authoritative data
      const refreshed = await peopleApi.getPersonById(personId);

      // Update originalData with normalized voca and special_populations
      setOriginalData({
        ...refreshed,
        voca: refreshed.voca ? refreshed.voca.split(',').map(s => s.trim()).join(',') : null,
        special_populations: refreshed.special_populations ? refreshed.special_populations.split(',').map(s => s.trim()).join(',') : null,
        risk_factors: refreshed.risk_factors ? refreshed.risk_factors.split(',').map(s => s.trim()).join(',') : null,
        csec: refreshed.csec ? refreshed.csec.split(',').map(s => s.trim()).join(',') : null,
        material_involvement: refreshed.material_involvement ? refreshed.material_involvement.split(',').map(s => s.trim()).join(',') : null,
        date_added: refreshed.date_added || null,
        housing_insecurity_risk: refreshed.housing_insecurity_risk || null,
        tribe: refreshed.tribe || null,
        prior_convictions: refreshed.prior_convictions ?? null,
        convicted_against_children: refreshed.convicted_against_children ?? null,
        sex_offender: refreshed.sex_offender ?? null,
        sex_predator: refreshed.sex_predator ?? null,
        csec_involvement: refreshed.csec_involvement ? refreshed.csec_involvement.split(',').map(s => s.trim()).join(',') : null,
        self_identified_gender: refreshed.self_identified_gender ? refreshed.self_identified_gender.split(',').map(s => s.trim()).join(',') : null,
        pronouns: refreshed.pronouns || null,
        ethnicity_6: refreshed.ethnicity_6 ? refreshed.ethnicity_6.split(',').map(s => s.trim()).join(',') : null,
        material_involvement: refreshed.material_involvement ? refreshed.material_involvement.split(',').map(s => s.trim()).join(',') : null,
        special_needs: refreshed.special_needs || null,
        comments_for_people: refreshed.comments_for_people || null,
        developmental_age: refreshed.developmental_age || null,
        custom_field: refreshed.custom_field || null,
        bio_custom_field_7: refreshed.bio_custom_field_7 || null,
        bio_custom_field_8: refreshed.bio_custom_field_8 || null
      });

      // Update formData from refreshed server state to avoid cross-person leakage
      setFormData({
        firstName: refreshed.first_name || '',
        middleName: refreshed.middle_name || '',
        lastName: refreshed.last_name || '',
        suffix: refreshed.suffix || '',
        nickName: refreshed.nick_name || '',
        ssn: refreshed.ssn || '',
        dateOfBirth: refreshed.date_of_birth ? new Date(refreshed.date_of_birth).toISOString().split('T')[0] : '',
        unknownDateOfBirth: !refreshed.date_of_birth,
        dateOfDeath: refreshed.date_of_death ? new Date(refreshed.date_of_death).toISOString().split('T')[0] : '',
        dateAdded: refreshed.date_added ? new Date(refreshed.date_added).toISOString().split('T')[0] : '',
        biologicalSex:
          refreshed.gender === 'M' ? 'Male' :
          refreshed.gender === 'F' ? 'Female' :
          refreshed.gender === 'I' ? 'Intersex' :
          refreshed.gender === 'U' ? 'Unknown' :
          refreshed.gender === 'D' ? 'Decline to Answer' :
          '',
        race: refreshed.race || '',
        religion: refreshed.religion || '',
        firstLanguage: refreshed.first_language || '',
        voca: refreshed.voca ? refreshed.voca.split(',').map(s => s.trim()) : [],
        specialPopulations: refreshed.special_populations ? refreshed.special_populations.split(',').map(s => s.trim()) : [],
        riskFactors: refreshed.risk_factors ? refreshed.risk_factors.split(',').map(s => s.trim()) : [],
        csec: refreshed.csec ? refreshed.csec.split(',').map(s => s.trim()) : [],
        csecInvolvement: refreshed.csec_involvement ? refreshed.csec_involvement.split(',').map(s => s.trim()) : [],
        ethnicity6: refreshed.ethnicity_6 ? refreshed.ethnicity_6.split(',').map(s => s.trim()) : [],
        materialInvolvement: refreshed.material_involvement ? refreshed.material_involvement.split(',').map(s => s.trim()) : [],
        housingInsecurityRisk: refreshed.housing_insecurity_risk || '',
        tribe: refreshed.tribe || '',
        priorConvictions: !!refreshed.prior_convictions,
        convictedAgainstChildren: !!refreshed.convicted_against_children,
        sexOffender: !!refreshed.sex_offender,
        sexPredator: !!refreshed.sex_predator,
        specialNeeds: refreshed.special_needs || '',
        commentsForPeople: refreshed.comments_for_people || '',
        developmentalAge: refreshed.developmental_age || '',
        customField: refreshed.custom_field || '',
        bioCustomField7: refreshed.bio_custom_field_7 || '',
        bioCustomField8: refreshed.bio_custom_field_8 || '',
        selfIdentifiedGender: refreshed.self_identified_gender ? refreshed.self_identified_gender.split(',').map(s => s.trim()) : [],
        pronouns: refreshed.pronouns || ''
      });

      // Show success notification
      setNotification({ show: true, message: 'Person information updated successfully', type: 'success' });

      // Check if we need to return to a specific page
      const returnTo = location.state?.returnTo;
      const personType = location.state?.personType;
      const caseDataForReturn = location.state?.caseData;
      const selectedCacIdForReturn = location.state?.selectedCacId;

      if (returnTo === '/CasePersonList') {
        // Return to CasePersonList with updated person data
        const updatedPerson = {
          person_id: refreshed.person_id,
          first_name: refreshed.first_name,
          last_name: refreshed.last_name,
          middle_name: refreshed.middle_name,
          date_of_birth: refreshed.date_of_birth,
          ssn: refreshed.ssn || null,
          personType: personType || 'victim'
        };

        // Get current lists from location state to preserve them
        const currentVictims = location.state?.victims || [];
        const currentOtherPeople = location.state?.otherPeople || [];

        setTimeout(() => {
              navigate('/CasePersonList', {
            state: {
              newPerson: updatedPerson,
              caseData: caseDataForReturn,
              selectedCacId: selectedCacIdForReturn,
              victims: currentVictims,
              otherPeople: currentOtherPeople
            }
          });
        }, 1000);
      } else if (returnTo === '/CasePeople' || (!returnTo && personId)) {
        // If returnTo is /CasePeople or no returnTo specified (likely came from People page)
        // Navigate back to People page after successful save
        setTimeout(() => {
          navigate('/CasePeople');
        }, 500);
      } else {
        setTimeout(() => { setNotification({ show: false, message: '', type: 'success' }); }, 3000);
      }
    } catch (err) {
      console.error('Failed to update person:', err);
      setNotification({ show: true, message: 'Failed to update person information', type: 'error' });
    } finally {
      setSaving(false);
      setPendingChanges(null);
    }
  };

  // Generic multi-select toggle handler for fields like 'voca' and 'specialPopulations'
  const handleMultiSelectChange = (fieldName, value) => {
    setFormData((prevData) => {
      const current = Array.isArray(prevData[fieldName]) ? prevData[fieldName] : [];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prevData, [fieldName]: updated };
    });
  };
  
  // Handle cancellation of modal
  const handleCancelSave = () => {
    setConfirmModalOpen(false);
    setPendingChanges(null);
  };
  
  // Handle cancel button
  const handleCancel = () => {
    navigate('/CasePeople');
  };
  
  // Render loading state
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }
  
  // Render error state
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
        <Paper elevation={3} sx={{ 
          p: 4, 
          my: 4,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={handleCancel}>
            Return to Case View
          </Button>
        </Paper>
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
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="Person Profile Tabs">
            <Tab label="Personal Profile" />
            <Tab label="Cases" />
            <Tab label="Contact Info" id="contact-info-tab" />
          </Tabs>
        </Box>

        <Typography variant="h5" gutterBottom align="left" sx={{ mb: 3 }}>
          {currentTab === 1 ? 'CASES' :
            currentTab === 2 ? 'CONTACT INFO' :
            currentPerson ? 
              `${currentPerson.first_name || ''}${currentPerson.middle_name ? ' ' + currentPerson.middle_name : ''}${currentPerson.last_name ? ' ' + currentPerson.last_name : ''}${currentPerson.suffix ? ' ' + currentPerson.suffix : ''} – Case ${currentCase || 'N/A'}` :
              'PERSONAL PROFILE'
          }
        </Typography>
        
        {/* Render content based on current tab */}
        {currentTab === 1 ? (
          // Cases Tab
          <CasesTab personId={personId} />
        ) : currentTab === 2 ? (
          // Contact Info Tab
          <ContactInfoTab personId={personId} />
        ) : (
          <>
            {/* Client Contact Info */}
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 1,
                backgroundColor: 'grey.50',
                p: 2,
                mb: 3
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Client Contact Info
              </Typography>
              {hasClientContactDetails ? (
                <>
                  {contactAddressLine1 && (
                    <Typography variant="body1">{contactAddressLine1}</Typography>
                  )}
                  {contactAddressLine2 && (
                    <Typography variant="body1">{contactAddressLine2}</Typography>
                  )}
                  {contactCityStateZip && (
                    <Typography variant="body1">{contactCityStateZip}</Typography>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No contact information available.
                </Typography>
              )}
              <Typography
                component="a"
                href="#contact-info-tab"
                onClick={handleContactInfoLinkClick}
                sx={{
                  mt: 1.5,
                  display: 'inline-block',
                  color: 'primary.main',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'none' }
                }}
              >
                View or Edit Contact Information
              </Typography>
            </Box>

            {/* Action buttons at top */}
            <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "SAVE"}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleCancel}
              >
                CANCEL
              </Button>
            </Box>
            
            {/* Notification */}
            {notification.show && (
              <Alert severity={notification.type} sx={{ mb: 2 }}>
                {notification.message}
              </Alert>
            )}
            
            <Box component="form" sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {/* Name section */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 600, textAlign: 'right' }}>First Name</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField
                fullWidth
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
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
                value={formData.middleName}
                onChange={handleChange}
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
                value={formData.lastName}
                onChange={handleChange}
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
                value={formData.suffix}
                onChange={handleChange}
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
                value={formData.nickName}
                onChange={handleChange}
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
              <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Date of Birth</Typography>
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

            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Date of Death</Typography>
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
              <Typography variant="body1" color="error" sx={{ fontWeight: 600, textAlign: 'right' }}>Biological Sex</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <RadioGroup
                row
                name="biologicalSex"
                value={formData.biologicalSex}
                onChange={handleChange}
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
                value={formData.firstLanguage || ''}
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
                <Grid item xs={12} sm={6} key={`voca-${personId}-${option}`}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="voca"
                        checked={formData.voca.includes(option)}
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
                        checked={formData.specialPopulations?.includes(option)}
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
            <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>
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
                        checked={formData.riskFactors?.includes('Gifts/Bribes from non-caregivers')}
                        onChange={() => handleMultiSelectChange('riskFactors', 'Gifts/Bribes from non-caregivers')}
                      />
                    }
                    label="Gifts/Bribes from non-caregivers"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.riskFactors?.includes('Other')}
                        onChange={() => handleMultiSelectChange('riskFactors', 'Other')}
                      />
                    }
                    label="Other"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.riskFactors?.includes('Runaway')}
                        onChange={() => handleMultiSelectChange('riskFactors', 'Runaway')}
                      />
                    }
                    label="Runaway"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.riskFactors?.includes('Substance Abuse')}
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
                        checked={formData.riskFactors?.includes('High Risk Sexual Behavior')}
                        onChange={() => handleMultiSelectChange('riskFactors', 'High Risk Sexual Behavior')}
                      />
                    }
                    label="High Risk Sexual Behavior"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.riskFactors?.includes('Risky Online Behavior')}
                        onChange={() => handleMultiSelectChange('riskFactors', 'Risky Online Behavior')}
                      />
                    }
                    label="Risky Online Behavior"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.riskFactors?.includes('Street Language')}
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
            <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>
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
                        checked={formData.csec?.includes('Child Pornography')}
                        onChange={() => handleMultiSelectChange('csec', 'Child Pornography')}
                      />
                    }
                    label="Child Pornography"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.csec?.includes('Sex Tourism')}
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
                        checked={formData.csec?.includes('Other')}
                        onChange={() => handleMultiSelectChange('csec', 'Other')}
                      />
                    }
                    label="Other"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.csec?.includes('Sex Trafficking')}
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
                        checked={formData.materialInvolvement?.includes('Distribution')}
                        onChange={() => handleMultiSelectChange('materialInvolvement', 'Distribution')}
                      />
                    }
                    label="Distribution"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.materialInvolvement?.includes('Other')}
                        onChange={() => handleMultiSelectChange('materialInvolvement', 'Other')}
                      />
                    }
                    label="Other"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.materialInvolvement?.includes('Trading')}
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
                        checked={formData.materialInvolvement?.includes('Manufacturing')}
                        onChange={() => handleMultiSelectChange('materialInvolvement', 'Manufacturing')}
                      />
                    }
                    label="Manufacturing"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.materialInvolvement?.includes('Possession')}
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
              value={formData.specialNeeds}
              onChange={handleChange}
              // Added for special_needs same as first_name
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
              value={formData.commentsForPeople}
              onChange={handleChange}
              // Added for comments_for_people same as first_name
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
                  checked={!!formData.priorConvictions}
                  onChange={handleChange}
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
                  checked={!!formData.convictedAgainstChildren}
                  onChange={handleChange}
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
                  checked={!!formData.sexOffender}
                  onChange={handleChange}
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
                  checked={!!formData.sexPredator}
                  onChange={handleChange}
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
              value={formData.housingInsecurityRisk || ''}
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
              value={formData.developmentalAge}
              onChange={handleChange}
              // Added for developmental_age same as first_name
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
              value={formData.dateAdded || ''}
              onChange={handleChange}
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
                    control={<Checkbox checked={formData.csecInvolvement?.includes('USA')} onChange={() => handleMultiSelectChange('csecInvolvement', 'USA')} />}
                    label="USA"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={formData.csecInvolvement?.includes('Mexico')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Mexico')} />}
                    label="Mexico"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={formData.csecInvolvement?.includes('Foster Care Awol History')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Foster Care Awol History')} />}
                    label="Foster Care Awol History"
                    sx={checkboxStyle}
                  />
                </FormGroup>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormGroup>
                  <FormControlLabel
                    control={<Checkbox checked={formData.csecInvolvement?.includes('Canada')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Canada')} />}
                    label="Canada"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={formData.csecInvolvement?.includes('Nicaragua')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Nicaragua')} />}
                    label="Nicaragua"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={formData.csecInvolvement?.includes('El Salvador')} onChange={() => handleMultiSelectChange('csecInvolvement', 'El Salvador')} />}
                    label="El Salvador"
                    sx={checkboxStyle}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={formData.csecInvolvement?.includes('Uzbekistan')} onChange={() => handleMultiSelectChange('csecInvolvement', 'Uzbekistan')} />}
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
              value={formData.customField}
              onChange={handleChange}
              // Added for custom_field same as first_name
            />
          </Grid>

          {/* Ethnicity 6 */}
          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Ethnicity 6</Typography>
          </Grid>
          <Grid item xs={12} sm={9}>
            <FormGroup row>
              <FormControlLabel
                control={<Checkbox checked={formData.ethnicity6?.includes('Non-Hispanic')} onChange={() => handleMultiSelectChange('ethnicity6', 'Non-Hispanic')} />}
                label="Non-Hispanic"
                sx={checkboxStyle}
              />
              <FormControlLabel
                control={<Checkbox checked={formData.ethnicity6?.includes('Hispanic')} onChange={() => handleMultiSelectChange('ethnicity6', 'Hispanic')} />}
                label="Hispanic"
                sx={checkboxStyle}
              />
            </FormGroup>
          </Grid>

          {/* Bio Custom Field 7 */}
          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Bio Custom Field 7</Typography>
          </Grid>
          <Grid item xs={12} sm={9}>
            <TextField
              fullWidth
              name="bioCustomField7"
              value={formData.bioCustomField7}
              onChange={handleChange}
            />
          </Grid>

          {/* Bio Custom Field 8 */}
          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>Bio Custom Field 8</Typography>
          </Grid>
          <Grid item xs={12} sm={9}>
            <TextField
              fullWidth
              name="bioCustomField8"
              value={formData.bioCustomField8}
              onChange={handleChange}
              // Added for bio_custom_field_8 same as first_name
            />
          </Grid>

          {/* New Mexico Pueblo or Tribe 9 */}
          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'right' }}>New Mexico Pueblo or Tribe 9</Typography>
          </Grid>
          <Grid item xs={12} sm={9}>
            <TextField
              select
              fullWidth
              name="tribe"
              value={formData.tribe || ''}
              onChange={handleChange}
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
        </Grid>            

        {/* Runaway Incidents Section */}
        <Box sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Runaway Incidents
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                // TODO: Implement add new record
                console.log('Add new runaway incident');
              }}
            >
              + Add new record
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ border: '1px solid #d1d5db', borderRadius: '4px' }}>
            <Table sx={{ borderCollapse: 'collapse', minWidth: 650 }}>
              <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Action</TableCell>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Start Date</TableCell>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Length of Time</TableCell>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={4}
                    align="center"
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
          <Box sx={{ borderTop: '1px solid #e5e7eb', pt: 1 }}>
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

        {/* ALIASES Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              ALIASES
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                // TODO: Implement add new record
                console.log('Add new alias');
              }}
            >
              + Add new record
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ border: '1px solid #d1d5db', borderRadius: '4px' }}>
            <Table sx={{ borderCollapse: 'collapse', minWidth: 650 }}>
              <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Action</TableCell>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>First Name</TableCell>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Middle Name</TableCell>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Last Name</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={4}
                    align="center"
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
        </Box>

        {/* DATA PROVIDER PERSON IDS Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            DATA PROVIDER PERSON IDS
          </Typography>
          <TableContainer component={Paper} sx={{ border: '1px solid #d1d5db', borderRadius: '4px' }}>
            <Table sx={{ borderCollapse: 'collapse', minWidth: 650 }}>
              <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Action</TableCell>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Data Provider</TableCell>
                  <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }}>Person ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={3}
                    align="center"
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
          <Box sx={{ borderTop: '1px solid #e5e7eb', pt: 1 }}>
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

        {/* LATEST CASE INFORMATION Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            LATEST CASE INFORMATION
          </Typography>
          <Grid container spacing={3}>
            {/* Case Number */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Case Number</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.case_number || ''}
              </Typography>
            </Grid>

            {/* Relationship to Alleged Victim/Client */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Relationship to Alleged Victim/Client</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.role_id === 1 ? 'Self' : getRelationshipText(latestCaseInfo?.relationship_id)}
              </Typography>
            </Grid>

            {/* Role */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Role</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {getRoleText(latestCaseInfo?.role_id)}
              </Typography>
            </Grid>

            {/* Victim Status */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Victim Status</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.victim_status || ''}
              </Typography>
            </Grid>

            {/* Age at Time of Referral */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" color="error" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Age at Time of Referral</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {formatAge(latestCaseInfo?.age, latestCaseInfo?.age_unit)}
              </Typography>
            </Grid>

            {/* In Same Household as Alleged Victim/Client */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>In Same Household as Alleged Victim/Client</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Checkbox checked={latestCaseInfo?.same_household || false} disabled />
            </Grid>

            {/* Has Custody of Alleged Victim/Client */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Has Custody of Alleged Victim/Client</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Checkbox checked={latestCaseInfo?.custody || false} disabled />
            </Grid>

            {/* School Or Employer */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>School Or Employer</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.school_or_employer || ''}
              </Typography>
            </Grid>

            {/* Education Level */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Education Level</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.education_level_id || ''}
              </Typography>
            </Grid>

            {/* Marital Status */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Marital Status</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.marital_status_id || ''}
              </Typography>
            </Grid>

            {/* Income Level of Household */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Income Level of Household</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.income_level_id || ''}
              </Typography>
            </Grid>

            {/* Does this youth have Youth Problematic Sexual Behaviors? */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Does this youth have Youth Problematic Sexual Behaviors?</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Checkbox checked={latestCaseInfo?.problematic_sex || false} disabled />
            </Grid>

            {/* Military Connection */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Military Connection</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Checkbox checked={latestCaseInfo?.mili_connection || false} disabled />
            </Grid>

            {/* Military Type */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Military Type</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.mili_type_id || ''}
              </Typography>
            </Grid>

            {/* Military Dependent Relationship */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Military Dependent Relationship</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.mili_dependent_relationship || ''}
              </Typography>
            </Grid>

            {/* Military Connection Name */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Military Connection Name</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.mili_connection_name || ''}
              </Typography>
            </Grid>

            {/* If National Guard or Reserves, are you currently active/on Title 10 status? */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>If National Guard or Reserves, are you currently active/on Title 10 status?</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Checkbox checked={latestCaseInfo?.mili_title_10_status || false} disabled />
            </Grid>

            {/* Custom Field (1) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Custom Field (1)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.custom_field_1 || ''}
              </Typography>
            </Grid>

            {/* CSF Eligible (2) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>CSF Eligible (2)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <FormControlLabel
                control={<Checkbox checked={latestCaseInfo?.csf_eligible_2 || false} disabled />}
                label="Yes"
              />
            </Grid>

            {/* Does family need transportation assistance? (3) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Does family need transportation assistance? (3)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.family_transport_assistance_3 || ''}
              </Typography>
            </Grid>

            {/* Custom Field (4) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Custom Field (4)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.custom_field_4 || ''}
              </Typography>
            </Grid>

            {/* Community (5) */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 2, pt: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Community (5)</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <FormGroup>
                <FormControlLabel control={<Checkbox checked={false} disabled />} label="West Hills" />
                <FormControlLabel control={<Checkbox checked={false} disabled />} label="Hardin Valley" />
                <FormControlLabel control={<Checkbox checked={false} disabled />} label="Cedar Bluff Apartments" />
                <FormControlLabel control={<Checkbox checked={false} disabled />} label="Glenview" />
              </FormGroup>
            </Grid>

            {/* Case Person Custom Field 6 */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Case Person Custom Field 6</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.case_person_custom_field_6 || ''}
              </Typography>
            </Grid>

            {/* Case Person Custom Field 7 */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Case Person Custom Field 7</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.case_person_custom_field_7 || ''}
              </Typography>
            </Grid>

            {/* Case Person Custom Field 8 */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Case Person Custom Field 8</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.case_person_custom_field_8 || ''}
              </Typography>
            </Grid>

            {/* Case Person Custom Field 9 */}
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'right' }}>Case Person Custom Field 9</Typography>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', minHeight: '40px' }}>
                {latestCaseInfo?.case_person_custom_field_9 || ''}
              </Typography>
            </Grid>
          </Grid>
        </Box>

            {/* Bottom action buttons */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
                sx={{ mr: 2 }}
              >
                {saving ? "Saving..." : "SAVE"}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleCancel}
              >
                CANCEL
              </Button>
            </Box>
          </Box>
          </>
        )}
      </Paper>
      
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

export default PersonBio;