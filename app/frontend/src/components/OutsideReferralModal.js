// src/components/OutsideReferralModal.js
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
  InputAdornment
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useCase } from "../context/CaseContext";

const OutsideReferralModal = ({ open, onClose, onSave }) => {
  const { currentCase } = useCase();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [commentRows, setCommentRows] = useState(1);
  
  const [formData, setFormData] = useState({
    referral_date: "",
    referred_to: "",
    comment: ""
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        referral_date: "",
        referred_to: "",
        comment: ""
      });
      setCommentRows(1);
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

  const handleIncreaseComment = () => {
    setCommentRows(prev => Math.min(prev + 1, 10)); // Max 10 rows
  };

  const handleDecreaseComment = () => {
    setCommentRows(prev => Math.max(prev - 1, 1)); // Min 1 row
  };

  const handleSave = async () => {
    if (!currentCase?.case_id) {
      setError("No case selected. Please select a case first.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // TODO: Implement API call to save outside referral
      // For now, we'll just log the data
      const referralData = {
        case_id: currentCase.case_id,
        referral_date: formData.referral_date || null,
        referred_to: formData.referred_to || null,
        comment: formData.comment || null
      };

      console.log("Outside Referral Data:", referralData);

      // If API is implemented, uncomment this:
      // const createdReferral = await outsideReferralsApi.createReferral(referralData);
      
      if (onSave) {
        onSave(referralData);
      }
      
      onClose();
    } catch (err) {
      console.error("Error creating outside referral:", err);
      setError(err.message || "Failed to create outside referral");
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
      data-aoi="Outside Referral Modal"
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
          {/* Date Field */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '120px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Date
            </Typography>
            <TextField
              name="referral_date"
              type="date"
              value={formData.referral_date}
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
                        // Trigger date picker
                        const input = document.querySelector('input[name="referral_date"]');
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

          {/* Referred To Field */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ width: '120px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>
              Referred To
            </Typography>
            <TextField
              name="referred_to"
              value={formData.referred_to}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      size="small"
                      data-aoi="Referred To Dropdown Button"
                    >
                      <ArrowDropDownIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              data-aoi="Referred To Input"
            />
          </Box>

          {/* Comment Field */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Typography sx={{ width: '120px', fontWeight: 'bold', textAlign: 'right', flexShrink: 0, pt: 1 }}>
              Comment
            </Typography>
            <Box sx={{ display: 'flex', flex: 1, gap: 0.5 }}>
              <TextField
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                fullWidth
                multiline
                rows={commentRows}
                variant="outlined"
                size="small"
                data-aoi="Comment Input"
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={handleIncreaseComment}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px' // Square corners instead of circular
                  }}
                  data-aoi="Increase Comment Rows Button"
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleDecreaseComment}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px' // Square corners instead of circular
                  }}
                  data-aoi="Decrease Comment Rows Button"
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
              </Box>
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

export default OutsideReferralModal;

