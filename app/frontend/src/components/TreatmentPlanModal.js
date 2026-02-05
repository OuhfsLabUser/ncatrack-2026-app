// src/components/TreatmentPlanModal.js
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
  InputAdornment,
  Checkbox,
  FormControlLabel
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { agenciesApi, employeesApi, mentalHealthApi, casesApi } from "../services/api";
import { useCase } from "../context/CaseContext";

const TreatmentPlanModal = ({ open, onClose, onSave, editData = null }) => {
  const { currentCase } = useCase();
  const [caseData, setCaseData] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [treatmentModels, setTreatmentModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sessionNotesRows, setSessionNotesRows] = useState(1);
  const [goalsRows, setGoalsRows] = useState(1);
  
  const [formData, setFormData] = useState({
    plan_date: "",
    treatment_model_id: "",
    provider_agency_id: "",
    provider_employee_id: "",
    duration: "",
    duration_unit: "",
    planned_start_date: "",
    planned_end_date: "",
    planned_review_date: "",
    authorized_status_id: "",
    session_notes: "",
    goals_progress: "",
    privacy_forms: {
      HIPAA: false,
      "Agency Disclosure": false,
      "MDT Procedural": false,
      "Right to Privacy": false,
      "Chaperones": false
    },
    consents: {
      "Parent": false,
      "Guardian": false,
      "G. Ad Litem": false,
      "CPS": false,
      "District Attorney": false
    }
  });

  // Helper: format Date/ISO string to YYYY-MM-DD for <input type="date">
  const formatDateForInput = (value) => {
    if (!value) return "";
    try {
      const dateObj = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(dateObj.getTime())) return "";
      return dateObj.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Helper: normalize date string (YYYY-MM-DD) to safe ISO for backend (avoid timezone off-by-one)
  const normalizeDateForBackend = (value) => {
    if (!value || value.trim() === "") return null;
    // Append fixed midday time to avoid crossing date boundaries in most timezones
    return `${value}T12:00:00`;
  };

  // Load case data when modal opens or currentCase changes
  useEffect(() => {
    if (open) {
      loadCaseData();
      loadData();
      if (editData) {
        // Load edit data using related objects and existing text fields
        setFormData({
          plan_date: formatDateForInput(editData.treatment_plan_date),
          // Use related objects returned by Prisma for dropdowns
          treatment_model_id: editData.case_mh_treatment_models?.id?.toString() || "",
          provider_agency_id: editData.cac_agency?.agency_id?.toString() || "",
          provider_employee_id: editData.employee?.employee_id?.toString() || editData.provider_employee_id?.toString() || "",
          duration: editData.duration?.toString() || "",
          duration_unit: editData.duration_unit || "",
          planned_start_date: formatDateForInput(editData.planned_start_date),
          planned_end_date: formatDateForInput(editData.planned_end_date),
          planned_review_date: formatDateForInput(editData.planned_review_date),
          authorized_status_id: editData.authorized_status_id?.toString() || "",
          // Preserve any existing notes/goals text if present
          session_notes: editData.session_notes || "",
          goals_progress: editData.goals_progress || "",
          privacy_forms: editData.privacy_forms 
            ? (typeof editData.privacy_forms === 'string' 
                ? JSON.parse(editData.privacy_forms) 
                : editData.privacy_forms)
            : {
                HIPAA: false,
                "Agency Disclosure": false,
                "MDT Procedural": false,
                "Right to Privacy": false,
                "Chaperones": false
              },
          consents: editData.consents
            ? (typeof editData.consents === 'string'
                ? JSON.parse(editData.consents)
                : editData.consents)
            : {
                "Parent": false,
                "Guardian": false,
                "G. Ad Litem": false,
                "CPS": false,
                "District Attorney": false
              }
        });
      } else {
        // Reset form
        setFormData({
          plan_date: "",
          treatment_model_id: "",
          provider_agency_id: "",
          provider_employee_id: "",
          duration: "",
          duration_unit: "",
          planned_start_date: "",
          planned_end_date: "",
          planned_review_date: "",
          authorized_status_id: "",
          session_notes: "",
          goals_progress: "",
          privacy_forms: {
            HIPAA: false,
            "Agency Disclosure": false,
            "MDT Procedural": false,
            "Right to Privacy": false,
            "Chaperones": false
          },
          consents: {
            "Parent": false,
            "Guardian": false,
            "G. Ad Litem": false,
            "CPS": false,
            "District Attorney": false
          }
        });
      }
      setSessionNotesRows(1);
      setGoalsRows(1);
      setError("");
    }
  }, [open, editData, currentCase]);

  const loadCaseData = async () => {
    // Skip if no case selected or special cases
    if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
      setCaseData(null);
      return;
    }

    // Convert currentCase to number if it's a string
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [agenciesData, employeesData, modelsData] = await Promise.all([
        agenciesApi.getAllAgencies(),
        employeesApi.getAllEmployees(),
        mentalHealthApi.getTreatmentModels()
      ]);
      setAgencies(agenciesData);
      setEmployees(employeesData);
      setTreatmentModels(modelsData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      const [category, key] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleIncreaseSessionNotes = () => {
    setSessionNotesRows(prev => Math.min(prev + 1, 10));
  };

  const handleDecreaseSessionNotes = () => {
    setSessionNotesRows(prev => Math.max(prev - 1, 1));
  };

  const handleIncreaseGoals = () => {
    setGoalsRows(prev => Math.min(prev + 1, 10));
  };

  const handleDecreaseGoals = () => {
    setGoalsRows(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    // Check if case data is loaded
    if (!caseData) {
      // Try to load case data if not loaded yet
      await loadCaseData();
      if (!caseData) {
        setError("No case selected. Please select a case first.");
        return;
      }
    }

    // Convert currentCase to number if it's a string
    const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
    
    if (isNaN(caseId) || caseId <= 0) {
      setError("Invalid case ID. Please select a valid case.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // Debug: Log form data before sending
      console.log('Form data before sending:', {
        privacy_forms: formData.privacy_forms,
        consents: formData.consents,
        session_notes: formData.session_notes,
        goals_progress: formData.goals_progress
      });

      const planData = {
        case_id: caseId,
        cac_id: caseData.cac_id,
        treatment_plan_date: normalizeDateForBackend(formData.plan_date),
        treatment_model_id: formData.treatment_model_id ? parseInt(formData.treatment_model_id) : null,
        provider_agency_id: formData.provider_agency_id ? parseInt(formData.provider_agency_id) : null,
        provider_employee_id: formData.provider_employee_id ? parseInt(formData.provider_employee_id) : null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        duration_unit: formData.duration_unit || null,
        planned_start_date: normalizeDateForBackend(formData.planned_start_date),
        planned_end_date: normalizeDateForBackend(formData.planned_end_date),
        planned_review_date: normalizeDateForBackend(formData.planned_review_date),
        authorized_status_id: formData.authorized_status_id ? parseInt(formData.authorized_status_id) : null,
        session_notes: formData.session_notes || null,
        goals_progress: formData.goals_progress || null,
        privacy_forms: JSON.stringify(formData.privacy_forms),
        consents: JSON.stringify(formData.consents)
      };

      let savedPlan;
      if (editData) {
        savedPlan = await mentalHealthApi.updateTreatmentPlan(editData.id, planData);
      } else {
        savedPlan = await mentalHealthApi.createTreatmentPlan(planData);
      }

      if (onSave) {
        onSave(savedPlan);
      }
      
      onClose();
    } catch (err) {
      console.error("Error saving treatment plan:", err);
      setError(err.message || "Failed to save treatment plan");
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
      maxWidth="md"
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      PaperProps={{
        sx: {
          maxHeight: '90vh'
        }
      }}
      data-aoi="Treatment Plan Modal"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            Edit
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
          {/* Plan Date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Plan Date
            </Typography>
            <TextField
              name="plan_date"
              type="date"
              value={formData.plan_date}
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
                        const input = document.querySelector('input[name="plan_date"]');
                        if (input) input.showPicker?.();
                      }}
                      data-aoi="Plan Date Picker Button"
                    >
                      <CalendarTodayIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              data-aoi="Plan Date Input"
            />
          </Box>

          {/* Treatment Model */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Treatment Model
            </Typography>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <Select
                name="treatment_model_id"
                value={formData.treatment_model_id || ""}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                sx={{
                  '& .MuiSelect-select': {
                    color: '#003C30',
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#003C30',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      zIndex: 1301
                    }
                  },
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left'
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left'
                  }
                }}
                data-aoi="Treatment Model Select"
              >
                <MenuItem value="">
                  <em>Select...</em>
                </MenuItem>
                {treatmentModels.map((model) => (
                  <MenuItem key={model.id} value={model.id.toString()}>
                    {model.model_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                // TODO: Open treatment model setup modal
                console.log("Add treatment model");
              }}
              data-aoi="Add Treatment Model Button"
            >
              + Add
            </Button>
          </Box>

          {/* Provider Agency */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Provider Agency
            </Typography>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <Select
                name="provider_agency_id"
                value={formData.provider_agency_id || ""}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                sx={{
                  '& .MuiSelect-select': { color: '#003C30' },
                  '& .MuiSvgIcon-root': { color: '#003C30' },
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      zIndex: 1301
                    }
                  },
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left'
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left'
                  }
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

          {/* Therapist */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Therapist
            </Typography>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <Select
                name="provider_employee_id"
                value={formData.provider_employee_id || ""}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                sx={{
                  '& .MuiSelect-select': { color: '#003C30' },
                  '& .MuiSvgIcon-root': { color: '#003C30' },
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      zIndex: 1301
                    }
                  },
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left'
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left'
                  }
                }}
                data-aoi="Therapist Select"
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

          {/* Expected Length of Services */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Expected Length of Services
            </Typography>
            <TextField
              name="duration"
              type="number"
              value={formData.duration}
              onChange={handleChange}
              variant="outlined"
              size="small"
              sx={{ width: '120px' }}
              inputProps={{ min: 0 }}
              data-aoi="Duration Input"
            />
            <FormControl size="small" sx={{ width: '150px' }}>
              <Select
                name="duration_unit"
                value={formData.duration_unit || ""}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                sx={{
                  '& .MuiSelect-select': { color: '#003C30' },
                  '& .MuiSvgIcon-root': { color: '#003C30' },
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      zIndex: 1301
                    }
                  }
                }}
                data-aoi="Duration Unit Select"
              >
                <MenuItem value="">Select...</MenuItem>
                <MenuItem value="Days">Days</MenuItem>
                <MenuItem value="Weeks">Weeks</MenuItem>
                <MenuItem value="Months">Months</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Planned Start */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Planned Start
            </Typography>
            <TextField
              name="planned_start_date"
              type="date"
              value={formData.planned_start_date}
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
                        const input = document.querySelector('input[name="planned_start_date"]');
                        if (input) input.showPicker?.();
                      }}
                      data-aoi="Planned Start Picker Button"
                    >
                      <CalendarTodayIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              data-aoi="Planned Start Input"
            />
          </Box>

          {/* Planned End */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Planned End
            </Typography>
            <TextField
              name="planned_end_date"
              type="date"
              value={formData.planned_end_date}
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
                        const input = document.querySelector('input[name="planned_end_date"]');
                        if (input) input.showPicker?.();
                      }}
                      data-aoi="Planned End Picker Button"
                    >
                      <CalendarTodayIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              data-aoi="Planned End Input"
            />
          </Box>

          {/* Plan Review Date */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Plan Review Date
            </Typography>
            <TextField
              name="planned_review_date"
              type="date"
              value={formData.planned_review_date}
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
                        const input = document.querySelector('input[name="planned_review_date"]');
                        if (input) input.showPicker?.();
                      }}
                      data-aoi="Plan Review Date Picker Button"
                    >
                      <CalendarTodayIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              data-aoi="Plan Review Date Input"
            />
          </Box>

          {/* Authorization Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Authorization Status
            </Typography>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <Select
                name="authorized_status_id"
                value={formData.authorized_status_id || ""}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                sx={{
                  '& .MuiSelect-select': { color: '#003C30' },
                  '& .MuiSvgIcon-root': { color: '#003C30' },
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                      zIndex: 1301
                    }
                  },
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left'
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left'
                  }
                }}
                data-aoi="Authorization Status Select"
              >
                <MenuItem value="">
                  <em>Select...</em>
                </MenuItem>
                <MenuItem value="1">Pending</MenuItem>
                <MenuItem value="2">Active</MenuItem>
                <MenuItem value="3">Closed</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Session Notes */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0, pt: 1 }}>
              Session Notes
            </Typography>
            <Box sx={{ display: 'flex', flex: 1, gap: 0.5 }}>
              <TextField
                name="session_notes"
                value={formData.session_notes}
                onChange={handleChange}
                fullWidth
                multiline
                rows={sessionNotesRows}
                variant="outlined"
                size="small"
                data-aoi="Session Notes Input"
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={handleIncreaseSessionNotes}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px'
                  }}
                  data-aoi="Increase Session Notes Rows Button"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleDecreaseSessionNotes}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px'
                  }}
                  data-aoi="Decrease Session Notes Rows Button"
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* Treatment Plan Goals/Progress */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0, pt: 1 }}>
              Treatment Plan Goals/Progress
            </Typography>
            <Box sx={{ display: 'flex', flex: 1, gap: 0.5 }}>
              <TextField
                name="goals_progress"
                value={formData.goals_progress}
                onChange={handleChange}
                fullWidth
                multiline
                rows={goalsRows}
                variant="outlined"
                size="small"
                data-aoi="Goals Progress Input"
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={handleIncreaseGoals}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px'
                  }}
                  data-aoi="Increase Goals Rows Button"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleDecreaseGoals}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px'
                  }}
                  data-aoi="Decrease Goals Rows Button"
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* Privacy Forms Distributed */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0, pt: 1 }}>
              Privacy Forms Distributed
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
              {Object.keys(formData.privacy_forms).map((key) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      name={`privacy_forms.${key}`}
                      checked={formData.privacy_forms[key]}
                      onChange={handleChange}
                      data-aoi={`Privacy Form ${key} Checkbox`}
                    />
                  }
                  label={key}
                />
              ))}
            </Box>
          </Box>

          {/* Consents Obtained */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0, pt: 1 }}>
              Consents Obtained
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
              {Object.keys(formData.consents).map((key) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      name={`consents.${key}`}
                      checked={formData.consents[key]}
                      onChange={handleChange}
                      data-aoi={`Consent ${key} Checkbox`}
                    />
                  }
                  label={key}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'flex-end' }}>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          disabled={saving}
          data-aoi="Update Button"
        >
          Update
        </Button>
        <Button
          onClick={handleCancel}
          variant="outlined"
          startIcon={<CancelIcon />}
          sx={{ color: '#666', borderColor: '#666' }}
          data-aoi="Cancel Button"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TreatmentPlanModal;

