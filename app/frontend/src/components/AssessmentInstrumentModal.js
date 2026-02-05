// src/components/AssessmentInstrumentModal.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  TextField
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { mentalHealthApi } from "../services/api";

const AssessmentInstrumentModal = ({ open, onClose, onSelect }) => {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState({});
  const [measures, setMeasures] = useState({});
  const [loadingMeasures, setLoadingMeasures] = useState({});
  const [newInstrument, setNewInstrument] = useState(null); // { instrumentName: "", source: "NCA", measures: [] }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadInstruments();
      setSelectedInstrument(null);
      setSearchTerm("");
      setExpandedRows({});
      setMeasures({});
      setNewInstrument(null);
    }
  }, [open]);

  const loadInstruments = async () => {
    try {
      setLoading(true);
      const data = await mentalHealthApi.getAssessmentInstruments();
      setInstruments(data || []);
    } catch (err) {
      console.error("Error loading instruments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (instrument) => {
    setSelectedInstrument(instrument);
  };

  const handleUpdate = () => {
    if (selectedInstrument && onSelect) {
      onSelect(selectedInstrument);
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedInstrument(null);
    setSearchTerm("");
    if (onClose) {
      onClose();
    }
  };

  const handleAddNewInstrument = () => {
    setNewInstrument({
      instrumentName: "",
      source: "NCA",
      instrumentScores: "",
      measures: []
    });
    // Auto-expand the new instrument row
    setExpandedRows(prev => ({
      ...prev,
      'new': true
    }));
  };

  const toggleExpandNewInstrument = () => {
    setExpandedRows(prev => ({
      ...prev,
      'new': !prev['new']
    }));
  };

  const addNewMeasureRow = () => {
    setNewInstrument(prev => ({
      ...prev,
      measures: [...prev.measures, { name: "", description: "", isNew: true }]
    }));
  };

  const updateNewMeasure = (index, field, value) => {
    setNewInstrument(prev => ({
      ...prev,
      measures: prev.measures.map((m, i) => 
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  const removeNewMeasure = (index) => {
    setNewInstrument(prev => ({
      ...prev,
      measures: prev.measures.filter((_, i) => i !== index)
    }));
  };

  const cancelNewInstrument = () => {
    setNewInstrument(null);
    setExpandedRows(prev => {
      const newPrev = { ...prev };
      delete newPrev['new'];
      return newPrev;
    });
  };

  const saveNewInstrument = async () => {
    if (!newInstrument.instrumentName.trim()) {
      alert("Please enter an instrument name");
      return;
    }

    try {
      setSaving(true);
      
      // Create instrument
      const createdInstrument = await mentalHealthApi.createAssessmentInstrument({
        assessment_name: newInstrument.instrumentName,
        instrument_scores: newInstrument.instrumentScores || null
      });

      // Create measures
      if (newInstrument.measures.length > 0) {
        for (const measure of newInstrument.measures) {
          if (measure.name.trim()) {
            await mentalHealthApi.createMeasure(createdInstrument.instrument_id, {
              measure_name: measure.name,
              description: measure.description || measure.name,
              sequence: newInstrument.measures.indexOf(measure)
            });
          }
        }
      }

      // Refresh the table
      await loadInstruments();
      
      // Clear new instrument state
      setNewInstrument(null);
      setExpandedRows(prev => {
        const newPrev = { ...prev };
        delete newPrev['new'];
        return newPrev;
      });
    } catch (err) {
      console.error("Error saving new instrument:", err);
      alert("Failed to save instrument. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = async (instrumentId) => {
    const isExpanded = expandedRows[instrumentId];
    
    // Toggle expanded state
    setExpandedRows(prev => ({
      ...prev,
      [instrumentId]: !isExpanded
    }));

    // If expanding for the first time, load measures
    if (!isExpanded && !measures[instrumentId]) {
      try {
        setLoadingMeasures(prev => ({ ...prev, [instrumentId]: true }));
        const measuresData = await mentalHealthApi.getMeasuresByInstrumentId(instrumentId);
        setMeasures(prev => ({
          ...prev,
          [instrumentId]: measuresData || []
        }));
      } catch (err) {
        console.error(`Error loading measures for instrument ${instrumentId}:`, err);
        setMeasures(prev => ({
          ...prev,
          [instrumentId]: []
        }));
      } finally {
        setLoadingMeasures(prev => ({ ...prev, [instrumentId]: false }));
      }
    }
  };

  const filteredInstruments = instruments.filter(instrument => {
    if (!searchTerm) return true;
    const name = instrument.assessment_name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth={false}
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '500px',
          width: '600px',
          maxWidth: '90vw'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003C30' }}>
          Edit Assessment Instrument
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{ color: '#757575' }}
          data-aoi="Close Button"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddNewInstrument}
            sx={{
              color: '#757575',
              borderColor: '#757575',
              bgcolor: 'white',
              '&:hover': { borderColor: '#616161', bgcolor: 'rgba(117, 117, 117, 0.04)' }
            }}
            data-aoi="Add New Instrument Button"
          >
            Add New Instrument
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    bgcolor: '#f5f5f5', 
                    minWidth: 80, 
                    textAlign: 'left',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#f5f5f5'
                  }}>
                    Action
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    bgcolor: '#f5f5f5', 
                    textAlign: 'left',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#f5f5f5'
                  }}>
                    Assessment Instrument
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    bgcolor: '#f5f5f5', 
                    minWidth: 100, 
                    textAlign: 'left',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#f5f5f5'
                  }}>
                    Source
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    bgcolor: '#f5f5f5', 
                    minWidth: 120, 
                    textAlign: 'left',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#f5f5f5'
                  }}>
                    # of Measures
                    <ArrowDropDownIcon sx={{ fontSize: '14px', ml: 0.5, verticalAlign: 'middle' }} />
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    bgcolor: '#f5f5f5', 
                    minWidth: 150, 
                    textAlign: 'left',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#f5f5f5'
                  }}>
                    Instrument Scores
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* New Instrument Row - Display at the top */}
                {newInstrument && (
                  <React.Fragment>
                    <TableRow
                      sx={{
                        bgcolor: expandedRows['new'] ? '#e8e8e8' : '#ffffff',
                        '&:hover': {
                          bgcolor: expandedRows['new'] ? '#e0e0e0' : 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={toggleExpandNewInstrument}
                            sx={{
                              padding: '2px',
                              color: '#333',
                              minWidth: '24px',
                              width: '24px',
                              height: '24px',
                              mt: 0.5,
                              '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)'
                              }
                            }}
                          >
                            <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>
                              {expandedRows['new'] ? '▾' : '▸'}
                            </Typography>
                          </IconButton>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={saveNewInstrument}
                              disabled={saving || !newInstrument.instrumentName.trim()}
                              sx={{
                                minWidth: '70px',
                                height: '28px',
                                fontSize: '11px',
                                bgcolor: '#01665e',
                                color: 'white',
                                '&:hover': { bgcolor: '#003C30' },
                                '&:disabled': { bgcolor: '#cccccc', color: '#999999' }
                              }}
                              startIcon={<CheckCircleIcon sx={{ fontSize: '16px' }} />}
                            >
                              Update
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={cancelNewInstrument}
                              disabled={saving}
                              sx={{
                                minWidth: '70px',
                                height: '28px',
                                fontSize: '11px',
                                color: '#757575',
                                borderColor: '#757575',
                                bgcolor: 'white',
                                '&:hover': { borderColor: '#616161', bgcolor: 'rgba(117, 117, 117, 0.04)' }
                              }}
                              startIcon={<CancelIcon sx={{ fontSize: '16px' }} />}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={newInstrument.instrumentName}
                          onChange={(e) => setNewInstrument(prev => ({ ...prev, instrumentName: e.target.value }))}
                          placeholder="Enter instrument name"
                          variant="outlined"
                          sx={{ 
                            width: '100%',
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#01665e'
                              },
                              '&:hover fieldset': {
                                borderColor: '#01665e'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#01665e'
                              }
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#333', pt: 1 }}>
                          {newInstrument.source}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#333', pt: 1 }}>
                          {newInstrument.measures.length}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={newInstrument.instrumentScores || ""}
                          onChange={(e) => setNewInstrument(prev => ({ ...prev, instrumentScores: e.target.value }))}
                          placeholder="Enter instrument scores"
                          variant="outlined"
                          sx={{ 
                            width: '100%',
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#01665e'
                              },
                              '&:hover fieldset': {
                                borderColor: '#01665e'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#01665e'
                              }
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    </TableRow>
                    {expandedRows['new'] && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ padding: 0, bgcolor: '#fafafa', borderTop: 'none' }}>
                          <Box sx={{ paddingLeft: '60px', paddingRight: '20px', paddingY: 1 }}>
                            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'flex-start' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={addNewMeasureRow}
                                sx={{
                                  color: '#757575',
                                  borderColor: '#757575',
                                  bgcolor: 'white',
                                  '&:hover': { borderColor: '#616161', bgcolor: 'rgba(117, 117, 117, 0.04)' }
                                }}
                              >
                                Add New Measure
                              </Button>
                            </Box>
                            {newInstrument.measures.length > 0 ? (
                              <Table size="small" sx={{ width: '100%' }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ 
                                      fontWeight: 'bold', 
                                      bgcolor: '#f0f0f0', 
                                      borderBottom: '1px solid #e0e0e0'
                                    }}>
                                      Action
                                    </TableCell>
                                    <TableCell sx={{ 
                                      fontWeight: 'bold', 
                                      bgcolor: '#f0f0f0', 
                                      borderBottom: '1px solid #e0e0e0'
                                    }}>
                                      Measure
                                    </TableCell>
                                    <TableCell sx={{ 
                                      fontWeight: 'bold', 
                                      bgcolor: '#f0f0f0',
                                      borderBottom: '1px solid #e0e0e0'
                                    }}>
                                      Description
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {newInstrument.measures.map((measure, measureIndex) => (
                                    <TableRow
                                      key={measureIndex}
                                      sx={{
                                        bgcolor: measureIndex % 2 === 0 ? '#ffffff' : '#fafafa',
                                        '&:hover': {
                                          bgcolor: 'rgba(0, 0, 0, 0.02)'
                                        }
                                      }}
                                    >
                                      <TableCell>
                                        <IconButton
                                          size="small"
                                          onClick={() => removeNewMeasure(measureIndex)}
                                          sx={{
                                            padding: '2px',
                                            color: '#d32f2f',
                                            '&:hover': {
                                              bgcolor: 'rgba(211, 47, 47, 0.04)'
                                            }
                                          }}
                                        >
                                          <CancelIcon sx={{ fontSize: '16px' }} />
                                        </IconButton>
                                      </TableCell>
                                      <TableCell>
                                        <TextField
                                          size="small"
                                          value={measure.name || ""}
                                          onChange={(e) => updateNewMeasure(measureIndex, 'name', e.target.value)}
                                          placeholder="Enter measure name"
                                          variant="outlined"
                                          sx={{ 
                                            width: '100%',
                                            '& .MuiOutlinedInput-root': {
                                              '& fieldset': {
                                                borderColor: '#01665e'
                                              },
                                              '&:hover fieldset': {
                                                borderColor: '#01665e'
                                              },
                                              '&.Mui-focused fieldset': {
                                                borderColor: '#01665e'
                                              }
                                            }
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <TextField
                                          size="small"
                                          value={measure.description || ""}
                                          onChange={(e) => updateNewMeasure(measureIndex, 'description', e.target.value)}
                                          placeholder="Enter description"
                                          variant="outlined"
                                          sx={{ 
                                            width: '100%',
                                            '& .MuiOutlinedInput-root': {
                                              '& fieldset': {
                                                borderColor: '#01665e'
                                              },
                                              '&:hover fieldset': {
                                                borderColor: '#01665e'
                                              },
                                              '&.Mui-focused fieldset': {
                                                borderColor: '#01665e'
                                              }
                                            }
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <Box sx={{ padding: 2, color: 'text.secondary' }}>
                                <Typography variant="body2">No measures added yet. Click "Add New Measure" to add one.</Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )}
                {filteredInstruments.length === 0 && !newInstrument ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No instruments found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInstruments.map((instrument, index) => {
                    const isExpanded = expandedRows[instrument.instrument_id];
                    const instrumentMeasures = measures[instrument.instrument_id] || [];
                    const isLoadingMeasures = loadingMeasures[instrument.instrument_id];
                    const isSelected = selectedInstrument?.instrument_id === instrument.instrument_id;
                    // Use actual loaded measures count if available and greater than 0, otherwise use API count
                    // This ensures we always show the correct count, even if API count was initially 0
                    const actualMeasureCount = instrumentMeasures.length > 0 
                      ? instrumentMeasures.length 
                      : (instrument.measure_count !== undefined && instrument.measure_count !== null 
                          ? instrument.measure_count 
                          : 0);
                    
                    return (
                      <React.Fragment key={instrument.instrument_id}>
                        <TableRow
                          hover
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isExpanded ? '#e8e8e8' : (index % 2 === 0 ? '#ffffff' : '#f5f5f5'),
                            '&:hover': {
                              bgcolor: isExpanded ? '#e0e0e0' : 'rgba(0, 0, 0, 0.04)'
                            }
                          }}
                          onClick={() => handleSelect(instrument)}
                        >
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(instrument.instrument_id);
                              }}
                              sx={{
                                padding: '2px',
                                color: '#333',
                                minWidth: '24px',
                                width: '24px',
                                height: '24px',
                                '&:hover': {
                                  bgcolor: 'rgba(0, 0, 0, 0.04)'
                                }
                              }}
                            >
                              <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>
                                {isExpanded ? '▾' : '▸'}
                              </Typography>
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#333' }}>
                              {instrument.assessment_name || `Instrument ${instrument.instrument_id}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#333' }}>
                              {instrument.source || 'NCA'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#333' }}>
                              {actualMeasureCount}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#333' }}>
                              {instrument.instrument_scores || '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ padding: 0, bgcolor: '#fafafa', borderTop: 'none' }}>
                              {isLoadingMeasures ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                  <CircularProgress size={20} />
                                </Box>
                              ) : instrumentMeasures.length > 0 ? (
                                <Box sx={{ paddingLeft: '60px', paddingRight: '20px', paddingY: 1 }}>
                                  <Table size="small" sx={{ width: '100%' }}>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ 
                                          fontWeight: 'bold', 
                                          bgcolor: '#f0f0f0', 
                                          borderBottom: '1px solid #e0e0e0'
                                        }}>
                                          Measure
                                        </TableCell>
                                        <TableCell sx={{ 
                                          fontWeight: 'bold', 
                                          bgcolor: '#f0f0f0',
                                          borderBottom: '1px solid #e0e0e0'
                                        }}>
                                          Description
                                        </TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {instrumentMeasures.map((measure, measureIndex) => (
                                        <TableRow
                                          key={measure.measure_id || measure.id}
                                          sx={{
                                            bgcolor: measureIndex % 2 === 0 ? '#ffffff' : '#fafafa',
                                            '&:hover': {
                                              bgcolor: 'rgba(0, 0, 0, 0.02)'
                                            }
                                          }}
                                        >
                                          <TableCell sx={{ color: '#333' }}>
                                            <Typography variant="body2">
                                              {measure.measure_name || measure.name || `Measure ${measure.measure_id || measure.id}`}
                                              {measure.measure_name && measure.measure_name.includes('(T-SCORE)') ? '' : ' (T-SCORE)'}
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ color: '#333' }}>
                                            <Typography variant="body2">
                                              {measure.description || measure.measure_name || measure.name || `Description for ${measure.measure_id || measure.id}`}
                                              {measure.description && measure.description.includes('(T-SCORE)') ? '' : ' (T-SCORE)'}
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              ) : (
                                <Box sx={{ padding: 2, paddingLeft: '60px', color: 'text.secondary' }}>
                                  <Typography variant="body2">No measures available</Typography>
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'flex-end', borderTop: '1px solid #e0e0e0' }}>
        <Button
          onClick={handleUpdate}
          variant="contained"
          sx={{
            bgcolor: '#01665e',
            color: 'white',
            '&:hover': { bgcolor: '#003C30' }
          }}
          startIcon={<CheckCircleIcon />}
          disabled={!selectedInstrument}
          data-aoi="Update Button"
        >
          Update
        </Button>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            color: '#757575',
            borderColor: '#757575',
            bgcolor: 'white',
            '&:hover': { borderColor: '#616161', bgcolor: 'rgba(117, 117, 117, 0.04)' }
          }}
          startIcon={<CancelIcon />}
          data-aoi="Cancel Button"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssessmentInstrumentModal;

