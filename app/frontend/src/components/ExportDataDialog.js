import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';

const ExportDataDialog = ({ open, onClose, onExport }) => {
  const [fileName, setFileName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    if (!fileName.trim()) {
      setError('Please enter an export name');
      return;
    }

    // Validate filename (no special characters except underscore and hyphen)
    const validFileName = /^[a-zA-Z0-9_-]+$/.test(fileName.trim());
    if (!validFileName) {
      setError('Export name can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      await onExport(fileName.trim());
      // Reset state on success
      setFileName('');
      setIsExporting(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Export failed. Please try again.');
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setFileName('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="export-dialog-title"
      aria-describedby="export-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="export-dialog-title">
        Export Data
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="export-dialog-description" sx={{ mb: 2 }}>
          Enter an export name. All database tables will be exported as CSV files and packaged as a ZIP file.
        </DialogContentText>
        
        <Box sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Export Name"
            type="text"
            fullWidth
            variant="outlined"
            value={fileName}
            onChange={(e) => {
              setFileName(e.target.value);
              setError(null);
            }}
            placeholder="e.g., export_2024_01_15"
            disabled={isExporting}
            error={!!error}
            helperText={error || 'The export name will be used for the generated ZIP filename'}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isExporting && fileName.trim()) {
                handleExport();
              }
            }}
          />
        </Box>

        {isExporting && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <CircularProgress size={20} />
            <DialogContentText>
              Exporting data, please wait...
            </DialogContentText>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose} 
          sx={{
            backgroundColor: '#d32f2f',
            color: 'white',
            '&:hover': {
              backgroundColor: '#b71c1c',
            }
          }}
          disabled={isExporting}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleExport} 
          color="primary" 
          variant="contained"
          disabled={isExporting || !fileName.trim()}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDataDialog;

