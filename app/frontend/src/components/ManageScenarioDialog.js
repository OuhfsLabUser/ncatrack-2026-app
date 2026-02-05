import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  TextField
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

const ManageScenarioDialog = ({ open, onClose, onDelete, onUpdate }) => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (open) {
      fetchScenarios();
    } else {
      // Reset state when dialog closes
      setScenarios([]);
      setError(null);
      setEditingId(null);
      setEditName('');
      setEditDescription('');
    }
  }, [open]);

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/api/scenarios/list');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch scenarios: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      setError(error.message || 'Failed to load scenarios. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (scenario) => {
    setEditingId(scenario.name);
    setEditName(scenario.name);
    setEditDescription(scenario.description || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const handleSave = async (originalName) => {
    if (!editName.trim()) {
      setError('Please enter a scenario name.');
      return;
    }

    // Validate scenario name (no special characters except underscore and hyphen)
    const validName = /^[a-zA-Z0-9_-]+$/.test(editName.trim());
    if (!validName) {
      setError('Scenario name can only contain letters, numbers, underscores, and hyphens.');
      return;
    }

    try {
      setError(null);
      await onUpdate(originalName, editName.trim(), editDescription.trim());
      setEditingId(null);
      setEditName('');
      setEditDescription('');
      // Refresh the list
      await fetchScenarios();
    } catch (error) {
      setError(error.message || 'Failed to update scenario.');
    }
  };

  const handleDelete = async (scenarioName) => {
    if (window.confirm(`Are you sure you want to delete scenario "${scenarioName}"? This action cannot be undone.`)) {
      try {
        setError(null);
        setLoading(true);
        await onDelete(scenarioName);
        // Refresh the list
        await fetchScenarios();
      } catch (error) {
        console.error('Delete error:', error);
        setError(error.message || 'Failed to delete scenario.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="manage-scenario-dialog-title"
      maxWidth="md"
      fullWidth
    >
      <DialogTitle id="manage-scenario-dialog-title">
        Manage Scenarios
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <span>Loading scenarios...</span>
          </Box>
        ) : error && !scenarios.length ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : scenarios.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No scenarios available.
          </Alert>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table sx={{ border: '1px solid #e0e0e0', borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid #e0e0e0' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scenarios.map((scenario) => (
                  <TableRow key={scenario.name}>
                    {editingId === scenario.name ? (
                      <>
                        <TableCell sx={{ border: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            error={!editName.trim()}
                            helperText={!editName.trim() ? 'Name is required' : ''}
                          />
                        </TableCell>
                        <TableCell sx={{ border: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>
                          <TextField
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </TableCell>
                        <TableCell sx={{ border: '1px solid #e0e0e0' }}>
                          <IconButton
                            color="primary"
                            onClick={() => handleSave(scenario.name)}
                            disabled={!editName.trim()}
                            size="small"
                            title="Save"
                          >
                            <SaveIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={handleCancelEdit}
                            size="small"
                            title="Cancel"
                          >
                            <CancelIcon />
                          </IconButton>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell sx={{ border: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>{scenario.name}</TableCell>
                        <TableCell sx={{ border: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>{scenario.description || 'No description'}</TableCell>
                        <TableCell sx={{ border: '1px solid #e0e0e0' }}>
                          <IconButton
                            color="primary"
                            onClick={() => handleEdit(scenario)}
                            size="small"
                            title="Edit"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(scenario.name)}
                            size="small"
                            title="Delete"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {error && scenarios.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          sx={{
            backgroundColor: '#d32f2f',
            color: 'white',
            '&:hover': {
              backgroundColor: '#b71c1c',
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageScenarioDialog;

