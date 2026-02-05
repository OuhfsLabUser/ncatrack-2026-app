// src/components/PointOfContactModal.js
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
  Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useCase } from "../context/CaseContext";

const PointOfContactModal = ({ open, onClose, onSave }) => {
  const { currentCase } = useCase();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    agency: "",
    name: "",
    phone: "",
    email: ""
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        agency: "",
        name: "",
        phone: "",
        email: ""
      });
      setError("");
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!currentCase?.case_id) {
      setError("No case selected. Please select a case first.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // TODO: Implement API call to save point of contact
      // For now, we'll just log the data
      const contactData = {
        case_id: currentCase.case_id,
        agency: formData.agency || null,
        name: formData.name || null,
        phone: formData.phone || null,
        email: formData.email || null
      };

      console.log("Point of Contact Data:", contactData);

      // If API is implemented, uncomment this:
      // const createdContact = await pointsOfContactApi.createContact(contactData);
      
      if (onSave) {
        onSave(contactData);
      }
      
      onClose();
    } catch (err) {
      console.error("Error creating point of contact:", err);
      setError(err.message || "Failed to create point of contact");
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
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh'
        }
      }}
      data-aoi="Point of Contact Modal"
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
          {/* Agency Field */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '120px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Agency
            </Typography>
            <TextField
              name="agency"
              value={formData.agency}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
              data-aoi="Agency Input"
            />
          </Box>

          {/* Name Field */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '120px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Name
            </Typography>
            <TextField
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
              data-aoi="Name Input"
            />
          </Box>

          {/* Phone Field */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '120px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Phone
            </Typography>
            <TextField
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
              data-aoi="Phone Input"
            />
          </Box>

          {/* Email Field */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '120px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Email
            </Typography>
            <TextField
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
              data-aoi="Email Input"
            />
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

export default PointOfContactModal;

