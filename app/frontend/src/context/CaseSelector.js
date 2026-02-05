import React, { useState } from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Box, 
  CircularProgress, 
  Typography,
  TextField,
  IconButton,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useCase } from './CaseContext';
import { useNavigate, useLocation } from 'react-router-dom';

// Case selector component
const CaseSelector = () => {
  const { currentCase, setCurrentCase, cases, loading, error } = useCase();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchCaseText, setSearchCaseText] = useState('');
  
  const handleChange = (event) => {
    const selectedCaseId = event.target.value;
    
    // Check if the selected option is "Create New Case(s)"
    if (selectedCaseId === 'create-new') {
      // Always navigate with showLookup flag, even if already on /NewCase page
      // This ensures the lookup modal opens every time "Create new cases" is clicked
      navigate('/NewCase', {
        state: { 
          showLookup: true,
          timestamp: Date.now() // Add timestamp to ensure state changes on each click
        },
        replace: location.pathname === '/NewCase' // Replace if already on the page
      });
    } 
    // Check if the selected option is "Search Case"
    else if (selectedCaseId === 'search-case') {
      // Only select the Search Case item in dropdown, don't navigate immediately;
      // Actual navigation is triggered by the magnifying glass button on the right side of the input
      return;
    } 
    else {
      // Find the selected case
      const selectedCase = cases.find(c => c.id === selectedCaseId);
      setCurrentCase(selectedCaseId);

      // Debug logging
      console.log('Selected case:', selectedCase);

      // Navigate to CaseGeneral page
      console.log('Navigating to CaseGeneral with caseId:', selectedCase.id);
      navigate('/CaseGeneral');
    }
  };
  
  return (
    <Box sx={{ minWidth: 250, mr: 2 }}>
      <FormControl fullWidth size="small" variant="outlined">
        <InputLabel id="case-selector-label" sx={{ color: 'white' }}>Current Case</InputLabel>
        <Select
          labelId="case-selector-label"
          id="case-selector"
          value={currentCase}
          label="Current Case"
          onChange={handleChange}
          disabled={loading}
          onKeyDown={(e) => {
            // If "Search Case" item is currently selected, prevent Select's default keyboard navigation behavior
            // This allows users to type freely in the input without triggering auto-highlight
            if (currentCase === 'search-case') {
              e.stopPropagation();
            }
          }}
        >
          {loading ? (
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography>Loading cases...</Typography>
              </Box>
            </MenuItem>
          ) : error ? (
            <MenuItem disabled>
              <Typography color="error">Error loading cases</Typography>
            </MenuItem>
          ) : (
            cases.map(caseItem => {
              // Special handling for Search Case item: display as input + magnifying glass button
              if (caseItem.id === 'search-case') {
                return (
                  <MenuItem 
                    key={caseItem.id} 
                    value={caseItem.id}
                    sx={{ fontWeight: 'bold' }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search Case"
                      value={searchCaseText}
                      // Prevent event bubbling to MenuItem/Select, otherwise input will lose focus immediately
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => setSearchCaseText(e.target.value)}
                      onKeyDown={(e) => {
                        // Prevent keyboard events from bubbling to Select component, prevent auto-highlighting matches
                        e.stopPropagation();
                        // Allow Enter key to trigger search
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          navigate('/SearchCase', {
                            state: { 
                              initialQuery: searchCaseText.trim() || '',
                              searchMode: 'cases' // Default to Search Cases mode
                            }
                          });
                        }
                      }}
                      onFocus={(e) => {
                        // When input gains focus, prevent Select's keyboard navigation
                        e.stopPropagation();
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/SearchCase', {
                                  state: { 
                                    initialQuery: searchCaseText.trim() || '',
                                    searchMode: 'cases' // Default to Search Cases mode
                                  }
                                });
                              }}
                            >
                              <SearchIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </MenuItem>
                );
              }

              return (
                <MenuItem 
                  key={caseItem.id} 
                  value={caseItem.id}
                  sx={caseItem.isAction ? { fontWeight: 'bold' } : {}}
                >
                  {caseItem.isAction ? caseItem.name : (
                    <Box>
                      <Typography component="span" sx={{ fontWeight: 'medium' }}>
                        {caseItem.name}
                      </Typography>
                      <Typography component="span" sx={{ ml: 1, fontSize: '0.9em' }}>
                        {caseItem.number}
                      </Typography>
                    </Box>
                  )}
                </MenuItem>
              );
            })
          )}
        </Select>
      </FormControl>
    </Box>
  );
};

export default CaseSelector;