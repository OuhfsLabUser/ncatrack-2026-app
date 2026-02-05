// src/components/MHProviderModal.js
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
  InputLabel,
  Checkbox,
  FormControlLabel,
  Grid
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { agenciesApi, employeesApi, mentalHealthApi, pickListsApi } from "../services/api";
import { useCase } from "../context/CaseContext";
import NewAgencyModal from "./NewAgencyModal";
import NewPersonnelModal from "./NewPersonnelModal";

const MHProviderModal = ({ open, onClose, onSave }) => {
  const { currentCase } = useCase();
  const [agencies, setAgencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [referralTypes, setReferralTypes] = useState([]);
  const [therapyEndReasons, setTherapyEndReasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newAgencyModalOpen, setNewAgencyModalOpen] = useState(false);
  const [newPersonnelModalOpen, setNewPersonnelModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    agency_id: "",
    lead_employee_id: "",
    case_number: "",
    therapy_offered_date: "",
    therapy_end_reason_id: "",
    therapy_record_created: false,
    provider_type_id: "",
    waiting_list: false, // Note: This field may not exist in schema
    therapy_accepted: false,
    therapy_complete_date: ""
  });

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadData();
      // Reset form
      setFormData({
        agency_id: "",
        lead_employee_id: "",
        case_number: "",
        therapy_offered_date: "",
        therapy_end_reason_id: "",
        therapy_record_created: false,
        provider_type_id: "",
        waiting_list: false,
        therapy_accepted: false,
        therapy_complete_date: ""
      });
      setError("");
    }
  }, [open]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agenciesData, employeesData] = await Promise.all([
        agenciesApi.getAllAgencies(),
        employeesApi.getAllEmployees()
      ]);
      setAgencies(agenciesData);
      setEmployees(employeesData);
      
      // Load picklists for referral types and therapy end reasons
      // Note: These may need to be adjusted based on actual picklist structure
      try {
        const picklists = await pickListsApi.getAllPickLists();
        // Filter for relevant picklists (adjust based on actual structure)
        const referralTypeList = picklists.find(p => p.name === "Referral Type" || p.name === "Provider Type");
        const endReasonList = picklists.find(p => p.name === "Therapy End Reason" || p.name === "Reason Sessions Ended");
        
        if (referralTypeList) setReferralTypes(referralTypeList.items || []);
        if (endReasonList) setTherapyEndReasons(endReasonList.items || []);
      } catch (err) {
        console.error("Error loading picklists:", err);
        // Set empty arrays if picklists fail to load
        setReferralTypes([]);
        setTherapyEndReasons([]);
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAgencySelect = (agency) => {
    setFormData(prev => ({
      ...prev,
      agency_id: agency.agency_id ? agency.agency_id.toString() : ""
    }));
    setNewAgencyModalOpen(false);
    loadData(); // Reload to ensure latest data
  };

  const handlePersonnelSelect = (employee) => {
    setFormData(prev => ({
      ...prev,
      lead_employee_id: employee.employee_id ? employee.employee_id.toString() : ""
    }));
    setNewPersonnelModalOpen(false);
    loadData(); // Reload to ensure latest data
  };

  const handleSave = async () => {
    if (!currentCase?.case_id) {
      setError("No case selected. Please select a case first.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const providerData = {
        case_id: currentCase.case_id,
        agency_id: formData.agency_id ? parseInt(formData.agency_id) : null,
        lead_employee_id: formData.lead_employee_id ? parseInt(formData.lead_employee_id) : null,
        case_number: formData.case_number || null,
        therapy_offered_date: formData.therapy_offered_date || null,
        therapy_end_reason_id: formData.therapy_end_reason_id ? parseInt(formData.therapy_end_reason_id) : null,
        therapy_record_created: formData.therapy_record_created || false,
        provider_type_id: formData.provider_type_id ? parseInt(formData.provider_type_id) : null,
        therapy_accepted: formData.therapy_accepted || false,
        therapy_complete_date: formData.therapy_complete_date || null
        // Note: waiting_list is not included as it may not exist in schema
      };

      const createdProvider = await mentalHealthApi.addProvider(providerData);
      
      if (onSave) {
        onSave(createdProvider);
      }
      
      onClose();
    } catch (err) {
      console.error("Error creating provider:", err);
      setError(err.message || "Failed to create provider");
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
        data-aoi="MH Provider Modal"
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

          <Grid container spacing={3}>
            {/* Left Column */}
            <Grid item xs={12} md={6}>
              {/* MH Provider Agency */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                  MH Provider Agency
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
                    data-aoi="MH Provider Agency Select"
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
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setNewAgencyModalOpen(true)}
                  data-aoi="Add Agency Button"
                >
                  + Add
                </Button>
              </Box>

              {/* Mental Health Service Provider */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                  Mental Health Service Provider
                </Typography>
                <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                  <Select
                    name="lead_employee_id"
                    value={formData.lead_employee_id}
                    onChange={handleChange}
                    displayEmpty
                    variant="outlined"
                    sx={{
                      '& .MuiSelect-select': { color: '#003C30' },
                      '& .MuiSvgIcon-root': { color: '#003C30' },
                    }}
                    data-aoi="Service Provider Select"
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
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setNewPersonnelModalOpen(true)}
                  data-aoi="Add Personnel Button"
                >
                  + Add
                </Button>
              </Box>

              {/* MH Case # */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                  MH Case #
                </Typography>
                <TextField
                  name="case_number"
                  value={formData.case_number}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{ flex: 1 }}
                  data-aoi="MH Case Number Input"
                />
              </Box>

              {/* Date Therapy Offered to Family */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', color: '#d00', flexShrink: 0 }}>
                  Date Therapy Offered to Family
                </Typography>
                <TextField
                  name="therapy_offered_date"
                  type="date"
                  value={formData.therapy_offered_date}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{ flex: 1 }}
                  InputLabelProps={{ shrink: true }}
                  data-aoi="Therapy Offered Date Input"
                />
              </Box>

              {/* Reason Sessions Ended */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                  Reason Sessions Ended
                </Typography>
                <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                  <Select
                    name="therapy_end_reason_id"
                    value={formData.therapy_end_reason_id}
                    onChange={handleChange}
                    displayEmpty
                    variant="outlined"
                    sx={{
                      '& .MuiSelect-select': { color: '#003C30' },
                      '& .MuiSvgIcon-root': { color: '#003C30' },
                    }}
                    data-aoi="Reason Sessions Ended Select"
                  >
                    <MenuItem value="">
                      <em>Select Tr...</em>
                    </MenuItem>
                    {therapyEndReasons.map((reason) => (
                      <MenuItem key={reason.id || reason.value} value={(reason.id || reason.value).toString()}>
                        {reason.name || reason.label || reason.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Record Created */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                  Record Created
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="therapy_record_created"
                      checked={formData.therapy_record_created}
                      onChange={handleChange}
                      data-aoi="Record Created Checkbox"
                    />
                  }
                  label=""
                />
              </Box>
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={6}>
              {/* Referral Type */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                  Referral Type
                </Typography>
                <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                  <Select
                    name="provider_type_id"
                    value={formData.provider_type_id}
                    onChange={handleChange}
                    displayEmpty
                    variant="outlined"
                    sx={{
                      '& .MuiSelect-select': { color: '#003C30' },
                      '& .MuiSvgIcon-root': { color: '#003C30' },
                    }}
                    data-aoi="Referral Type Select"
                  >
                    <MenuItem value="">
                      <em>Select Referral Typ...</em>
                    </MenuItem>
                    {referralTypes.map((type) => (
                      <MenuItem key={type.id || type.value} value={(type.id || type.value).toString()}>
                        {type.name || type.label || type.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Waiting List */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                  Waiting List
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="waiting_list"
                      checked={formData.waiting_list}
                      onChange={handleChange}
                      data-aoi="Waiting List Checkbox"
                    />
                  }
                  label=""
                />
              </Box>

              {/* Child/Family Accepted Therapy Services */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                  Child/Family Accepted Therapy Services
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="therapy_accepted"
                      checked={formData.therapy_accepted}
                      onChange={handleChange}
                      data-aoi="Therapy Accepted Checkbox"
                    />
                  }
                  label=""
                />
              </Box>

              {/* Therapy Completed Date */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography sx={{ width: '180px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
                  Therapy Completed Date
                </Typography>
                <TextField
                  name="therapy_complete_date"
                  type="date"
                  value={formData.therapy_complete_date}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{ flex: 1 }}
                  InputLabelProps={{ shrink: true }}
                  data-aoi="Therapy Completed Date Input"
                />
              </Box>
            </Grid>
          </Grid>
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

      {/* New Agency Modal */}
      <NewAgencyModal
        open={newAgencyModalOpen}
        onClose={() => setNewAgencyModalOpen(false)}
        onSelectAgency={handleAgencySelect}
      />

      {/* New Personnel Modal */}
      <NewPersonnelModal
        open={newPersonnelModalOpen}
        onClose={() => setNewPersonnelModalOpen(false)}
        onSelectPersonnel={handlePersonnelSelect}
      />
    </>
  );
};

export default MHProviderModal;

