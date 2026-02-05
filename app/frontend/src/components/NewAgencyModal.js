// src/components/NewAgencyModal.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  CircularProgress,
  Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { agenciesApi } from "../services/api";
import { useCase } from "../context/CaseContext";

const NewAgencyModal = ({ open, onClose, onSelectAgency }) => {
  const { currentCase } = useCase();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newAgency, setNewAgency] = useState({
    agency_name: "",
    addr_line_1: "",
    addr_line_2: "",
    city: "",
    state_abbr: "",
    zip_code: "",
    phone_number: ""
  });
  const [states, setStates] = useState([]);

  // Load agencies and states when modal opens
  useEffect(() => {
    if (open) {
      loadAgencies();
      loadStates();
      // Reset form
      setNewAgency({
        agency_name: "",
        addr_line_1: "",
        addr_line_2: "",
        city: "",
        state_abbr: "",
        zip_code: "",
        phone_number: ""
      });
      setError("");
    }
  }, [open]);

  const loadAgencies = async () => {
    try {
      setLoading(true);
      const data = await agenciesApi.getAllAgencies();
      setAgencies(data);
    } catch (err) {
      console.error("Error loading agencies:", err);
      setError("Failed to load agencies");
    } finally {
      setLoading(false);
    }
  };

  const loadStates = async () => {
    try {
      const data = await agenciesApi.getAllStates();
      setStates(data);
    } catch (err) {
      console.error("Error loading states:", err);
    }
  };


  const handleUseAgency = (agency) => {
    onSelectAgency(agency);
    onClose();
  };

  const handleNewAgencyChange = (e) => {
    const { name, value } = e.target;
    setNewAgency(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!newAgency.agency_name.trim()) {
      setError("Agency Name is required");
      return;
    }

    if (!currentCase?.cac_id) {
      setError("No case selected. Please select a case first.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      
      const agencyData = {
        ...newAgency,
        cac_id: currentCase.cac_id
      };

      const createdAgency = await agenciesApi.createAgency(agencyData);
      
      // Reload agencies list
      await loadAgencies();
      
      // Select the newly created agency
      onSelectAgency(createdAgency);
      onClose();
    } catch (err) {
      console.error("Error creating agency:", err);
      setError(err.message || "Failed to create agency");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
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
      data-aoi="New Agency Modal"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            New Agency
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
          <Typography variant="body2" sx={{ mb: 1 }}>
            Below is a list of existing agencies.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            If the desired agency is on this list then click "Use Agency".
          </Typography>
          <Typography variant="body2">
            If the agency is not on the list enter the agency name below and click "Save".
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Existing Agencies Table */}
        <Box sx={{ mb: 3 }}>
          <TableContainer 
            component={Paper} 
            sx={{ maxHeight: 300, border: '1px solid #ddd' }}
            data-aoi="Agencies Table Container"
          >
            <Table stickyHeader size="small" data-aoi="Agencies Table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    Agency
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : agencies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      No agencies available
                    </TableCell>
                  </TableRow>
                ) : (
                  agencies.map((agency) => (
                    <TableRow key={agency.agency_id} hover>
                      <TableCell>{agency.agency_name || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          variant="text"
                          color="primary"
                          size="small"
                          onClick={() => handleUseAgency(agency)}
                          data-aoi={`Use Agency Button ${agency.agency_id}`}
                        >
                          Use Agency
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* New Agency Form */}
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Agency Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Agency Name
              </Typography>
              <TextField
                name="agency_name"
                value={newAgency.agency_name}
                onChange={handleNewAgencyChange}
                fullWidth
                required
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Agency Name Input"
              />
            </Box>

            {/* Street Address */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Street Address
              </Typography>
              <TextField
                name="addr_line_1"
                value={newAgency.addr_line_1}
                onChange={handleNewAgencyChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Street Address Input"
              />
            </Box>

            {/* Address Line 2 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Address Line 2
              </Typography>
              <TextField
                name="addr_line_2"
                value={newAgency.addr_line_2}
                onChange={handleNewAgencyChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Address Line 2 Input"
              />
            </Box>

            {/* City */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                City
              </Typography>
              <TextField
                name="city"
                value={newAgency.city}
                onChange={handleNewAgencyChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="City Input"
              />
            </Box>

            {/* State */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                State
              </Typography>
              <FormControl fullWidth sx={{ flex: 1 }} size="small">
                <Select
                  name="state_abbr"
                  value={newAgency.state_abbr}
                  onChange={handleNewAgencyChange}
                  displayEmpty
                  variant="outlined"
                  data-aoi="State Select"
                  sx={{ textAlign: 'left' }}
                >
                  <MenuItem value="">
                    <em>- Please select a state -</em>
                  </MenuItem>
                  {states.map((state) => (
                    <MenuItem key={state.state_abbr} value={state.state_abbr}>
                      {state.state_name || state.state_abbr}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Zip Code */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Zip Code
              </Typography>
              <TextField
                name="zip_code"
                value={newAgency.zip_code}
                onChange={handleNewAgencyChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Zip Code Input"
              />
            </Box>

            {/* Phone Number */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ width: '150px', fontWeight: 'bold', textAlign: 'left' }}>
                Phone Number
              </Typography>
              <TextField
                name="phone_number"
                value={newAgency.phone_number}
                onChange={handleNewAgencyChange}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                data-aoi="Phone Number Input"
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

export default NewAgencyModal;

