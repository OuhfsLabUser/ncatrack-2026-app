// src/components/AssessmentModal.js
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
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { agenciesApi, employeesApi, mentalHealthApi, casesApi } from "../services/api";
import { useCase } from "../context/CaseContext";
import AssessmentInstrumentModal from "./AssessmentInstrumentModal";

const AssessmentModal = ({ open, onClose, onSave, editData = null }) => {
  const { currentCase } = useCase();
  const [caseData, setCaseData] = useState(null);
  const [agencies, setAgencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assessmentInstruments, setAssessmentInstruments] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [instrumentModalOpen, setInstrumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [commentsRows, setCommentsRows] = useState(1);
  
  const [formData, setFormData] = useState({
    assessment_instrument_id: "",
    session_date: "",
    assessment_date: "",
    agency_id: "",
    provider_employee_id: "",
    timing_id: "",
    comments: "",
    scores: {} // Changed to object: { measure_id: score_value }
  });

  // Load case + lookup data when modal opens
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
        
        const scoresObj = {};
        if (editData.case_mh_assessment_measure_scores) {
          editData.case_mh_assessment_measure_scores.forEach(score => {
            if (score.measure_id) {
              // Use mh_assessment_scores from database, fallback to score_value if mapped
              scoresObj[score.measure_id] = score.mh_assessment_scores || score.score_value || "";
            }
          });
        }
        
        setFormData({
          assessment_instrument_id: editData.assessment_instrument_id?.toString() || "",
          session_date: formatDate(editData.session_date),
          assessment_date: formatDate(editData.assessment_date),
          agency_id: editData.agency_id?.toString() || "",
          provider_employee_id: editData.provider_employee_id?.toString() || "",
          timing_id: editData.timing_id?.toString() || "",
          comments: editData.comments || "",
          scores: scoresObj
        });
        
        // Load measures for the selected instrument
        if (editData.assessment_instrument_id) {
          loadMeasures(editData.assessment_instrument_id);
        }
      } else {
        // Reset form
        setFormData({
          assessment_instrument_id: "",
          session_date: "",
          assessment_date: "",
          agency_id: "",
          provider_employee_id: "",
          timing_id: "",
          comments: "",
          scores: {}
        });
        setMeasures([]);
      }
      setCommentsRows(1);
      setError("");
    }
  }, [open, editData]);

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
      const [agenciesData, employeesData, instrumentsData] = await Promise.all([
        agenciesApi.getAllAgencies(),
        employeesApi.getAllEmployees(),
        mentalHealthApi.getAssessmentInstruments()
      ]);
      setAgencies(agenciesData);
      setEmployees(employeesData);
      setAssessmentInstruments(instrumentsData || []);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If instrument is changed, load its measures
    if (name === 'assessment_instrument_id') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        scores: {} // Reset scores when instrument changes
      }));
      if (value) {
        loadMeasures(parseInt(value));
      } else {
        setMeasures([]);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleScoreChange = (measureId, value) => {
    setFormData(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [measureId]: value
      }
    }));
  };
  
  const loadMeasures = async (instrumentId) => {
    try {
      const measuresData = await mentalHealthApi.getMeasuresByInstrumentId(instrumentId);
      setMeasures(measuresData || []);
    } catch (err) {
      console.error("Error loading measures:", err);
      setMeasures([]);
    }
  };

  const handleIncreaseComments = () => {
    setCommentsRows(prev => Math.min(prev + 1, 10));
  };

  const handleDecreaseComments = () => {
    setCommentsRows(prev => Math.max(prev - 1, 1));
  };

  const handleAddInstrument = () => {
    setInstrumentModalOpen(true);
  };

  const handleInstrumentSelected = async (instrument) => {
    if (!instrument) {
      setInstrumentModalOpen(false);
      // Reload instruments list when modal closes to include any newly added instruments
      await loadData();
      return;
    }
    const id = instrument.instrument_id || instrument.id;
    const name = instrument.assessment_name || instrument.instrument_name || instrument.name || `Instrument ${id}`;
    setFormData(prev => ({
      ...prev,
      assessment_instrument_id: id ? id.toString() : "",
      assessment_instrument_name: name
    }));
    setInstrumentModalOpen(false);
    // Reload instruments list to include any newly added instruments
    await loadData();
    if (id) {
      await loadMeasures(id);
    }
  };

  const toBackendDate = (value) => {
    if (!value) return null;

    // Support two frontend date formats:
    // 1) YYYY-MM-DD (native <input type="date"> format)
    // 2) MM/DD/YYYY (current UI display format, e.g., 12/03/2025)
    try {
      let year, month, day;

      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        // YYYY-MM-DD
        [year, month, day] = value.split('-');
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        // MM/DD/YYYY → convert to YYYY-MM-DD
        const [mm, dd, yyyy] = value.split('/');
        year = yyyy;
        month = mm;
        day = dd;
      } else {
        // Fallback: parse directly with Date
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString();
      }

      // Normalize to noon 12:00 to avoid timezone conversion causing date changes
      const isoString = new Date(`${year}-${month}-${day}T12:00:00Z`).toISOString();
      return isoString;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.assessment_instrument_id) {
      setError("Assessment Instrument is required");
      return;
    }
    if (!formData.agency_id) {
      setError("Provider Agency is required");
      return;
    }
    if (!formData.provider_employee_id) {
      setError("Provider Personnel is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // Resolve and validate current case
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

      // Ensure we have case data for cac_id
      if (!caseData) {
        await loadCaseData();
        if (!caseData) {
          setError("No case selected. Please select a case first.");
          setSaving(false);
          return;
        }
      }

      const assessmentData = {
        case_id: caseId,
        cac_id: caseData.cac_id,
        assessment_instrument_id: formData.assessment_instrument_id ? parseInt(formData.assessment_instrument_id) : null,
        session_date: toBackendDate(formData.session_date),
        assessment_date: toBackendDate(formData.assessment_date),
        agency_id: formData.agency_id ? parseInt(formData.agency_id) : null,
        provider_employee_id: formData.provider_employee_id ? parseInt(formData.provider_employee_id) : null,
        timing_id: formData.timing_id ? parseInt(formData.timing_id) : null,
        comments: formData.comments || null
      };

      let savedAssessment;
      if (editData) {
        // Check if assessment_id exists
        const assessmentId = editData.assessment_id;
        
        if (!assessmentId) {
          console.error("editData.assessment_id is missing:", editData);
          setError("Assessment ID is missing. Cannot update.");
          setSaving(false);
          return;
        }
        
        // Edit mode: call backend update API
        console.log("Updating assessment - ID:", assessmentId, "Data:", assessmentData);
        console.log("Full editData:", editData);
        
        try {
          savedAssessment = await mentalHealthApi.updateAssessment(
            assessmentId,
            assessmentData
          );
        } catch (err) {
          console.error("Error updating assessment:", err);
          throw err; // Re-throw error for outer catch to handle
        }
      } else {
        // Create mode: call create API
        console.log("Creating new assessment - Data:", assessmentData);
        savedAssessment = await mentalHealthApi.createAssessment(assessmentData);
      }

      // Save scores if provided
      if (savedAssessment?.assessment_id && Object.keys(formData.scores).length > 0) {
        try {
          const scoresArray = Object.entries(formData.scores).map(([measureId, scoreValue]) => ({
            measure_id: parseInt(measureId),
            score_value: scoreValue || null
          }));
          
          await mentalHealthApi.saveAssessmentScores(savedAssessment.assessment_id, scoresArray);
        } catch (err) {
          console.error("Error saving scores:", err);
          setError(err.message || "Failed to save scores");
          return;
        }
      }

      if (onSave) {
        onSave(savedAssessment);
      }
      
      onClose();
    } catch (err) {
      console.error("Error saving assessment:", err);
      setError(err.message || "Failed to save assessment");
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
    <>
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh'
        }
      }}
      data-aoi="Assessment Modal"
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

        {/* Required fields notice */}
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontStyle: 'italic' }}>
          * Instrument, Agency, and Personnel Fields are Required
        </Typography>

        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Left Column */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Assessment Instrument */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Assessment Instrument
              </Typography>
              <FormControl size="small" sx={{ flex: 1 }}>
                <Select
                  name="assessment_instrument_id"
                  value={formData.assessment_instrument_id}
                  onChange={handleChange}
                  displayEmpty
                  variant="outlined"
                  sx={{
                    '& .MuiSelect-select': { color: '#003C30' },
                    '& .MuiSvgIcon-root': { color: '#003C30' },
                  }}
                  data-aoi="Assessment Instrument Select"
                >
                  <MenuItem value="">
                    <em>Select...</em>
                  </MenuItem>
                  {assessmentInstruments.map((instrument) => (
                    <MenuItem key={instrument.instrument_id} value={instrument.instrument_id.toString()}>
                      {instrument.assessment_name || `Instrument ${instrument.instrument_id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                variant="outlined"
                onClick={handleAddInstrument}
                sx={{ minWidth: '60px' }}
                data-aoi="Add Instrument Button"
              >
                Add
              </Button>
            </Box>

            {/* Session Date */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Session Date
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
                        data-aoi="Session Date Picker Button"
                      >
                        <CalendarTodayIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                data-aoi="Session Date Input"
              />
            </Box>

            {/* Assessment Date */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Assessment Date
              </Typography>
              <TextField
                name="assessment_date"
                type="date"
                value={formData.assessment_date}
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
                          const input = document.querySelector('input[name="assessment_date"]');
                          if (input) input.showPicker?.();
                        }}
                        data-aoi="Assessment Date Picker Button"
                      >
                        <CalendarTodayIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                data-aoi="Assessment Date Input"
              />
            </Box>

            {/* Provider Agency */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Provider Agency
              </Typography>
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <Select
                  name="agency_id"
                  value={formData.agency_id}
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

            {/* Timing */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                Timing
              </Typography>
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <Select
                  name="timing_id"
                  value={formData.timing_id}
                  onChange={handleChange}
                  displayEmpty
                  variant="outlined"
                  sx={{
                    '& .MuiSelect-select': { color: '#003C30' },
                    '& .MuiSvgIcon-root': { color: '#003C30' },
                  }}
                  data-aoi="Timing Select"
                >
                  <MenuItem value="">
                    <em>Select...</em>
                  </MenuItem>
                  <MenuItem value="1">Pre-Treatment</MenuItem>
                  <MenuItem value="2">Mid-Treatment</MenuItem>
                  <MenuItem value="3">Post-Treatment</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Comments */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0, pt: 1 }}>
                Comments
              </Typography>
              <Box sx={{ display: 'flex', flex: 1, gap: 0.5 }}>
                <TextField
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={commentsRows}
                  variant="outlined"
                  size="small"
                  data-aoi="Comments Input"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={handleIncreaseComments}
                    sx={{ 
                      bgcolor: 'primary.main', 
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      width: '32px',
                      height: '32px',
                      borderRadius: '4px'
                    }}
                    data-aoi="Increase Comments Rows Button"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={handleDecreaseComments}
                    sx={{ 
                      bgcolor: 'primary.main', 
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      width: '32px',
                      height: '32px',
                      borderRadius: '4px'
                    }}
                    data-aoi="Decrease Comments Rows Button"
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Right Column */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ width: '100%', fontWeight: 'bold', mb: 1 }}>
              Scores of this Assessment's Measures
            </Typography>
            {measures.length === 0 ? (
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid #ddd',
                borderRadius: '4px',
                p: 2
              }}>
                <Typography variant="body2" color="text.secondary">
                  {formData.assessment_instrument_id 
                    ? "No measures defined for this instrument" 
                    : "Select an instrument to view measures"}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                gap: 1,
                border: '1px solid #ddd',
                borderRadius: '4px',
                p: 2,
                overflowY: 'auto',
                maxHeight: '400px'
              }}>
                {measures.map((measure) => {
                  // Use measure_id for data binding (as required), but measure.id or measure.measure_id for key
                  const measureId = measure.measure_id || measure.id;
                  const measureName = measure.measure_name || measure.name;
                  
                  return (
                    <Box key={measureId} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '120px', flexShrink: 0 }}>
                        {measureName}
                      </Typography>
                      <TextField
                        value={formData.scores[measureId] || ""}
                        onChange={(e) => handleScoreChange(measureId, e.target.value)}
                        placeholder="Enter score"
                        variant="outlined"
                        size="small"
                        sx={{ flex: 1 }}
                        data-aoi={`Score Input ${measureId}`}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
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
          data-aoi="Update Button"
        >
          Update
        </Button>
        <Button
          onClick={handleCancel}
          variant="outlined"
          sx={{ 
            color: '#757575', 
            borderColor: '#757575',
            '&:hover': { borderColor: '#616161', bgcolor: 'rgba(117, 117, 117, 0.04)' }
          }}
          startIcon={<CancelIcon />}
          data-aoi="Cancel Button"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
    <AssessmentInstrumentModal
      open={instrumentModalOpen}
      onClose={async () => {
        setInstrumentModalOpen(false);
        // Reload instruments list when modal closes to include any newly added instruments
        await loadData();
      }}
      onSelect={handleInstrumentSelected}
    />
    </>
  );
};

export default AssessmentModal;

