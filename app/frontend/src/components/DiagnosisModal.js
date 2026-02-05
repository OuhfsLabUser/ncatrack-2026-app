// src/components/DiagnosisModal.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputAdornment
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { agenciesApi, employeesApi, mentalHealthApi, casesApi } from "../services/api";
import { useCase } from "../context/CaseContext";

const DiagnosisModal = ({ open, onClose, onSave, editData = null }) => {
  const { currentCase } = useCase();
  const [caseData, setCaseData] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [icd10Groups, setIcd10Groups] = useState([]);
  const [icd10Diagnoses, setIcd10Diagnoses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    mh_provider_agency_id: "",
    provider_employee_id: "",
    diagnosis_date: "",
    icd10_group_id: "",
    icd10_diagnosis_id: ""
  });

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadCaseData();
      loadData();
      if (editData) {
        // Load edit data
        const formatDate = (dateString) => {
          if (!dateString) return "";
          try {
            return new Date(dateString).toISOString().split('T')[0];
          } catch {
            return "";
          }
        };
        
        setFormData({
          mh_provider_agency_id: editData.mh_provider_agency_id?.toString() || "",
          provider_employee_id: editData.provider_employee_id?.toString() || "",
          diagnosis_date: formatDate(editData.diagnosis_date),
          icd10_group_id: editData.icd10_group_id?.toString() || "",
          icd10_diagnosis_id: editData.icd10_diagnosis_id?.toString() || ""
        });
      } else {
        // Reset form
        setFormData({
          mh_provider_agency_id: "",
          provider_employee_id: "",
          diagnosis_date: "",
          icd10_group_id: "",
          icd10_diagnosis_id: ""
        });
      }
      setError("");
    }
  }, [open, editData]);

  const loadCaseData = async () => {
    if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
      setCaseData(null);
      return;
    }

    const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;

    if (isNaN(caseId) || caseId <= 0) {
      setCaseData(null);
      return;
    }

    try {
      const data = await casesApi.getCaseById(caseId);
      setCaseData(data);
    } catch (err) {
      console.error("Error loading case data:", err);
      setCaseData(null);
    }
  };

  const normalizeDateForBackend = (value) => {
    if (!value) return null;

    // Support two frontend date formats:
    // 1) YYYY-MM-DD (native type="date" input)
    // 2) MM/DD/YYYY (user manual input or some date pickers)
    try {
      let year, month, day;

      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        // YYYY-MM-DD format
        [year, month, day] = value.split('-');
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        // MM/DD/YYYY format → convert to YYYY-MM-DD
        const [mm, dd, yyyy] = value.split('/');
        year = yyyy;
        month = mm;
        day = dd;
      } else {
        // Fallback: try parsing with Date object
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString();
      }

      // Ensure date is valid and generate ISO string (fixed to noon 12:00 UTC to avoid timezone issues)
      const isoString = new Date(`${year}-${month}-${day}T12:00:00Z`).toISOString();
      return isoString;
    } catch {
      return null;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [agenciesData, employeesData] = await Promise.all([
        agenciesApi.getAllAgencies(),
        employeesApi.getAllEmployees()
      ]);
      setAgencies(agenciesData);
      setEmployees(employeesData);
      
      // TODO: Load ICD 10 Groups and Diagnoses from picklist or API
      // For now, using empty arrays
      setIcd10Groups([]);
      setIcd10Diagnoses([]);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If ICD 10 Group changes, filter ICD 10 Diagnoses
    if (name === 'icd10_group_id') {
      // TODO: Load diagnoses for selected group
      setIcd10Diagnoses([]);
      setFormData(prev => ({
        ...prev,
        icd10_diagnosis_id: ""
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
        setError("No case selected. Please select a case first.");
        setSaving(false);
        return;
      }

      const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;

      if (isNaN(caseId) || caseId <= 0) {
        setError("Invalid case ID. Please select a valid case.");
        setSaving(false);
        return;
      }

      if (!caseData) {
        await loadCaseData();
        if (!caseData) {
          setError("No case selected. Please select a case first.");
          setSaving(false);
          return;
        }
      }

      const diagnosisData = {
        case_id: caseId,
        cac_id: caseData.cac_id,
        diagnosis_date: normalizeDateForBackend(formData.diagnosis_date),
        mh_provider_agency_id: formData.mh_provider_agency_id ? parseInt(formData.mh_provider_agency_id) : null,
        // Note: provider_employee_id, icd10_group_id, icd10_diagnosis_id may need to be added to the database schema
        provider_employee_id: formData.provider_employee_id ? parseInt(formData.provider_employee_id) : null,
        icd10_group_id: formData.icd10_group_id ? parseInt(formData.icd10_group_id) : null,
        icd10_diagnosis_id: formData.icd10_diagnosis_id ? parseInt(formData.icd10_diagnosis_id) : null
      };

      let savedDiagnosis;
      if (editData) {
        // Prepare old diagnosis data for update (using composite key)
        const oldDiagnosisData = {
          case_id: editData.case_id,
          diagnosis_date: editData.diagnosis_date,
          mh_provider_agency_id: editData.mh_provider_agency_id || null
        };
        
        // Update existing diagnosis
        await mentalHealthApi.updateDiagnosis(oldDiagnosisData, diagnosisData);
        savedDiagnosis = { ...diagnosisData };
      } else {
        // Create new diagnosis
        savedDiagnosis = await mentalHealthApi.createDiagnosis(diagnosisData);
      }

      if (onSave) {
        onSave(savedDiagnosis);
      }
      
      onClose();
    } catch (err) {
      console.error("Error saving diagnosis:", err);
      setError(err.message || "Failed to save diagnosis");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Format employee name for display
  const formatEmployeeName = (employee) => {
    const firstName = employee.first_name || "";
    const lastName = employee.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Unknown";
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh'
        }
      }}
      data-aoi="Diagnosis Modal"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            {editData ? "Edit Diagnosis" : "Add Diagnosis"}
          </Typography>
          <IconButton
            onClick={handleCancel}
            size="small"
            data-aoi="Close Modal Button"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Provider Agency */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Provider Agency
            </Typography>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <Select
                name="mh_provider_agency_id"
                value={formData.mh_provider_agency_id}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                sx={{
                  '& .MuiSelect-select': { color: '#003C30' },
                  '& .MuiSvgIcon-root': { color: '#003C30' },
                }}
                data-aoi="Provider Agency Select"
              >
                <MenuItem value="">
                  <em>Select...</em>
                </MenuItem>
                {agencies.map((agency) => (
                  <MenuItem key={agency.agency_id} value={agency.agency_id.toString()}>
                    {agency.agency_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Provider Personnel */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Provider Personnel
            </Typography>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <Select
                name="provider_employee_id"
                value={formData.provider_employee_id}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                sx={{
                  '& .MuiSelect-select': { color: '#003C30' },
                  '& .MuiSvgIcon-root': { color: '#003C30' },
                }}
                data-aoi="Provider Personnel Select"
              >
                <MenuItem value="">
                  <em>Select...</em>
                </MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee.employee_id} value={employee.employee_id.toString()}>
                    {formatEmployeeName(employee)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Diagnosis Date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Diagnosis Date
            </Typography>
            <TextField
              name="diagnosis_date"
              type="date"
              value={formData.diagnosis_date}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => {
                        const input = document.querySelector('input[name="diagnosis_date"]');
                        if (input) input.showPicker?.();
                      }}
                      data-aoi="Diagnosis Date Picker Button"
                    >
                      <CalendarTodayIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              data-aoi="Diagnosis Date Input"
            />
          </Box>

          {/* ICD 10 Group */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              ICD 10 Group
            </Typography>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <Select
                name="icd10_group_id"
                value={formData.icd10_group_id}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                sx={{
                  '& .MuiSelect-select': { color: '#003C30' },
                  '& .MuiSvgIcon-root': { color: '#003C30' },
                }}
                data-aoi="ICD 10 Group Select"
              >
                <MenuItem value="">
                  <em>Select...</em>
                </MenuItem>
                {icd10Groups.map((group) => (
                  <MenuItem key={group.id} value={group.id.toString()}>
                    {group.name || group.code || `Group ${group.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* ICD 10 Diagnosis */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              ICD 10 Diagnosis
            </Typography>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <Select
                name="icd10_diagnosis_id"
                value={formData.icd10_diagnosis_id}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                disabled={!formData.icd10_group_id}
                sx={{
                  '& .MuiSelect-select': { color: '#003C30' },
                  '& .MuiSvgIcon-root': { color: '#003C30' },
                }}
                data-aoi="ICD 10 Diagnosis Select"
              >
                <MenuItem value="">
                  <em>Select...</em>
                </MenuItem>
                {icd10Diagnoses.map((diagnosis) => (
                  <MenuItem key={diagnosis.id} value={diagnosis.id.toString()}>
                    {diagnosis.name || diagnosis.code || `Diagnosis ${diagnosis.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'flex-end' }}>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{ 
            bgcolor: '#01665e', 
            color: 'white',
            '&:hover': { bgcolor: '#003C30' }
          }}
          startIcon={saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <CheckCircleIcon />}
          disabled={saving}
          data-aoi={editData ? "Update Button" : "Save Button"}
        >
          {editData ? "Update" : "Save"}
        </Button>
        <Button
          onClick={handleCancel}
          variant="outlined"
          sx={{ 
            color: '#757575', 
            borderColor: '#757575',
            bgcolor: 'white',
            '&:hover': { borderColor: '#616161', bgcolor: 'rgba(117, 117, 117, 0.04)' }
          }}
          startIcon={<CancelIcon />}
          data-aoi="Cancel Button"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiagnosisModal;

