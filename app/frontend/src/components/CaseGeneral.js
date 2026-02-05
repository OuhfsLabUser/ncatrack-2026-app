import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCase } from "../context/CaseContext";
import { casesApi, agenciesApi, employeesApi } from "../services/api";
import { CircularProgress, Alert, Box, Snackbar, TablePagination, Paper, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import ConfirmationModal from "./ConfirmationModal";
import DocumentUploadSection from "./DocumentUploadSection";
import "./CaseGeneral.css";

const CASE_TRACKING_SERVICES = [
  { id: "MDT", label: "MDT" },
  { id: "CPS", label: "CPS" },
  { id: "LE", label: "LE" },
  { id: "Medical", label: "Medical" },
  { id: "FI", label: "FI" },
  { id: "MH", label: "MH" },
  { id: "VA", label: "VA" },
  { id: "Prosecution", label: "Prosecution" }
];

const REFERRED_BY_OPTIONS = ["Unknown", "CAC Staff", "Law Enforcement", "School Counselor", "Family"];
const PROVIDING_AGENCY_OPTIONS = ["Anderson SVU Team", "Hamilton County Human Trafficking Coalition", "CFR Meeting", "Unassigned"];
const PRIMARY_CONTACT_OPTIONS = ["Jane Doe", "Sylvia Jones", "Primary Advocate", "Unassigned"];
const STATUS_OPTIONS = ["", "Scheduled", "In Progress", "Completed", "Cancelled", "NA"];

const createDefaultCaseTrackingRows = () =>
  CASE_TRACKING_SERVICES.map((service) => ({
    id: service.id,
    service: service.label,
    referralDate: service.defaults?.referralDate || "",
    referredBy: service.defaults?.referredBy || "",
    referredByDetail: service.defaults?.referredByDetail || "",
    providingAgency: service.defaults?.providingAgency || "",
    primaryContact: service.defaults?.primaryContact || "",
    status: service.defaults?.status || "",
    statusDate: service.defaults?.statusDate || ""
  }));

const getCaseTrackingStorageKey = (caseId) => {
  if (!caseId) return null;
  return `caseTrackingRows_${caseId}`;
};

const formatDateForDisplay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const CaseGeneral = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCase, setCurrentCase } = useCase();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseTrackingRows, setCaseTrackingRows] = useState(createDefaultCaseTrackingRows());
  const [referModalOpen, setReferModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [referModalForm, setReferModalForm] = useState({
    service: "",
    referralDate: "",
    referredBy: "",
    referredByDetail: "",
    providingAgency: "",
    primaryContact: "",
    status: "",
    statusDate: ""
  });
  const [referModalErrors, setReferModalErrors] = useState({});
  const [agencies, setAgencies] = useState([]);
  
  // Case Manager Agency options (same as CaseCreationSummary)
  const defaultCaseManagerAgencyOptions = [
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
  
  const [caseManagerAgencyOptions, setCaseManagerAgencyOptions] = useState(defaultCaseManagerAgencyOptions);
  const [caseManagerOptions, setCaseManagerOptions] = useState([]);
  const [loadingCaseManagers, setLoadingCaseManagers] = useState(false);
  const [formData, setFormData] = useState({
    dateReceivedByCac: "",
    mainAgencyInvolved: "",
    mainPersonnelInvolved: "",
    caseClosedReason: "",
    caseCloseDate: "",
    surveyComplete: "",
    followUpSurvey: "",
    cacCaseNumber: "",
    education: "",
    test: "",
    customField6: "",
    customField7: false,
    customField8: "",
    chapterTest: "",
    // Primary Insurance
    primaryInsuranceCompany: "",
    primaryInsuranceSubscriber: "",
    primaryInsurancePolicyNumber: "",
    primaryInsuranceGroup: "",
    // Secondary Insurance
    secondaryInsuranceCompany: "",
    secondaryInsuranceSubscriber: "",
    secondaryInsurancePolicyNumber: "",
    secondaryInsuranceGroup: "",
    hasReferral: false,
    // Provider Details
    providerClinic: "",
    providerName: "",
    providerPrimaryPhone: "",
    providerWebsite: ""
  });

  // Fetch case data when component mounts or case changes
  useEffect(() => {
    const fetchCaseData = async () => {
      // ⭐ Priority: location.state.caseId > currentCase
      // This ensures that when navigating from CaseCreationSummary, we immediately use the caseId
      let caseIdToUse = null;
      
      // First, check location state (highest priority for immediate navigation)
      if (location.state?.caseId) {
        const stateCaseId = location.state.caseId.toString();
        console.log('[CaseGeneral] ✅ Case ID from location state (priority):', stateCaseId);
        caseIdToUse = stateCaseId;
        // Update currentCase to match location state
        if (stateCaseId !== currentCase) {
          console.log('[CaseGeneral] 🔄 Updating currentCase from', currentCase, 'to', stateCaseId);
          setCurrentCase(stateCaseId);
        }
      } 
      // Fallback to currentCase from context
      else if (currentCase) {
        caseIdToUse = currentCase.toString();
        console.log('[CaseGeneral] Using currentCase from context:', caseIdToUse);
      }
      
      // Skip if no case selected or special cases
      if (!caseIdToUse || caseIdToUse === 'create-new' || caseIdToUse === 'search-case') {
        console.log('[CaseGeneral] ⚠️ No valid case selected:', caseIdToUse);
        setCaseData(null);
        setFormData({
          dateReceivedByCac: "",
          mainAgencyInvolved: "",
          mainPersonnelInvolved: "",
          caseClosedReason: "",
          caseCloseDate: "",
          surveyComplete: "",
          followUpSurvey: "",
          cacCaseNumber: "",
          education: "",
          test: "",
          customField6: "",
          customField7: false,
          customField8: "",
          chapterTest: "",
          // Primary Insurance
          primaryInsuranceCompany: "",
          primaryInsuranceSubscriber: "",
          primaryInsurancePolicyNumber: "",
          primaryInsuranceGroup: "",
          // Secondary Insurance
          secondaryInsuranceCompany: "",
          secondaryInsuranceSubscriber: "",
          secondaryInsurancePolicyNumber: "",
          secondaryInsuranceGroup: "",
          hasReferral: false,
          // Provider Details
          providerClinic: "",
          providerName: "",
          providerPrimaryPhone: "",
          providerWebsite: ""
        });
        return;
      }

      // Convert caseIdToUse to number if it's a string
      const caseId = typeof caseIdToUse === 'string' ? parseInt(caseIdToUse) : caseIdToUse;
      
      if (isNaN(caseId) || caseId <= 0) {
        console.error('[CaseGeneral] Invalid case ID:', caseIdToUse, '->', caseId);
        setError(`Invalid case ID: ${caseIdToUse}`);
        setCaseData(null);
        return;
      }

      try {
        console.log('[CaseGeneral] 🔄 Fetching case data for case_id:', caseId, '(caseIdToUse:', caseIdToUse, ')');
        setLoading(true);
        setError(null);
        
        // ⭐ Always fetch fresh data from API to ensure we have the latest case information
        const data = await casesApi.getCaseById(caseId);
        
        console.log('[CaseGeneral] ✅ Received case data:', {
          case_id: data.case_id,
          case_number: data.case_number,
          cac_received_date: data.cac_received_date,
          case_manager_agency: data.case_manager_agency,
          case_manager: data.case_manager,
          mh_agency_id: data.mh_agency_id,
          va_agency_id: data.va_agency_id,
          mh_lead_employee_id: data.mh_lead_employee_id
        });
        
        setCaseData(data);
        
        // Populate form data from case data
        // Priority: location.state > database data > fallback values
        // Use case_manager_agency and case_manager from location.state if available (just saved),
        // otherwise use database values, otherwise fall back to mh_agency_id/va_agency_id and mh_lead_employee_id
        const mainAgencyValue = location.state?.caseManagerAgency 
          || data.case_manager_agency 
          || data.mh_agency_id 
          || data.va_agency_id 
          || "";
        const mainPersonnelValue = location.state?.caseManager 
          || data.case_manager 
          || data.mh_lead_employee_id 
          || "";
        
        console.log('[CaseGeneral] 📝 Setting form data:', {
          mainAgencyInvolved: mainAgencyValue,
          mainPersonnelInvolved: mainPersonnelValue,
          source: {
            fromLocationState: {
              caseManagerAgency: location.state?.caseManagerAgency,
              caseManager: location.state?.caseManager
            },
            fromDatabase: {
              case_manager_agency: data.case_manager_agency,
              case_manager: data.case_manager,
              mh_agency_id: data.mh_agency_id,
              va_agency_id: data.va_agency_id,
              mh_lead_employee_id: data.mh_lead_employee_id
            }
          }
        });
        
        // Ensure saved values are in the options lists
        if (mainAgencyValue && !defaultCaseManagerAgencyOptions.includes(mainAgencyValue)) {
          console.log('[CaseGeneral] Adding saved agency to options:', mainAgencyValue);
          setCaseManagerAgencyOptions([mainAgencyValue, ...defaultCaseManagerAgencyOptions]);
        }
        if (mainPersonnelValue) {
          setCaseManagerOptions(prev => {
            if (!prev.includes(mainPersonnelValue)) {
              console.log('[CaseGeneral] Adding saved personnel to options:', mainPersonnelValue);
              return [mainPersonnelValue, ...prev];
            }
            return prev;
          });
        }
        
        setFormData({
          dateReceivedByCac: data.cac_received_date ? new Date(data.cac_received_date).toISOString().split('T')[0] : "",
          mainAgencyInvolved: mainAgencyValue,
          mainPersonnelInvolved: mainPersonnelValue,
          caseClosedReason: data.closed_reason_id || "",
          caseCloseDate: data.case_closed_date ? new Date(data.case_closed_date).toISOString().split('T')[0] : "",
          surveyComplete: "",
          followUpSurvey: "",
          cacCaseNumber: data.case_number || "",
          education: "",
          test: "",
          customField6: "",
          customField7: false,
          customField8: "",
          chapterTest: "",
          // Primary Insurance
          primaryInsuranceCompany: "",
          primaryInsuranceSubscriber: "",
          primaryInsurancePolicyNumber: "",
          primaryInsuranceGroup: "",
          // Secondary Insurance
          secondaryInsuranceCompany: "",
          secondaryInsuranceSubscriber: "",
          secondaryInsurancePolicyNumber: "",
          secondaryInsuranceGroup: "",
          hasReferral: false,
          // Provider Details
          providerClinic: "",
          providerName: "",
          providerPrimaryPhone: "",
          providerWebsite: ""
        });
      } catch (err) {
        console.error('[CaseGeneral] Error fetching case data:', err);
        setError(`Failed to load case data: ${err.message}`);
        setCaseData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCase, location.state?.caseId, location.key]);

  // Load agencies list
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        const agenciesList = await agenciesApi.getAllAgencies();
        setAgencies(agenciesList || []);
      } catch (err) {
        console.error('[CaseGeneral] Error loading agencies:', err);
        setAgencies([]);
      }
    };
    
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
        console.error('[CaseGeneral] Error loading case managers:', err);
        setCaseManagerOptions([]);
      } finally {
        setLoadingCaseManagers(false);
      }
    };
    
    loadAgencies();
    loadCaseManagers();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Auto-save Main Agency Involved and Main Personnel Involved to case_manager_agency and case_manager
    if ((name === 'mainAgencyInvolved' || name === 'mainPersonnelInvolved') && currentCase && currentCase !== 'create-new' && currentCase !== 'search-case') {
      const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
      if (!isNaN(caseId) && caseId > 0) {
        const updateData = {};
        if (name === 'mainAgencyInvolved') {
          updateData.case_manager_agency = value || null;
        } else if (name === 'mainPersonnelInvolved') {
          updateData.case_manager = value || null;
        }
        
        // Debounce the save to avoid too many API calls
        setTimeout(async () => {
          try {
            await casesApi.updateCase(caseId, updateData);
            console.log(`[CaseGeneral] Auto-saved ${name}:`, value);
          } catch (err) {
            console.error(`[CaseGeneral] Error auto-saving ${name}:`, err);
          }
        }, 500);
      }
    }
  };

  const normalizedCaseKey =
    !currentCase || currentCase === 'create-new' || currentCase === 'search-case'
      ? null
      : currentCase.toString();

  const persistCaseTrackingRows = (rows) => {
    if (typeof window === "undefined" || !normalizedCaseKey) return;
    const storageKey = getCaseTrackingStorageKey(normalizedCaseKey);
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(rows));
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      setCaseTrackingRows(createDefaultCaseTrackingRows());
      return;
    }

    if (!normalizedCaseKey) {
      setCaseTrackingRows(createDefaultCaseTrackingRows());
      return;
    }

    const storageKey = getCaseTrackingStorageKey(normalizedCaseKey);
    const storedRows = storageKey ? localStorage.getItem(storageKey) : null;
    if (storedRows) {
      try {
        const parsed = JSON.parse(storedRows);
        // Ensure MDT row is empty (clear any existing data)
        const cleanedParsed = Array.isArray(parsed) 
          ? parsed.map(row => 
              row.id === "MDT" 
                ? { ...row, referralDate: "", referredBy: "", referredByDetail: "", providingAgency: "", primaryContact: "", status: "", statusDate: "" }
                : row
            )
          : createDefaultCaseTrackingRows();
        setCaseTrackingRows(cleanedParsed);
        // Update localStorage with cleaned data
        if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(cleanedParsed));
        }
      } catch (err) {
        console.error("Failed to parse stored case tracking rows:", err);
        setCaseTrackingRows(createDefaultCaseTrackingRows());
      }
    } else {
      const defaults = createDefaultCaseTrackingRows();
      // Ensure MDT row is empty (no default data)
      const cleanedDefaults = defaults.map(row => 
        row.id === "MDT" 
          ? { ...row, referralDate: "", referredBy: "", referredByDetail: "", providingAgency: "", primaryContact: "", status: "", statusDate: "" }
          : row
      );
      setCaseTrackingRows(cleanedDefaults);
      localStorage.setItem(storageKey, JSON.stringify(cleanedDefaults));
    }
  }, [normalizedCaseKey]);

  // Update MH row when caseData and agencies are loaded
  useEffect(() => {
    if (!caseData || agencies.length === 0) return;
    
    if (caseData.mh_referral_date || caseData.mh_referral_source || caseData.mh_referral_agency_id) {
      setCaseTrackingRows((prevRows) => {
        const updatedRows = prevRows.map((row) => {
          if (row.id === "MH") {
            return {
              ...row,
              referralDate: caseData.mh_referral_date ? new Date(caseData.mh_referral_date).toISOString().split('T')[0] : "",
              referredBy: caseData.mh_referral_source || "",
              referredByDetail: caseData.mh_referral_agency_id ? caseData.mh_referral_agency_id.toString() : "",
              // Keep other fields as they are
            };
          }
          return row;
        });
        persistCaseTrackingRows(updatedRows);
        return updatedRows;
      });
    }
  }, [caseData, agencies, normalizedCaseKey]);

  const handleMarkStatusNA = (serviceId) => {
    setCaseTrackingRows((prevRows) => {
      const updatedRows = prevRows.map((row) =>
        row.id === serviceId
          ? {
              ...row,
              status: "NA",
              referralDate: "",
              referredBy: "",
              referredByDetail: "",
              providingAgency: "",
              primaryContact: "",
              statusDate: ""
            }
          : row
      );
      persistCaseTrackingRows(updatedRows);
      return updatedRows;
    });
  };

  const handleOpenReferModal = (serviceId) => {
    const targetRow = caseTrackingRows.find((row) => row.id === serviceId);
    if (!targetRow) {
      return;
    }
    setSelectedServiceId(serviceId);
    setReferModalErrors({});
    setReferModalForm({
      service: targetRow.service,
      referralDate: targetRow.referralDate || "",
      referredBy: targetRow.referredBy || "",
      referredByDetail: targetRow.referredByDetail || "",
      providingAgency: targetRow.providingAgency || "",
      primaryContact: targetRow.primaryContact || "",
      status: targetRow.status || "",
      statusDate: targetRow.statusDate || ""
    });
    setReferModalOpen(true);
  };

  const handleCloseReferModal = () => {
    setReferModalOpen(false);
    setSelectedServiceId(null);
    setReferModalErrors({});
  };

  const handleReferModalChange = (field, value) => {
    setReferModalForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveReferModal = async () => {
    const errors = {};
    if (
      referModalForm.status &&
      referModalForm.status !== "NA" &&
      !referModalForm.statusDate
    ) {
      errors.statusDate = "Status Date is required unless status is NA.";
    }

    if (Object.keys(errors).length > 0) {
      setReferModalErrors(errors);
      return;
    }

    // If service is MH, save to backend
    if (selectedServiceId === "MH" && currentCase && currentCase !== 'create-new' && currentCase !== 'search-case') {
      try {
        const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
        if (!isNaN(caseId) && caseId > 0) {
          const updateData = {
            mh_referral_date: referModalForm.referralDate || null,
            mh_referral_source: referModalForm.referredBy || null,
            mh_referral_agency_id: referModalForm.referredByDetail ? parseInt(referModalForm.referredByDetail) : null
          };

          await casesApi.updateCase(caseId, updateData);
          
          // Refresh case data after update
          const updatedData = await casesApi.getCaseById(caseId);
          setCaseData(updatedData);
          
          setNotification({
            open: true,
            message: 'MH referral information saved successfully!',
            severity: 'success'
          });
        }
      } catch (err) {
        console.error('[CaseGeneral] Error saving MH referral data:', err);
        setNotification({
          open: true,
          message: `Failed to save MH referral data: ${err.message}`,
          severity: 'error'
        });
      }
    }

    // Update local state
    setCaseTrackingRows((prevRows) => {
      const updatedRows = prevRows.map((row) =>
        row.id === selectedServiceId
          ? {
              ...row,
              referralDate: referModalForm.referralDate,
              referredBy: referModalForm.referredBy,
              referredByDetail: referModalForm.referredByDetail,
              providingAgency: referModalForm.providingAgency,
              primaryContact: referModalForm.primaryContact,
              status: referModalForm.status,
              statusDate: referModalForm.statusDate
            }
          : row
      );
      persistCaseTrackingRows(updatedRows);
      return updatedRows;
    });

    handleCloseReferModal();
  };

  // Handle form submission - Added for CRUD support
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
      setNotification({
        open: true,
        message: 'Please select a valid case first',
        severity: 'error'
      });
      return;
    }

    const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
    
    try {
      setLoading(true);
      // Prepare update data (map form fields to database fields) - Added for CRUD support
      const updateData = {
        cac_received_date: formData.dateReceivedByCac || null,
        case_closed_date: formData.caseCloseDate || null,
        closed_reason_id: formData.caseClosedReason ? parseInt(formData.caseClosedReason) : null,
        case_number: formData.cacCaseNumber || null,
        case_manager_agency: formData.mainAgencyInvolved || null,
        case_manager: formData.mainPersonnelInvolved || null,
        // Add other fields as needed
      };

      await casesApi.updateCase(caseId, updateData);
      
      setNotification({
        open: true,
        message: 'Case data saved successfully!',
        severity: 'success'
      });
      
      // Refresh case data after update
      const updatedData = await casesApi.getCaseById(caseId);
      setCaseData(updatedData);
    } catch (err) {
      console.error('[CaseGeneral] Error saving case data:', err);
      setNotification({
        open: true,
        message: `Failed to save case data: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete button click - Added for CRUD support
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  // Handle confirm delete - Added for CRUD support
  const handleConfirmDelete = async () => {
    if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
      return;
    }

    const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
    
    try {
      setLoading(true);
      setError(null);
      
      await casesApi.deleteCase(caseId);
      
      setNotification({
        open: true,
        message: 'Case deleted successfully!',
        severity: 'success'
      });
      
      // Clear current case and navigate to home - Added for CRUD support
      setCurrentCase('');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      console.error('[CaseGeneral] Error deleting case:', err);
      setNotification({
        open: true,
        message: `Failed to delete case: ${err.message || 'Case has related records that must be deleted first'}`,
        severity: 'error'
      });
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel delete - Added for CRUD support
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  // Handle notification close - Added for CRUD support
  const handleNotificationClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  if (loading && !caseData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !caseData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Please select a case from the dropdown menu to view case general information.</Alert>
      </Box>
    );
  }

  return (
    <div className="case-general-container" data-aoi="Case General Container">
      <form className="case-general-form" data-aoi="Case General Form" onSubmit={handleSubmit}>
        {/* SAVE / CANCEL / DELETE */}
        <div className="cg-form-buttons" style={{ marginBottom: '20px' }}>
          <button type="submit" className="save-button" disabled={loading}>
            {loading ? 'SAVING...' : 'SAVE'}
          </button>
          <button type="button" className="cancel-button" onClick={() => window.location.reload()}>
            CANCEL
          </button>
          {/* Added for CRUD support */}
          <button 
            type="button" 
            className="cancel-button" 
            onClick={handleDeleteClick}
            disabled={loading}
            style={{ marginLeft: '10px' }}
          >
            DELETE CASE
          </button>
        </div>

        {/* CASE TRACKING SECTION */}
        <section className="cg-section" data-aoi="Case Tracking Section">
          <h2 data-aoi="Case Tracking Header">Case Tracking</h2>
          <div className="overflow-x-auto border border-gray-300 rounded-md">
            <table className="table-fixed w-full border-separate border border-gray-300 rounded-md" style={{ borderSpacing: 0 }} data-aoi="Case Tracking Table">
              <colgroup>
                <col className="w-[180px]" />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border border-gray-300"></th>
                  <th className="p-2 border border-gray-300">Service</th>
                  <th className="p-2 border border-gray-300">Referral Date</th>
                  <th className="p-2 border border-gray-300">Referred By</th>
                  <th className="p-2 border border-gray-300">Providing Agency</th>
                  <th className="p-2 border border-gray-300">Primary Contact</th>
                  <th className="p-2 border border-gray-300">Status</th>
                  <th className="p-2 border border-gray-300">Status Date</th>
                </tr>
              </thead>
              <tbody>
                {caseTrackingRows.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? "bg-white hover:bg-gray-100" : "bg-gray-50 hover:bg-gray-100"}>
                    <td className="border border-gray-300 p-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 text-sm"
                          data-aoi={`Refer Case Tracking Row ${row.service}`}
                          onClick={() => handleOpenReferModal(row.id)}
                        >
                          ✎ Refer
                        </button>
                        {row.status !== "NA" && (
                          <button
                            type="button"
                            className="px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 text-sm"
                            data-aoi={`NA Case Tracking Row ${row.service}`}
                            onClick={() => handleMarkStatusNA(row.id)}
                          >
                            NA
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 p-2" data-aoi={`Row ${row.service} Service`}>{row.service}</td>
                    <td className="border border-gray-300 p-2" data-aoi={`Row ${row.service} Referral Date`}>
                      {formatDateForDisplay(row.referralDate)}
                    </td>
                    <td className="border border-gray-300 p-2" data-aoi={`Row ${row.service} Referred By`}>
                      {(() => {
                        const parts = [];
                        if (row.referredBy) parts.push(row.referredBy);
                        if (row.referredByDetail && agencies.length > 0) {
                          const agency = agencies.find(a => a.agency_id === parseInt(row.referredByDetail));
                          if (agency) parts.push(agency.agency_name);
                        }
                        return parts.join(" - ") || "";
                      })()}
                    </td>
                    <td className="border border-gray-300 p-2" data-aoi={`Row ${row.service} Providing Agency`}>
                      {row.providingAgency || ""}
                    </td>
                    <td className="border border-gray-300 p-2" data-aoi={`Row ${row.service} Primary Contact`}>
                      {row.primaryContact || ""}
                    </td>
                    <td className="border border-gray-300 p-2 text-gray-800" data-aoi={`Row ${row.service} Status`}>
                      {row.status || ""}
                    </td>
                    <td className="border border-gray-300 p-2 text-gray-800" data-aoi={`Row ${row.service} Status Date`}>
                      {formatDateForDisplay(row.statusDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Dialog 
            open={referModalOpen} 
            onClose={handleCloseReferModal} 
            fullWidth 
            maxWidth="md"
          >
            <DialogTitle>Edit</DialogTitle>
            <DialogContent dividers>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "160px 1fr 1fr" },
                  rowGap: 2,
                  columnGap: 2,
                  alignItems: "center"
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Service
                </Typography>
                <TextField
                  value={referModalForm.service}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}
                />

                <Typography variant="body2" fontWeight="bold">
                  Referral Date
                </Typography>
                <TextField
                  type="date"
                  value={referModalForm.referralDate || ""}
                  onChange={(e) => handleReferModalChange("referralDate", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}
                />

                <Typography variant="body2" fontWeight="bold">
                  Referred By
                </Typography>
                <TextField
                  select
                  fullWidth
                  name="referredBy"
                  value={referModalForm.referredBy || ""}
                  onChange={(e) => handleReferModalChange("referredBy", e.target.value)}
                  variant="outlined"
                  sx={{ gridColumn: { xs: "span 1", sm: "span 1" } }}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return "Select ...";
                      }
                      return selected;
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select ...</em>
                  </MenuItem>
                  {REFERRED_BY_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  name="referredByDetail"
                  value={referModalForm.referredByDetail || ""}
                  onChange={(e) => handleReferModalChange("referredByDetail", e.target.value)}
                  variant="outlined"
                  sx={{ gridColumn: { xs: "span 1", sm: "span 1" } }}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return "Select ...";
                      }
                      // Find agency name by ID
                      const agency = agencies.find(a => a.agency_id === parseInt(selected));
                      return agency ? agency.agency_name : selected;
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select ...</em>
                  </MenuItem>
                  {agencies.map((agency) => (
                    <MenuItem key={agency.agency_id} value={agency.agency_id.toString()}>
                      {agency.agency_name}
                    </MenuItem>
                  ))}
                </TextField>

                <Typography variant="body2" fontWeight="bold">
                  Providing Agency
                </Typography>
                <TextField
                  select
                  fullWidth
                  name="providingAgency"
                  value={referModalForm.providingAgency || ""}
                  onChange={(e) => handleReferModalChange("providingAgency", e.target.value)}
                  variant="outlined"
                  sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return "Select ...";
                      }
                      return selected;
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select ...</em>
                  </MenuItem>
                  {PROVIDING_AGENCY_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>

                <Typography variant="body2" fontWeight="bold">
                  Primary Contact
                </Typography>
                <TextField
                  select
                  fullWidth
                  name="primaryContact"
                  value={referModalForm.primaryContact || ""}
                  onChange={(e) => handleReferModalChange("primaryContact", e.target.value)}
                  variant="outlined"
                  sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return "Select ...";
                      }
                      return selected;
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>Select ...</em>
                  </MenuItem>
                  {PRIMARY_CONTACT_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>

                <Typography variant="body2" fontWeight="bold">
                  Status
                </Typography>
                <TextField
                  select
                  fullWidth
                  name="status"
                  value={referModalForm.status || ""}
                  onChange={(e) => handleReferModalChange("status", e.target.value)}
                  variant="outlined"
                  sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return "Select ...";
                      }
                      return selected;
                    }
                  }}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option || "empty"} value={option}>
                      {option || <em>Select ...</em>}
                    </MenuItem>
                  ))}
                </TextField>

                <Typography variant="body2" fontWeight="bold">
                  Status Date
                </Typography>
                <TextField
                  type="date"
                  value={referModalForm.statusDate || ""}
                  onChange={(e) => handleReferModalChange("statusDate", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(referModalErrors.statusDate)}
                  helperText={
                    referModalErrors.statusDate ||
                    (referModalForm.status === "NA" ? "Optional when status is NA." : "")
                  }
                  fullWidth
                  sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseReferModal} color="inherit">
                Cancel
              </Button>
              <Button onClick={handleSaveReferModal} variant="contained">
                Update
              </Button>
            </DialogActions>
          </Dialog>

          <div className="form-row">
            <label htmlFor="date-received" style={{ color: '#dc3545', fontWeight: 'bold' }}><strong>Date Received by CAC</strong></label>
            <input 
              type="date" 
              id="date-received" 
              name="dateReceivedByCac" 
              value={formData.dateReceivedByCac}
              onChange={handleChange}
              readOnly
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-row">
            <label htmlFor="main-agency">Main Agency Involved</label>
            <select 
              id="main-agency" 
              name="mainAgencyInvolved"
              value={formData.mainAgencyInvolved || ''}
              onChange={handleChange}
            >
              <option value="">Select ...</option>
              {/* Ensure saved value is in the options list */}
              {formData.mainAgencyInvolved && !caseManagerAgencyOptions.includes(formData.mainAgencyInvolved) && (
                <option key={formData.mainAgencyInvolved} value={formData.mainAgencyInvolved}>
                  {formData.mainAgencyInvolved}
                </option>
              )}
              {caseManagerAgencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button type="button" className="add-button-white">+ Add</button>
          </div>

          <div className="form-row">
            <label htmlFor="main-person">Main Personnel Involved</label>
            <select 
              id="main-person" 
              name="mainPersonnelInvolved"
              value={formData.mainPersonnelInvolved || ''}
              onChange={handleChange}
              disabled={loadingCaseManagers}
            >
              <option value="">{loadingCaseManagers ? 'Loading...' : 'Select ...'}</option>
              {/* Ensure saved value is in the options list */}
              {formData.mainPersonnelInvolved && !caseManagerOptions.includes(formData.mainPersonnelInvolved) && (
                <option key={formData.mainPersonnelInvolved} value={formData.mainPersonnelInvolved}>
                  {formData.mainPersonnelInvolved}
                </option>
              )}
              {caseManagerOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button type="button" className="add-button-white">+ Add</button>
          </div>

          <div className="form-row">
            <label htmlFor="case-close-reason">Case Closed Reason</label>
            <select id="case-close-reason" name="case-close-reason">
              <option>Select ...</option>
            </select>
          </div>

          <div className="form-row">
            <label htmlFor="case-close-date">Case Close Date</label>
            <input 
              type="date" 
              id="case-close-date" 
              name="caseCloseDate" 
              value={formData.caseCloseDate}
              onChange={handleChange}
            />
          </div>
            </section>

        {/* CASES LINKED TO THIS ALLEGATION */}
        <section className="cg-section mt-6" data-aoi="Cases Linked to this Allegation Section">
          <Box
            sx={{
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              p: 2,
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} data-aoi="Cases Linked to this Allegation Header">
                Cases Linked to this Allegation
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // TODO: Implement add new record
                  console.log('Add new record');
                }}
                data-aoi="Add Cases Linked Button"
              >
                + Add new record
              </Button>
            </Box>

            <TableContainer sx={{ border: '1px solid #d1d5db', borderRadius: '4px' }}>
              <Table sx={{ borderCollapse: 'collapse', minWidth: 650 }} aria-label="cases linked table" data-aoi="Cases Linked Table">
                <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableRow>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }} data-aoi="Cases Linked Table Header CAC Case Number">CAC Case Number</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold', textAlign: 'center' }} data-aoi="Cases Linked Table Header Alleged Victim">Alleged Victim</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      align="center"
                      sx={{ border: '1px solid #e5e7eb', py: 2, textAlign: 'center' }}
                      data-aoi="Cases Linked No Items"
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
                sx={{
                  '& .MuiTablePagination-toolbar': {
                    paddingLeft: 0,
                    paddingRight: 0,
                  }
                }}
              />
            </Box>
          </Box>
        </section>

        {/* COURT ACTIVITIES */}
        <section className="cg-section mt-6" data-aoi="Court Activities Section">
          <Box
            sx={{
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              p: 2,
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} data-aoi="Court Activities Header">
                Court Activities
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // TODO: Implement add new record
                  console.log('Add new record');
                }}
                data-aoi="Add Court Activities Button"
              >
                + Add new record
              </Button>
            </Box>

            <TableContainer sx={{ border: '1px solid #d1d5db', borderRadius: '4px' }}>
              <Table sx={{ borderCollapse: 'collapse', minWidth: 650 }} aria-label="court activities table" data-aoi="Court Activities Table">
                <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableRow>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Court Activities Table Header Court Type">Court Type</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Court Activities Table Header Court Date">Court Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      align="left"
                      sx={{ border: '1px solid #e5e7eb', py: 2 }}
                      data-aoi="Court Activities No Items"
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
                sx={{
                  '& .MuiTablePagination-toolbar': {
                    paddingLeft: 0,
                    paddingRight: 0,
                  }
                }}
              />
            </Box>
          </Box>
        </section>

        {/* RELEASE OF INFORMATION */}
        <section className="cg-section mt-6" data-aoi="Release of Information Section">
          <Box
            sx={{
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              p: 2,
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} data-aoi="Release of Information Header">
                Release of Information
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // TODO: Implement add new record
                  console.log('Add new record');
                }}
                data-aoi="Add Release of Information Button"
              >
                + Add new record
              </Button>
            </Box>

            <TableContainer sx={{ border: '1px solid #d1d5db', borderRadius: '4px' }}>
              <Table sx={{ borderCollapse: 'collapse', minWidth: 650 }} aria-label="release of information table" data-aoi="Release of Information Table">
                <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableRow>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Release of Information Table Header Date Requested">Date Requested</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Release of Information Table Header Requested By">Requested By</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Release of Information Table Header By Subpoena">By Subpoena</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Release of Information Table Header Authorized By">Authorized By</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Release of Information Table Header Released By">Released By</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Release of Information Table Header Records">Records</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Release of Information Table Header Date Released">Date Released</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Release of Information Table Header Date to be Returned">Date to be Returned</TableCell>
                    <TableCell sx={{ border: '1px solid #e5e7eb', fontWeight: 'bold' }} data-aoi="Release of Information Table Header Date Returned">Date Returned</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      align="left"
                      sx={{ border: '1px solid #e5e7eb', py: 2 }}
                      data-aoi="Release of Information No Items"
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
                sx={{
                  '& .MuiTablePagination-toolbar': {
                    paddingLeft: 0,
                    paddingRight: 0,
                  }
                }}
              />
            </Box>
          </Box>
        </section>

        {/* OUTSIDE REFERRALS */}
        <section className="cg-section" data-aoi="Outside Referrals Section">
          <h2>Outside Referrals</h2>
          <table className="cg-table">
            <thead>
              <tr>
                <th>Referred From</th>
                <th>Referral Date</th>
                <th>Referred To</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>No items to display</td>
              </tr>
            </tbody>
          </table>
          <button type="button" className="cg-button">+ Add Referral</button>
        </section>

        {/* INSURANCE INFORMATION */}
        <section className="cg-section" data-aoi="Insurance Info Section">
          <h2>Insurance Information</h2>
          
          {/* Column Headers Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
            <div></div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Primary Insurance</h3>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>Secondary Insurance</h3>
          </div>

          {/* Company Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
            <label htmlFor="primary-company" style={{ textAlign: 'left', fontWeight: 'normal' }}>Company</label>
            <input 
              type="text" 
              id="primary-company" 
              name="primaryInsuranceCompany" 
              value={formData.primaryInsuranceCompany}
              onChange={handleChange}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input 
              type="text" 
              id="secondary-company" 
              name="secondaryInsuranceCompany" 
              value={formData.secondaryInsuranceCompany}
              onChange={handleChange}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* Subscriber Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
            <label htmlFor="primary-subscriber" style={{ textAlign: 'left', fontWeight: 'normal' }}>Subscriber</label>
            <input 
              type="text" 
              id="primary-subscriber" 
              name="primaryInsuranceSubscriber" 
              value={formData.primaryInsuranceSubscriber}
              onChange={handleChange}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input 
              type="text" 
              id="secondary-subscriber" 
              name="secondaryInsuranceSubscriber" 
              value={formData.secondaryInsuranceSubscriber}
              onChange={handleChange}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* Policy Number Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
            <label htmlFor="primary-policy" style={{ textAlign: 'left', fontWeight: 'normal' }}>Policy Number</label>
            <input 
              type="text" 
              id="primary-policy" 
              name="primaryInsurancePolicyNumber" 
              value={formData.primaryInsurancePolicyNumber}
              onChange={handleChange}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input 
              type="text" 
              id="secondary-policy" 
              name="secondaryInsurancePolicyNumber" 
              value={formData.secondaryInsurancePolicyNumber}
              onChange={handleChange}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* Group Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
            <label htmlFor="primary-group" style={{ textAlign: 'left', fontWeight: 'normal' }}>Group</label>
            <input 
              type="text" 
              id="primary-group" 
              name="primaryInsuranceGroup" 
              value={formData.primaryInsuranceGroup}
              onChange={handleChange}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input 
              type="text" 
              id="secondary-group" 
              name="secondaryInsuranceGroup" 
              value={formData.secondaryInsuranceGroup}
              onChange={handleChange}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* Has Client Received Referral - Single Column */}
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
            <label style={{ textAlign: 'left', fontWeight: 'normal' }}>Has Client Received Referral?</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                name="hasReferral" 
                checked={formData.hasReferral}
                onChange={handleChange}
                style={{ marginRight: '8px' }}
              />
            </div>
          </div>

          {/* Provider Details Section */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1rem', fontWeight: 'bold' }}>Provider Details</h3>
            
            {/* Provider Clinic Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
              <label htmlFor="provider-clinic" style={{ textAlign: 'left', fontWeight: 'normal' }}>Provider Clinic</label>
              <input 
                type="text" 
                id="provider-clinic" 
                name="providerClinic" 
                value={formData.providerClinic}
                onChange={handleChange}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            {/* Provider Name Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
              <label htmlFor="provider-name" style={{ textAlign: 'left', fontWeight: 'normal' }}>Provider Name</label>
              <input 
                type="text" 
                id="provider-name" 
                name="providerName" 
                value={formData.providerName}
                onChange={handleChange}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            {/* Primary Phone Number Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
              <label htmlFor="provider-phone" style={{ textAlign: 'left', fontWeight: 'normal' }}>Primary Phone Number</label>
              <input 
                type="text" 
                id="provider-phone" 
                name="providerPrimaryPhone" 
                value={formData.providerPrimaryPhone}
                onChange={handleChange}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>

            {/* Provider Website Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
              <label htmlFor="provider-website" style={{ textAlign: 'left', fontWeight: 'normal' }}>Provider Website</label>
              <input 
                type="text" 
                id="provider-website" 
                name="providerWebsite" 
                value={formData.providerWebsite}
                onChange={handleChange}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
          </div>
        </section>

        {/* DOCUMENT UPLOAD SECTION */}
        <DocumentUploadSection
          documents={[]}
          onFileSelect={() => {
            // Handle file select
            console.log("File select clicked");
          }}
          showRemovedCheckbox={true}
          showInstructions={true}
          sectionTitle="Uploaded Documents"
        />

      </form>
      
      {/* Display case data info for debugging */}
      {caseData && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <strong>Case ID:</strong> {caseData.case_id} | 
          <strong> Case Number:</strong> {caseData.case_number || 'N/A'} | 
          <strong> CAC ID:</strong> {caseData.cac_id}
        </Box>
      )}

      {/* Delete Confirmation Dialog - Added for CRUD support */}
      <ConfirmationModal
        open={deleteDialogOpen}
        title="Delete Case"
        message={`Are you sure you want to delete this case? This action cannot be undone. If this case has related records (persons, assessments, session logs, etc.), the deletion will fail.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Notification Snackbar - Added for CRUD support */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleNotificationClose} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default CaseGeneral;
