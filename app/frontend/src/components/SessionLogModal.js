// src/components/SessionLogModal.js
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
  FormControlLabel,
  Radio,
  RadioGroup,
  Grid,
  Popover,
  List,
  ListItem,
  ListItemButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { agenciesApi, employeesApi, peopleApi, mentalHealthApi } from "../services/api";
import { useCase } from "../context/CaseContext";

const SessionLogModal = ({ open, onClose, onSave, editData = null, caseId: propCaseId, cacId: propCacId }) => {
  const { currentCase } = useCase();
  const [agencies, setAgencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notesRows, setNotesRows] = useState(1);
  const [timePickerAnchor, setTimePickerAnchor] = useState({ start: null, end: null });
  const [timeInputRefs, setTimeInputRefs] = useState({ start: null, end: null });
  const [timeInputValues, setTimeInputValues] = useState({ start: '', end: '' });
  
  const [formData, setFormData] = useState({
    session_date: "",
    start_time: "",
    end_time: "",
    prep: "",
    session_status_id: "",
    recurring: false,
    recurrence_frequency: "",
    recurrence_duration: "",
    recurrence_duration_unit: "",
    provider_agency_id: "",
    provider_employee_id: "",
    location_id: "",
    onsite: false,
    session_type_id: "",
    funding_source_id: "",
    intervention_id: "",
    lock_case_notes: false,
    notes: "",
    case_id: null,
    cac_id: null,
    client_mood: {
      Euthymic: false,
      Anxious: false,
      Euphoric: false,
      Depressed: false,
      Angry: false,
      Other: false
    },
    client_affect: {
      Stabile: false,
      Flat: false,
      Exaggerated: false,
      Inappropriate: false,
      Apathetic: false,
      Other: false,

      Labile: false,
      Blunted: false,
      Appropriate: false,
      Irritable: false,
      Pleasant: false
    },
    attendees: {},
    suicidal_ideation: "",
    homicidal_ideation: "",
    treatment_plan_progress: ""
  });

  // Inject case_id and cac_id when props change
  useEffect(() => {
    if (propCaseId && propCacId) {
      setFormData(prev => ({
        ...prev,
        case_id: propCaseId,
        cac_id: propCacId
      }));
    }
  }, [propCaseId, propCacId]);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadData();
      setTimePickerAnchor({ start: null, end: null });
      setTimeInputRefs({ start: null, end: null });
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
        
        const startTimeDisplay = editData.start_time ? convert24To12(editData.start_time) : '';
        const endTimeDisplay = editData.end_time ? convert24To12(editData.end_time) : '';
        
        setTimeInputValues({
          start: startTimeDisplay,
          end: endTimeDisplay
        });
        
        setFormData({
          session_date: formatDate(editData.session_date),
          start_time: editData.start_time || "",
          end_time: editData.end_time || "",
          prep: "",
          session_status_id: editData.session_status_id?.toString() || "",
          recurring: editData.recurring || false,
          recurrence_frequency: editData.recurring_fre || "",
          recurrence_duration: editData.recurring_duration?.toString() || "",
          recurrence_duration_unit: editData.recurring_duration_unit || "",
          provider_agency_id: editData.provider_agency_id?.toString() || "",
          provider_employee_id: editData.provider_employee_id?.toString() || "",
          location_id: editData.location_id?.toString() || "",
          onsite: editData.onsite || false,
          session_type_id: editData.session_type_id?.toString() || "",
          funding_source_id: "",
          intervention_id: editData.intervention_id?.toString() || "",
          lock_case_notes: false,
          notes: editData.comments || "",
          case_id: propCaseId || null,
          cac_id: propCacId || null,
          client_mood: {
            Euthymic: false,
            Anxious: false,
            Euphoric: false,
            Depressed: false,
            Angry: false,
            Other: false
          },
          client_affect: {
            Stabile: false,
            Flat: false,
            Exaggerated: false,
            Inappropriate: false,
            Apathetic: false,
            Other: false,

            Labile: false,
            Blunted: false,
            Appropriate: false,
            Irritable: false,
            Pleasant: false
          },
          attendees: {},
          suicidal_ideation: "",
          homicidal_ideation: "",
          treatment_plan_progress: ""
        });
      } else {
        // Reset form
        setTimeInputValues({ start: '', end: '' });
        setFormData({
          session_date: "",
          start_time: "",
          end_time: "",
          prep: "",
          session_status_id: "",
          recurring: false,
          recurrence_frequency: "",
          recurrence_duration: "",
          recurrence_duration_unit: "",
          provider_agency_id: "",
          provider_employee_id: "",
          location_id: "",
          onsite: false,
          session_type_id: "",
          funding_source_id: "",
          intervention_id: "",
          lock_case_notes: false,
          notes: "",
          case_id: propCaseId || null,
          cac_id: propCacId || null,
          client_mood: {
            Euthymic: false,
            Anxious: false,
            Euphoric: false,
            Depressed: false,
            Angry: false,
            Other: false
          },
          client_affect: {
            Stabile: false,
            Flat: false,
            Exaggerated: false,
            Inappropriate: false,
            Apathetic: false,
            Other: false,
            Labile: false,
            Blunted: false,
            Appropriate: false,
            Irritable: false,
            Pleasant: false
          },
          attendees: {},
          suicidal_ideation: "",
          homicidal_ideation: "",
          treatment_plan_progress: ""
        });
      }
      setNotesRows(1);
      setError("");
    }
  }, [open, editData]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agenciesData, employeesData] = await Promise.all([
        agenciesApi.getAllAgencies(),
        employeesApi.getAllEmployees()
      ]);
      setAgencies(agenciesData);
      setEmployees(employeesData);
      
      // Load attendees (people associated with the case)
      const resolvedCaseId =
        propCaseId ??
        (typeof currentCase === 'object' ? currentCase?.case_id : currentCase) ??
        null;

      if (resolvedCaseId) {
        try {
          const peopleData = await peopleApi.getPeopleByCaseId(resolvedCaseId);
          setAttendees(peopleData || []);
        } catch (err) {
          console.error("Error loading attendees:", err);
          setAttendees([]);
        }
      }
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
      if (name.startsWith('client_mood.') || name.startsWith('client_affect.')) {
        const [category, key] = name.split('.');
        setFormData(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            [key]: checked
          }
        }));
      } else if (name.startsWith('attendees.')) {
        const personId = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          attendees: {
            ...prev.attendees,
            [personId]: checked
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleIncreaseNotes = () => {
    setNotesRows(prev => Math.min(prev + 1, 10));
  };

  const handleDecreaseNotes = () => {
    setNotesRows(prev => Math.max(prev - 1, 1));
  };

  // Generate time options from 12:00 AM to 11:30 PM (every 30 minutes)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        const time12h = date.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        options.push({
          label: time12h,
          value24: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          value12: time12h
        });
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Convert 24-hour format (HH:MM) to 12-hour format (H:MM AM/PM)
  const convert24To12 = (time24) => {
    if (!time24 || time24 === '') return '';
    try {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours, 10);
      const min = parseInt(minutes, 10);
      if (isNaN(hour) || isNaN(min)) return time24;
      
      const date = new Date();
      date.setHours(hour, min, 0, 0);
      return date.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return time24;
    }
  };

  // Format time input: automatically add colon and format as user types
  const formatTimeInput = (value) => {
    if (!value || value === '') return '';
    
    // Convert to uppercase and remove unwanted characters (keep digits, spaces, A, M, P)
    let cleaned = value.replace(/[^\d\sAPM]/gi, '').toUpperCase();
    
    // Extract numbers
    const numbers = cleaned.replace(/[^\d]/g, '');
    
    // Extract AM/PM (allow partial input like "A", "AM", "P", "PM")
    // Check for complete AM/PM first
    let period = '';
    if (cleaned.includes('AM')) {
      period = 'AM';
    } else if (cleaned.includes('PM')) {
      period = 'PM';
    } else {
      // Check for partial input
      const lastChar = cleaned.trim().slice(-1);
      if (lastChar === 'A' && !cleaned.includes('P')) {
        period = 'A';
      } else if (lastChar === 'P' && !cleaned.includes('A')) {
        period = 'P';
      } else if (cleaned.endsWith('M') && !cleaned.includes('AM') && !cleaned.includes('PM')) {
        // If ends with M but not AM/PM, check if it's part of AM or PM
        const beforeM = cleaned.slice(0, -1).trim().slice(-1);
        if (beforeM === 'A') {
          period = 'AM';
        } else if (beforeM === 'P') {
          period = 'PM';
        }
      }
    }
    
    // If only period is entered (no numbers yet)
    if (numbers.length === 0) {
      return period;
    }
    
    // Limit to 4 digits for time
    const timeDigits = numbers.slice(0, 4);
    
    // Format: add colon after 2 digits if there are more digits
    let formatted = timeDigits;
    if (timeDigits.length > 2) {
      formatted = timeDigits.slice(0, 2) + ':' + timeDigits.slice(2);
    }
    
    // Add space and AM/PM if present
    if (period) {
      formatted = formatted + (formatted.endsWith(' ') ? '' : ' ') + period;
    }
    
    return formatted;
  };

  // Convert 12-hour format (H:MM AM/PM or HHMMAM/PM) to 24-hour format (HH:MM)
  const convert12To24 = (time12) => {
    if (!time12 || time12 === '') return '';
    try {
      // Remove spaces and convert to uppercase
      const cleaned = time12.trim().toUpperCase().replace(/\s+/g, '');
      
      // Try to match formats:
      // 1. "11:45AM" or "11:45 AM"
      // 2. "1145AM" or "1145 AM"
      // 3. "11:45" (24-hour format)
      // 4. "1145" (24-hour format)
      
      let match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
      if (!match) {
        match = cleaned.match(/(\d{1,4})\s*(AM|PM)/);
        if (match) {
          // Format like "1145AM" or "930PM"
          const timeStr = match[1].padStart(4, '0');
          const hour = parseInt(timeStr.slice(0, 2), 10);
          const minute = parseInt(timeStr.slice(2, 4), 10);
          const period = match[2];
          
          let finalHour = hour;
          if (period === 'PM' && finalHour !== 12) {
            finalHour += 12;
          } else if (period === 'AM' && finalHour === 12) {
            finalHour = 0;
          }
          
          return `${String(finalHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        }
        
        // If it's already in 24-hour format, return as is
        if (cleaned.match(/^\d{2}:\d{2}$/)) {
          return cleaned;
        }
        if (cleaned.match(/^\d{4}$/)) {
          // Format like "1145" (24-hour)
          return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
        }
        return time12;
      }
      
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const period = match[3];
      
      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }
      
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    } catch {
      return time12;
    }
  };

  // Handle time picker open
  const handleTimePickerOpen = (field, event) => {
    event.stopPropagation();
    const inputRef = timeInputRefs[field];
    if (inputRef) {
      setTimePickerAnchor(prev => ({
        ...prev,
        [field]: inputRef
      }));
    }
  };

  // Handle time picker close
  const handleTimePickerClose = (field) => {
    setTimePickerAnchor(prev => ({
      ...prev,
      [field]: null
    }));
  };

  // Handle time selection from dropdown
  const handleTimeSelect = (field, timeOption) => {
    setFormData(prev => ({
      ...prev,
      [field]: timeOption.value24
    }));
    // Update display value to show the selected time
    setTimeInputValues(prev => ({
      ...prev,
      [field]: timeOption.value12
    }));
    handleTimePickerClose(field);
  };

  // Handle manual time input
  const handleTimeInputChange = (field, value) => {
    // Format the input (add colon automatically)
    const formatted = formatTimeInput(value);
    
    // Store the formatted display value
    setTimeInputValues(prev => ({
      ...prev,
      [field]: formatted
    }));
    
    // Convert to 24-hour format and store in formData
    if (formatted) {
      const converted = convert12To24(formatted);
      setFormData(prev => ({
        ...prev,
        [field]: converted || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  // Get display value for time input
  const getTimeDisplayValue = (field) => {
    // 1. If user is currently typing (or we pre-filled 12-hour format when opening edit), prioritize displaying input value
    const typed = timeInputValues[field];
    if (typed && typed.trim() !== '') {
      return typed;
    }

    // 2. Otherwise, convert from internally stored 24-hour time to 12-hour format for display
    const value24 = formData[field];
    if (!value24) return '';

    return convert24To12(value24);
  };

  const handleSave = async () => {
    const resolvedCaseId =
      propCaseId ??
      (typeof currentCase === 'object' ? currentCase?.case_id : currentCase) ??
      null;
    const resolvedCacId =
      propCacId ??
      (typeof currentCase === 'object' ? currentCase?.cac_id : null) ??
      null;

    if (!resolvedCaseId) {
      setError("No case selected. Please select a case first.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const sessionData = {
        session_date: formData.session_date || null,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        // Both backend and database require Int foreign key, force convert to number here
        session_status_id: formData.session_status_id
          ? parseInt(formData.session_status_id)
          : null,
        recurring: formData.recurring || false,
        recurring_fre: formData.recurrence_frequency || null,
        recurring_duration: formData.recurrence_duration ? parseInt(formData.recurrence_duration) : null,
        recurring_duration_unit: formData.recurrence_duration_unit || null,
        provider_agency_id: formData.provider_agency_id ? parseInt(formData.provider_agency_id) : null,
        provider_employee_id: formData.provider_employee_id ? parseInt(formData.provider_employee_id) : null,
        location_id: formData.location_id ? parseInt(formData.location_id) : null,
        onsite: formData.onsite || false,
        session_type_id: formData.session_type_id ? parseInt(formData.session_type_id) : null,
        intervention_id: formData.intervention_id ? parseInt(formData.intervention_id) : null,
        comments: formData.notes || null,
        case_id: resolvedCaseId,
        cac_id: resolvedCacId
      };

      let savedSession;
      if (editData && editData.case_mh_session_id) {
        // Update existing session via API
        savedSession = await mentalHealthApi.updateSession(editData.case_mh_session_id, sessionData);
      } else {
        // Create new session via API
        savedSession = await mentalHealthApi.createSession(sessionData);
      }

      if (onSave) {
        onSave(savedSession || sessionData);
      }
      
      onClose();
    } catch (err) {
      console.error("Error saving session log:", err);
      setError(err.message || "Failed to save session log");
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

  // Format attendee name for display
  const formatAttendeeName = (person) => {
    const firstName = person.first_name || "";
    const lastName = person.last_name || "";
    const ssn = person.ssn ? `(${person.ssn})` : "";
    return `${firstName} ${lastName} ${ssn}`.trim() || "Unknown";
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh'
        }
      }}
      data-aoi="Session Log Modal"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            Session Log
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

        <Grid container spacing={3}>
          {/* Left Column - Session Details */}
          <Grid item xs={12} md={6}>
            {/* Date */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0, color: '#dc3545' }}>
                Date
              </Typography>
              <TextField
                name="session_date"
                type="date"
                value={formData.session_date}
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
                          const input = document.querySelector('input[name="session_date"]');
                          if (input) input.showPicker?.();
                        }}
                        data-aoi="Date Picker Button"
                      >
                        <CalendarTodayIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                data-aoi="Date Input"
              />
            </Box>

            {/* Start */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Start
              </Typography>
              <Box sx={{ flex: 1, position: 'relative' }}>
                <TextField
                  name="start_time"
                  value={getTimeDisplayValue('start_time')}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    handleTimeInputChange('start_time', inputValue);
                  }}
                  placeholder="__ : __ __"
                  onBlur={(e) => {
                    // On blur, ensure the value is properly formatted and converted
                    const value = e.target.value;
                    if (value) {
                      const formatted = formatTimeInput(value);
                      const converted = convert12To24(formatted);
                      setFormData(prev => ({
                        ...prev,
                        start_time: converted || ''
                      }));
                      // Update display value to show properly formatted time
                      if (converted) {
                        setTimeInputValues(prev => ({
                          ...prev,
                          start: convert24To12(converted)
                        }));
                      } else {
                        // If conversion failed, keep the formatted input
                        setTimeInputValues(prev => ({
                          ...prev,
                          start: formatted
                        }));
                      }
                    } else {
                      setTimeInputValues(prev => ({
                        ...prev,
                        start: ''
                      }));
                    }
                  }}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  inputRef={(ref) => {
                    if (ref && !timeInputRefs.start) {
                      setTimeInputRefs(prev => ({ ...prev, start: ref }));
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => handleTimePickerOpen('start', e)}
                          data-aoi="Start Time Icon"
                        >
                          <AccessTimeIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  data-aoi="Start Time Input"
                />
                {timePickerAnchor.start && (
                  <Popover
                    open={Boolean(timePickerAnchor.start)}
                    anchorEl={timePickerAnchor.start}
                    onClose={() => handleTimePickerClose('start')}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    PaperProps={{
                      sx: {
                        mt: '-1px',
                        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e0e0e0',
                        borderTop: 'none',
                        borderRadius: '0 0 4px 4px',
                        width: timeInputRefs.start ? timeInputRefs.start.offsetWidth : 200,
                        minWidth: 200,
                        overflow: 'hidden'
                      }
                    }}
                    disablePortal={false}
                  >
                    <List 
                      dense 
                      sx={{ 
                        py: 0,
                        maxHeight: 300,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: '#f1f1f1',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#888',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          background: '#555',
                        }
                      }}
                    >
                      {timeOptions.map((option) => (
                        <ListItem key={option.value24} disablePadding>
                          <ListItemButton
                            onClick={() => handleTimeSelect('start_time', option)}
                            selected={formData.start_time === option.value24}
                            sx={{
                              py: 0.75,
                              px: 2,
                              '&.Mui-selected': {
                                bgcolor: '#01665e',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: '#003C30',
                                }
                              },
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                              }
                            }}
                          >
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              {option.label}
                            </Typography>
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Popover>
                )}
              </Box>
            </Box>

            {/* End */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                End
              </Typography>
              <Box sx={{ flex: 1, position: 'relative' }}>
                <TextField
                  name="end_time"
                  value={getTimeDisplayValue('end_time')}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    handleTimeInputChange('end_time', inputValue);
                  }}
                  placeholder="__ : __ __"
                  onBlur={(e) => {
                    // On blur, ensure the value is properly formatted and converted
                    const value = e.target.value;
                    if (value) {
                      const formatted = formatTimeInput(value);
                      const converted = convert12To24(formatted);
                      setFormData(prev => ({
                        ...prev,
                        end_time: converted || ''
                      }));
                      // Update display value to show properly formatted time
                      if (converted) {
                        setTimeInputValues(prev => ({
                          ...prev,
                          end: convert24To12(converted)
                        }));
                      } else {
                        // If conversion failed, keep the formatted input
                        setTimeInputValues(prev => ({
                          ...prev,
                          end: formatted
                        }));
                      }
                    } else {
                      setTimeInputValues(prev => ({
                        ...prev,
                        end: ''
                      }));
                    }
                  }}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  inputRef={(ref) => {
                    if (ref && !timeInputRefs.end) {
                      setTimeInputRefs(prev => ({ ...prev, end: ref }));
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => handleTimePickerOpen('end', e)}
                          data-aoi="End Time Icon"
                        >
                          <AccessTimeIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  data-aoi="End Time Input"
                />
                {timePickerAnchor.end && (
                  <Popover
                    open={Boolean(timePickerAnchor.end)}
                    anchorEl={timePickerAnchor.end}
                    onClose={() => handleTimePickerClose('end')}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    PaperProps={{
                      sx: {
                        mt: '-1px',
                        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e0e0e0',
                        borderTop: 'none',
                        borderRadius: '0 0 4px 4px',
                        width: timeInputRefs.end ? timeInputRefs.end.offsetWidth : 200,
                        minWidth: 200,
                        overflow: 'hidden'
                      }
                    }}
                    disablePortal={false}
                  >
                    <List 
                      dense 
                      sx={{ 
                        py: 0,
                        maxHeight: 300,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: '#f1f1f1',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#888',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          background: '#555',
                        }
                      }}
                    >
                      {timeOptions.map((option) => (
                        <ListItem key={option.value24} disablePadding>
                          <ListItemButton
                            onClick={() => handleTimeSelect('end_time', option)}
                            selected={formData.end_time === option.value24}
                            sx={{
                              py: 0.75,
                              px: 2,
                              '&.Mui-selected': {
                                bgcolor: '#01665e',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: '#003C30',
                                }
                              },
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                              }
                            }}
                          >
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              {option.label}
                            </Typography>
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Popover>
                )}
              </Box>
            </Box>

            {/* Prep */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Prep
              </Typography>
              <TextField
                name="prep"
                type="number"
                value={formData.prep}
                onChange={handleChange}
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                inputProps={{ min: 0 }}
                data-aoi="Prep Input"
              />
            </Box>

            {/* Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0, color: '#dc3545' }}>
                Status
              </Typography>
            <FormControl fullWidth size="small" sx={{ flex: 1 }}>
              <Select
                name="session_status_id"
                value={formData.session_status_id}
                onChange={handleChange}
                displayEmpty
                variant="outlined"
                sx={{
                  '& .MuiSelect-select': { color: '#003C30' },
                  '& .MuiSvgIcon-root': { color: '#003C30' },
                }}
                data-aoi="Status Select"
              >
                <MenuItem value="">
                  <em>Select...</em>
                </MenuItem>
                {/* TODO: The values here need to correspond to session_status_id in your database.
                    Below assumes 1~9 are valid status_ids, you can adjust according to actual dictionary table. */}
                <MenuItem value="1">Attended</MenuItem>
                <MenuItem value="2">Canceled</MenuItem>
                <MenuItem value="3">Canceled & Rescheduled</MenuItem>
                <MenuItem value="4">Client Canceled</MenuItem>
                <MenuItem value="5">Clinician Canceled</MenuItem>
                <MenuItem value="6">Declined</MenuItem>
                <MenuItem value="7">No-show</MenuItem>
                <MenuItem value="8">Rescheduled</MenuItem>
                <MenuItem value="9">To Be Scheduled</MenuItem>
              </Select>
            </FormControl>
          </Box>

            {/* Recurring */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Recurring
              </Typography>
              <Checkbox
                name="recurring"
                checked={formData.recurring}
                onChange={handleChange}
                data-aoi="Recurring Checkbox"
              />
            </Box>

            {/* Recurrence Frequency */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Recurrence Frequency
              </Typography>
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <Select
                  name="recurrence_frequency"
                  value={formData.recurrence_frequency}
                  onChange={handleChange}
                  displayEmpty
                  variant="outlined"
                  sx={{
                    '& .MuiSelect-select': { color: '#003C30' },
                    '& .MuiSvgIcon-root': { color: '#003C30' },
                  }}
                  data-aoi="Recurrence Frequency Select"
                >
                  <MenuItem value="">
                    <em>Select...</em>
                  </MenuItem>
                  <MenuItem value="Weekly">Weekly</MenuItem>
                  <MenuItem value="Bi-weekly">Bi-weekly</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Recurrence Duration */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Recurrence Duration
              </Typography>
              <TextField
                name="recurrence_duration"
                type="number"
                value={formData.recurrence_duration}
                onChange={handleChange}
                variant="outlined"
                size="small"
                sx={{ width: '120px' }}
                inputProps={{ min: 0 }}
                data-aoi="Recurrence Duration Input"
              />
              <FormControl size="small" sx={{ width: '150px' }}>
                <Select
                  name="recurrence_duration_unit"
                  value={formData.recurrence_duration_unit}
                  onChange={handleChange}
                  displayEmpty
                  variant="outlined"
                  sx={{
                    '& .MuiSelect-select': { color: '#003C30' },
                    '& .MuiSvgIcon-root': { color: '#003C30' },
                  }}
                  data-aoi="Recurrence Duration Unit Select"
                >
                  <MenuItem value="">Select...</MenuItem>
                  <MenuItem value="Months">Months</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>

          {/* Right Column - Provider & Location Details */}
          <Grid item xs={12} md={6}>
            {/* Provider Agency */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Provider Agency
              </Typography>
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <Select
                  name="provider_agency_id"
                  value={formData.provider_agency_id}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
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

            {/* Location */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Location
              </Typography>
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <Select
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleChange}
                  displayEmpty
                  variant="outlined"
                  sx={{
                    '& .MuiSelect-select': { color: '#003C30' },
                    '& .MuiSvgIcon-root': { color: '#003C30' },
                  }}
                  data-aoi="Location Select"
                >
                  <MenuItem value="">
                    <em>Select...</em>
                  </MenuItem>
                  <MenuItem value="1">location1</MenuItem>
                  <MenuItem value="2">location2</MenuItem>
                  <MenuItem value="3">location3</MenuItem>
                  <MenuItem value="4">location4</MenuItem>
                  <MenuItem value="5">location5</MenuItem>
                  <MenuItem value="6">location6</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Onsite */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Onsite
              </Typography>
              <Checkbox
                name="onsite"
                checked={formData.onsite}
                onChange={handleChange}
                data-aoi="Onsite Checkbox"
              />
            </Box>

            {/* Type */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Type
              </Typography>
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <Select
                  name="session_type_id"
                  value={formData.session_type_id}
                  onChange={handleChange}
                  displayEmpty
                  variant="outlined"
                  sx={{
                    '& .MuiSelect-select': { color: '#003C30' },
                    '& .MuiSvgIcon-root': { color: '#003C30' },
                  }}
                  data-aoi="Type Select"
                >
                  <MenuItem value="">
                    <em>Select...</em>
                  </MenuItem>
                  {/* The values here need to be consistent with session_type_id definition in backend/database.
                      Currently assumes 1-8 are IDs for each type, adjust according to actual table if different. */}
                  <MenuItem value="1">Individual Session with Dog</MenuItem>
                  <MenuItem value="2">Individual Talk</MenuItem>
                  <MenuItem value="3">Group/Support</MenuItem>
                  <MenuItem value="4">Session with Interpreter present</MenuItem>
                  <MenuItem value="5">Family</MenuItem>
                  <MenuItem value="6">Psycho/Social Group</MenuItem>
                  <MenuItem value="7">Telehealth Virtual</MenuItem>
                  <MenuItem value="8">Telephone Call</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Funding Source */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Funding Source
              </Typography>
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <Select
                  name="funding_source_id"
                  value={formData.funding_source_id}
                  onChange={handleChange}
                  displayEmpty
                  variant="outlined"
                  sx={{
                    '& .MuiSelect-select': { color: '#003C30' },
                    '& .MuiSvgIcon-root': { color: '#003C30' },
                  }}
                  data-aoi="Funding Source Select"
                >
                  <MenuItem value="">
                    <em>Select...</em>
                  </MenuItem>
                  <MenuItem value="1">Funding Source1</MenuItem>
                  <MenuItem value="2">Funding Source2</MenuItem>
                  <MenuItem value="3">Funding Source3</MenuItem>
                  <MenuItem value="4">Funding Source4</MenuItem>
                  <MenuItem value="5">Funding Source5</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Intervention */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Intervention
              </Typography>
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <Select
                  name="intervention_id"
                  value={formData.intervention_id}
                  onChange={handleChange}
                  displayEmpty
                  variant="outlined"
                  sx={{
                    '& .MuiSelect-select': { color: '#003C30' },
                    '& .MuiSvgIcon-root': { color: '#003C30' },
                  }}
                  data-aoi="Intervention Select"
                >
                  <MenuItem value="">
                    <em>Select...</em>
                  </MenuItem>
                  <MenuItem value="1">Intervention1</MenuItem>
                  <MenuItem value="2">Intervention2</MenuItem>
                  <MenuItem value="3">Intervention3</MenuItem>
                  <MenuItem value="4">Intervention4</MenuItem>
                  <MenuItem value="5">Intervention5</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Lock Case Notes */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Lock Case Notes
              </Typography>
              <Checkbox
                name="lock_case_notes"
                checked={formData.lock_case_notes}
                onChange={handleChange}
                data-aoi="Lock Case Notes Checkbox"
              />
            </Box>
          </Grid>
        </Grid>

        {/* Notes */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 3 }}>
          <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0, pt: 1 }}>
            Notes
          </Typography>
          <Box sx={{ display: 'flex', flex: 1, gap: 0.5 }}>
            <TextField
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              fullWidth
              multiline
              rows={notesRows}
              variant="outlined"
              size="small"
              data-aoi="Notes Input"
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={handleIncreaseNotes}
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px'
                }}
                data-aoi="Increase Notes Rows Button"
              >
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleDecreaseNotes}
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px'
                }}
                data-aoi="Decrease Notes Rows Button"
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Bottom Section - Client Status & Progress */}
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2.5, alignItems: 'flex-start', flexWrap: 'wrap', mb: 2 }}>
          {/* Client Mood */}
          <Box
            sx={{
              border: '1px solid #bfbfbf',
              borderRadius: '3px',
              padding: '8px 10px',
              paddingTop: '16px',
              width: 'fit-content',
              minWidth: '250px',
              position: 'relative'
            }}
          >
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600, 
                position: 'absolute',
                top: '-10px',
                left: '10px',
                backgroundColor: 'white',
                padding: '0 4px'
              }}
            >
              Client Mood
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                columnGap: 2,
                rowGap: 0.5
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_mood.Euthymic"
                    checked={formData.client_mood.Euthymic}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Mood Euthymic Checkbox"
                  />
                }
                label="Euthymic"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_mood.Depressed"
                    checked={formData.client_mood.Depressed}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Mood Depressed Checkbox"
                  />
                }
                label="Depressed"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_mood.Anxious"
                    checked={formData.client_mood.Anxious}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Mood Anxious Checkbox"
                  />
                }
                label="Anxious"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_mood.Angry"
                    checked={formData.client_mood.Angry}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Mood Angry Checkbox"
                  />
                }
                label="Angry"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_mood.Euphoric"
                    checked={formData.client_mood.Euphoric}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Mood Euphoric Checkbox"
                  />
                }
                label="Euphoric"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_mood.Other"
                    checked={formData.client_mood.Other}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Mood Other Checkbox"
                  />
                }
                label="Other"
              />
            </Box>
          </Box>

          {/* Client Affect */}
          <Box
            sx={{
              border: '1px solid #bfbfbf',
              borderRadius: '3px',
              padding: '8px 10px',
              paddingTop: '16px',
              width: 'fit-content',
              minWidth: '300px',
              position: 'relative'
            }}
          >
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600, 
                position: 'absolute',
                top: '-10px',
                left: '10px',
                backgroundColor: 'white',
                padding: '0 4px'
              }}
            >
              Client Affect
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                columnGap: 2,
                rowGap: 0.5
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Stabile"
                    checked={formData.client_affect.Stabile}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Stabile Checkbox"
                  />
                }
                label="Stabile"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Labile"
                    checked={formData.client_affect.Labile}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Labile Checkbox"
                  />
                }
                label="Labile"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Flat"
                    checked={formData.client_affect.Flat}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Flat Checkbox"
                  />
                }
                label="Flat"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Blunted"
                    checked={formData.client_affect.Blunted}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Blunted Checkbox"
                  />
                }
                label="Blunted"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Exaggerated"
                    checked={formData.client_affect.Exaggerated}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Exaggerated Checkbox"
                  />
                }
                label="Exaggerated"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Appropriate"
                    checked={formData.client_affect.Appropriate}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Appropriate Checkbox"
                  />
                }
                label="Appropriate"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Inappropriate"
                    checked={formData.client_affect.Inappropriate}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Inappropriate Checkbox"
                  />
                }
                label="Inappropriate"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Irritable"
                    checked={formData.client_affect.Irritable}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Irritable Checkbox"
                  />
                }
                label="Irritable"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Apathetic"
                    checked={formData.client_affect.Apathetic}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Apathetic Checkbox"
                  />
                }
                label="Apathetic"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Pleasant"
                    checked={formData.client_affect.Pleasant}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Pleasant Checkbox"
                  />
                }
                label="Pleasant"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="client_affect.Other"
                    checked={formData.client_affect.Other}
                    onChange={handleChange}
                    size="small"
                    data-aoi="Client Affect Other Checkbox"
                  />
                }
                label="Other"
              />
            </Box>
          </Box>

          {/* Attendees */}
          <Box
            sx={{
              border: '1px solid #bfbfbf',
              borderRadius: '3px',
              padding: '8px 10px',
              width: 'fit-content',
              minWidth: '220px'
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Attendees
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {attendees.map((person) => (
                <FormControlLabel
                  key={person.person_id}
                  control={
                    <Checkbox
                      name={`attendees.${person.person_id}`}
                      checked={formData.attendees[person.person_id] || false}
                      onChange={handleChange}
                      size="small"
                      data-aoi={`Attendee ${person.person_id} Checkbox`}
                    />
                  }
                  label={formatAttendeeName(person)}
                />
              ))}
            </Box>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Suicidal Ideation */}
          <Grid item xs={12} md={4}>
            <Box sx={{ border: '1px solid #ddd', borderRadius: '4px', p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Suicidal Ideation
              </Typography>
              <RadioGroup
                name="suicidal_ideation"
                value={formData.suicidal_ideation}
                onChange={handleChange}
                data-aoi="Suicidal Ideation Radio Group"
              >
                <FormControlLabel value="Not Suicidal" control={<Radio size="small" />} label="Not Suicidal" />
                <FormControlLabel value="Suicidal Ideation" control={<Radio size="small" />} label="Suicidal Ideation" />
                <FormControlLabel value="Suicidal Ideation and Plan" control={<Radio size="small" />} label="Suicidal Ideation and Plan" />
              </RadioGroup>
            </Box>
          </Grid>

          {/* Homicidal Ideation */}
          <Grid item xs={12} md={4}>
            <Box sx={{ border: '1px solid #ddd', borderRadius: '4px', p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Homicidal Ideation
              </Typography>
              <RadioGroup
                name="homicidal_ideation"
                value={formData.homicidal_ideation}
                onChange={handleChange}
                data-aoi="Homicidal Ideation Radio Group"
              >
                <FormControlLabel value="No Homicidal Ideation" control={<Radio size="small" />} label="No Homicidal Ideation" />
                <FormControlLabel value="Homicidal Ideation" control={<Radio size="small" />} label="Homicidal Ideation" />
              </RadioGroup>
            </Box>
          </Grid>

          {/* Treatment Plan Progress */}
          <Grid item xs={12} md={4}>
            <Box sx={{ border: '1px solid #ddd', borderRadius: '4px', p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Treatment Plan Progress
              </Typography>
              <RadioGroup
                name="treatment_plan_progress"
                value={formData.treatment_plan_progress}
                onChange={handleChange}
                data-aoi="Treatment Plan Progress Radio Group"
              >
                <FormControlLabel value="None" control={<Radio size="small" />} label="None" />
                <FormControlLabel value="Minimal" control={<Radio size="small" />} label="Minimal" />
                <FormControlLabel value="Moderate" control={<Radio size="small" />} label="Moderate" />
                <FormControlLabel value="Significant" control={<Radio size="small" />} label="Significant" />
                <FormControlLabel value="Met/Exceeded" control={<Radio size="small" />} label="Met/Exceeded" />
              </RadioGroup>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'flex-end' }}>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{ 
            bgcolor: '#4caf50', 
            color: 'white',
            '&:hover': { bgcolor: '#45a049' }
          }}
          startIcon={saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : null}
          disabled={saving || !propCaseId}
          data-aoi="Save Button"
        >
          Save
        </Button>
        <Button
          onClick={handleCancel}
          variant="outlined"
          sx={{ 
            color: '#ff9800', 
            borderColor: '#ff9800',
            '&:hover': { borderColor: '#f57c00', bgcolor: 'rgba(255, 152, 0, 0.04)' }
          }}
          data-aoi="Cancel Button"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionLogModal;

