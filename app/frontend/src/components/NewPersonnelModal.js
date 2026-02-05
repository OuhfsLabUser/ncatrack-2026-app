// src/components/NewPersonnelModal.js
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
  List,
  ListItem,
  ListItemText
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { employeesApi } from "../services/api";
import { useCase } from "../context/CaseContext";

const NewPersonnelModal = ({ open, onClose, onSelectPersonnel }) => {
  const { currentCase } = useCase();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newPersonnel, setNewPersonnel] = useState({
    first_name: "",
    last_name: "",
    preface: "",
    credentials: "",
    job_title: "",
    email_addr: "",
    phone_number: ""
  });

  // Load employees when modal opens
  useEffect(() => {
    if (open) {
      loadEmployees();
      // Reset form
      setNewPersonnel({
        first_name: "",
        last_name: "",
        preface: "",
        credentials: "",
        job_title: "",
        email_addr: "",
        phone_number: ""
      });
      setError("");
    }
  }, [open]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeesApi.getAllEmployees();
      setEmployees(data);
    } catch (err) {
      console.error("Error loading employees:", err);
      setError("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleNewPersonnelChange = (e) => {
    const { name, value } = e.target;
    setNewPersonnel(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!newPersonnel.first_name.trim()) {
      setError("First Name is required");
      return;
    }

    if (!newPersonnel.last_name.trim()) {
      setError("Last Name is required");
      return;
    }

    if (!currentCase?.cac_id) {
      setError("No case selected. Please select a case first.");
      return;
    }

    // Get agency_id from referral source or use a default
    // If mh_referral_agency_id is not set, we need to get it from the selected agency in Referral Source
    // For now, we'll require the user to select an agency first, or use the first available agency
    let agencyId = currentCase.mh_referral_agency_id;
    if (!agencyId) {
      setError("Please select a Referral Source (agency) first before adding personnel.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      
      // Only include fields that exist in the schema
      const personnelData = {
        first_name: newPersonnel.first_name,
        last_name: newPersonnel.last_name,
        job_title: newPersonnel.job_title || null,
        email_addr: newPersonnel.email_addr || null,
        phone_number: newPersonnel.phone_number || null,
        agency_id: agencyId,
        cac_id: currentCase.cac_id
      };

      const createdEmployee = await employeesApi.createEmployee(personnelData);
      
      // Reload employees list
      await loadEmployees();
      
      // Select the newly created employee
      onSelectPersonnel(createdEmployee);
      onClose();
    } catch (err) {
      console.error("Error creating employee:", err);
      setError(err.message || "Failed to create personnel");
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
      PaperProps={{
        sx: {
          maxHeight: '90vh'
        }
      }}
      data-aoi="New Personnel Modal"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            New Personnel
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
        {/* Instructions */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2">
            Below is a list of existing personnel. If the desired person is on this list, do not add again. Instead click Cancel to return to the previous screen and select them from the person pick list.
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Existing Personnel List */}
        <Box sx={{ mb: 3, border: '1px solid #ddd', borderRadius: '4px', maxHeight: 200, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : employees.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', color: '#777' }}>
              No personnel available
            </Box>
          ) : (
            <List dense>
              {employees.map((employee) => (
                <ListItem key={employee.employee_id} sx={{ borderBottom: '1px solid #eee' }}>
                  <ListItemText primary={formatEmployeeName(employee)} />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {/* New Personnel Form */}
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* First Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left', color: '#d00' }}>
                First Name
              </Typography>
              <TextField
                name="first_name"
                value={newPersonnel.first_name}
                onChange={handleNewPersonnelChange}
                fullWidth
                required
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="First Name Input"
              />
            </Box>

            {/* Last Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left', color: '#d00' }}>
                Last Name
              </Typography>
              <TextField
                name="last_name"
                value={newPersonnel.last_name}
                onChange={handleNewPersonnelChange}
                fullWidth
                required
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Last Name Input"
              />
            </Box>

            {/* Preface */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Preface
              </Typography>
              <TextField
                name="preface"
                value={newPersonnel.preface}
                onChange={handleNewPersonnelChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Preface Input"
              />
            </Box>

            {/* Credentials */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Credentials
              </Typography>
              <TextField
                name="credentials"
                value={newPersonnel.credentials}
                onChange={handleNewPersonnelChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Credentials Input"
              />
            </Box>

            {/* Job Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Job Title
              </Typography>
              <TextField
                name="job_title"
                value={newPersonnel.job_title}
                onChange={handleNewPersonnelChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Job Title Input"
              />
            </Box>

            {/* Email */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Email
              </Typography>
              <TextField
                name="email_addr"
                value={newPersonnel.email_addr}
                onChange={handleNewPersonnelChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Email Input"
              />
            </Box>

            {/* Phone */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Phone
              </Typography>
              <TextField
                name="phone_number"
                value={newPersonnel.phone_number}
                onChange={handleNewPersonnelChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Phone Input"
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleCancel}
          color="error"
          variant="outlined"
          data-aoi="Cancel Button"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={saving}
          data-aoi="Save Button"
        >
          {saving ? <CircularProgress size={20} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewPersonnelModal;

