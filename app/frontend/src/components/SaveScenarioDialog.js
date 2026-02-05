import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material';

const SaveScenarioDialog = ({ open, onClose, onSave }) => {
  const [scenarioName, setScenarioName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);

  const handleSave = () => {
    if (!scenarioName.trim()) {
      setError('Please enter a scenario name.');
      return;
    }

    // Validate scenario name (no special characters except underscore and hyphen)
    const validName = /^[a-zA-Z0-9_-]+$/.test(scenarioName.trim());
    if (!validName) {
      setError('Scenario name can only contain letters, numbers, underscores, and hyphens.');
      return;
    }

    setError(null);
    onSave(scenarioName.trim(), description.trim());
    // Reset state on success
    setScenarioName('');
    setDescription('');
    onClose();
  };

  const handleClose = () => {
    setScenarioName('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="save-scenario-dialog-title"
      aria-describedby="save-scenario-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="save-scenario-dialog-title">
        Save Scenario
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="save-scenario-dialog-description" sx={{ mb: 2 }}>
          Enter a name for the scenario. The current database state will be saved as a scenario.
        </DialogContentText>
        
        <Box sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Scenario Name"
            type="text"
            fullWidth
            variant="outlined"
            value={scenarioName}
            onChange={(e) => {
              setScenarioName(e.target.value);
              setError(null);
            }}
            placeholder="e.g., scenario_2024_01_15"
            error={!!error}
            helperText={error || 'The scenario name will be used to create a scenario directory'}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && scenarioName.trim() && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            placeholder="Enter a brief description for this scenario (optional)"
            helperText="A description helps identify the scenario's purpose or contents"
          />
        </Box>
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
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
          disabled={!scenarioName.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveScenarioDialog;

