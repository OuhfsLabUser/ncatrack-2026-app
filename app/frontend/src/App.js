// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate} from 'react-router-dom';
import AOIEventViewer from './AOIEventViewer';
import AOITracker from './AOITracker';               // ← NEW
//import GeneralTab from './components/GeneralTab';  
import MHBasicInterface from './components/MHBasicInterface';  
import PeopleInterface from './components/PeopleInterface';  
import CaseGeneral from './components/CaseGeneral'; 
import CaseInfo from './components/CaseInfo'; 
import MHCaseNotes from './components/MHCaseNotes';  
import AssessmentInterface from './components/AssessmentInterface';
import MHTreatmentPlan from './components/MHTreatmentPlan';  
import VALogInterface from './components/VALogInterface';  
import MHAssessment from './components/MHAssessment';  
import Lookup from './components/Lookup';  
import MHSection from './components/MHSection';
import NewCase from './components/NewCase';
import PersonBio from './components/PersonBio';
import PersonCases from './components/PersonCases';
import AddNewPerson from './components/AddNewPerson'; 
import AdminDashboard from './components/admin/AdminDashboard';
import AdminPlaceholder from './components/admin/AdminPlaceholder';
import PickLists from './components/admin/PickLists';
import SearchPerson from './components/SearchPerson';
import CasePersonList from './components/CasePersonList';
import OtherPeople from './components/OtherPeople';
import CaseCreationSummary from './components/CaseCreationSummary';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container, 
  Box, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Menu,
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CaseSelector from './context/CaseSelector';
import { CaseProvider, useCase } from './context/CaseContext';
import ExportDataDialog from './components/ExportDataDialog';
import SaveScenarioDialog from './components/SaveScenarioDialog';
import ManageScenarioDialog from './components/ManageScenarioDialog';

const AppLayout = () => {
  const location = useLocation();
  const isNewCasePage = location.pathname === '/NewCase';
  const isSearchPage = location.pathname === '/SearchCase';
  const isAdminPage = location.pathname.startsWith('/admin');
  const isCasePersonListPage = location.pathname === '/CasePersonList';
  const isCaseCreationSummaryPage = location.pathname === '/CaseCreationSummary' || location.pathname.startsWith('/case-summary/');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 从 localStorage 恢复录制状态，使刷新后录制会话不被中断
  const [isTracking, setIsTracking] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('aoi_is_recording') === 'true'
  );
  const [scenarioMenuAnchor, setScenarioMenuAnchor] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [saveScenarioDialogOpen, setSaveScenarioDialogOpen] = useState(false);
  const [manageScenarioDialogOpen, setManageScenarioDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Navigation links
  const navLinks = [
    { title: "General", path: "/CaseGeneral" },
    { title: "People", path: "/CasePeople" },
    { title: "MDT", path: "/CaseMDT" },
    { title: "Presenting", path: "/CasePresenting" },
    { title: "CPS", path: "/CaseCPS" },
    { title: "LE", path: "/CaseLE" },
    { title: "Medical", path: "/CaseMedical" },
    { title: "FI", path: "/CaseFI" },
    { title: "MH", path: "/CaseMH" },
    { title: "VA", path: "/CaseVA" },
    { title: "Prosecution", path: "/CaseProsecution" },
    { title: "Report", path: "/CaseReport" },
    { title: "Case Attachments", path: "/CaseAttachments" },
    { title: "Admin", path: "/admin" } // Added Admin link
  ];

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleScenarioMenuOpen = (event) => {
    setScenarioMenuAnchor(event.currentTarget);
  };

  const handleScenarioMenuClose = () => {
    setScenarioMenuAnchor(null);
  };

  const handleExportData = () => {
    handleScenarioMenuClose();
    setExportDialogOpen(true);
  };

  const handleExport = async (fileName) => {
    try {
      // Get current session ID from window (set by AOITracker)
      const currentSessionId = window.AOI_CURRENT_SESSION_ID || null;
      
      const exportUrl = new URL('http://localhost:5000/api/export/data');
      exportUrl.searchParams.append('filename', fileName);
      if (currentSessionId) {
        exportUrl.searchParams.append('session_id', currentSessionId);
      }
      
      const response = await fetch(exportUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check content type to determine if it's JSON (error) or binary (ZIP file)
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        // Try to parse as JSON, but handle HTML error pages gracefully
        let errorMessage = 'Export failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If response is not JSON (e.g., HTML error page), use status text
          try {
            const text = await response.text();
            errorMessage = `Export failed: ${response.status} ${response.statusText}`;
            console.error('Non-JSON error response:', text.substring(0, 200));
          } catch (textError) {
            // If we can't read text either, just use status
            errorMessage = `Export failed: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Get the blob first - we can only read the response body once
      const blob = await response.blob();
      
      // Verify it's actually a ZIP file by checking the blob size
      if (blob.size === 0) {
        throw new Error('Export failed: Server returned an empty file');
      }
      
      // Check if blob looks like a ZIP file (ZIP files start with PK\x03\x04)
      const firstBytes = await blob.slice(0, 4).arrayBuffer();
      const zipSignature = new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // PK\x03\x04
      const receivedBytes = new Uint8Array(firstBytes);
      const isZipFile = receivedBytes.length === 4 && 
        receivedBytes[0] === zipSignature[0] && 
        receivedBytes[1] === zipSignature[1] &&
        receivedBytes[2] === zipSignature[2] &&
        receivedBytes[3] === zipSignature[3];
      
      if (!isZipFile) {
        // If it's not a ZIP file, try to read as text to get error message
        const text = await blob.text();
        let errorMessage = 'Export failed: Server returned an unexpected response format';
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Unexpected response format:', text.substring(0, 200));
          errorMessage = `Export failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSnackbar({
        open: true,
        message: 'Data exported successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Export failed, please try again',
        severity: 'error'
      });
      throw error;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSaveScenario = () => {
    handleScenarioMenuClose();
    setSaveScenarioDialogOpen(true);
  };

  const handleSaveScenarioConfirm = async (scenarioName, description) => {
    try {
      const response = await fetch('http://localhost:5000/api/scenarios/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioName: scenarioName,
          description: description || '' // Optional description
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save scenario');
      }

      const data = await response.json();
      
      setSnackbar({
        open: true,
        message: data.message || `Scenario '${scenarioName}' saved successfully.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Save scenario error:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to save scenario. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleManageScenario = () => {
    handleScenarioMenuClose();
    setManageScenarioDialogOpen(true);
  };

  const handleDeleteScenario = async (scenarioName) => {
    try {
      const response = await fetch(`http://localhost:5000/api/scenarios/delete/${encodeURIComponent(scenarioName)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete scenario');
        } else {
          // If not JSON, read as text
          const text = await response.text();
          throw new Error(`Failed to delete scenario: ${response.status} ${response.statusText}`);
        }
      }

      // Parse response as JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setSnackbar({
          open: true,
          message: data.message || `Scenario '${scenarioName}' deleted successfully.`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Scenario '${scenarioName}' deleted successfully.`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Delete scenario error:', error);
      throw error; // Re-throw to let the dialog handle it
    }
  };

  const handleUpdateScenario = async (originalName, newName, description) => {
    try {
      const response = await fetch('http://localhost:5000/api/scenarios/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalName: originalName,
          newName: newName,
          description: description || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update scenario');
      }

      const data = await response.json();
      
      setSnackbar({
        open: true,
        message: data.message || `Scenario '${newName}' updated successfully.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Update scenario error:', error);
      throw error; // Re-throw to let the dialog handle it
    }
  };

  const DrawerList = () => (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        {navLinks.map((link) => {
          // Determine if this link is active (same logic as desktop)
          const isActive = link.path === '/' 
            ? location.pathname === '/' 
            : location.pathname === link.path || location.pathname.startsWith(link.path + '/');
          
          return (
            <ListItem
              button
              component={Link}
              to={link.path}
              key={link.title}
              selected={isActive}
              sx={{
                bgcolor: isActive ? 'rgba(1, 102, 94, 0.1)' : 'transparent',
                fontWeight: isActive ? 'bold' : 'normal',
                borderLeft: isActive ? '4px solid #01665e' : '4px solid transparent',
                '&:hover': {
                  bgcolor: isActive ? 'rgba(1, 102, 94, 0.15)' : 'rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              <ListItemText 
                primary={link.title}
                primaryTypographyProps={{
                  fontWeight: isActive ? 'bold' : 'normal',
                  color: isActive ? '#01665e' : 'inherit'
                }}
              />
            </ListItem>
          );
        })}

        {/* Scenario Actions button after Admin */}
        <ListItem
          button
          onClick={(e) => {
            handleScenarioMenuOpen(e);
          }}
          sx={{
            bgcolor: '#1976d2',
            border: '2px solid #1976d2',
            borderRadius: '4px',
            margin: '8px 16px',
            color: '#ffffff',
            '&:hover': { 
              bgcolor: '#1565c0',
              borderColor: '#1565c0'
            }
          }}
        >
          <ListItemText 
            primary="Scenario Actions" 
            primaryTypographyProps={{
              color: '#ffffff',
              fontWeight: 'medium'
            }}
          />
        </ListItem>
        
        {/* Start and End buttons in mobile drawer */}
        <ListItem
          button
          onClick={() => {
            setIsTracking(true);
            console.log('Tracking started');
            toggleDrawer(false)();
          }}
          disabled={isTracking}
          sx={{
            bgcolor: isTracking ? '#9e9e9e' : '#1976d2',
            border: `2px solid ${isTracking ? '#9e9e9e' : '#1976d2'}`,
            borderRadius: '4px',
            margin: '8px 16px',
            color: '#ffffff',
            opacity: isTracking ? 0.6 : 1,
            '&:hover': { 
              bgcolor: isTracking ? '#9e9e9e' : '#1565c0',
              borderColor: isTracking ? '#9e9e9e' : '#1565c0'
            }
          }}
        >
          <ListItemText 
            primary="Start" 
            primaryTypographyProps={{
              color: '#ffffff',
              fontWeight: 'medium'
            }}
          />
        </ListItem>
        
        <ListItem
          button
          onClick={() => {
            setIsTracking(false);
            console.log('Tracking stopped');
            toggleDrawer(false)();
          }}
          disabled={!isTracking}
          sx={{
            bgcolor: !isTracking ? '#9e9e9e' : '#d32f2f',
            border: `2px solid ${!isTracking ? '#9e9e9e' : '#d32f2f'}`,
            borderRadius: '4px',
            margin: '8px 16px',
            color: '#ffffff',
            opacity: !isTracking ? 0.6 : 1,
            '&:hover': { 
              bgcolor: !isTracking ? '#9e9e9e' : '#c62828',
              borderColor: !isTracking ? '#9e9e9e' : '#c62828'
            }
          }}
        >
          <ListItemText 
            primary="End" 
            primaryTypographyProps={{
              color: '#ffffff',
              fontWeight: 'medium'
            }}
          />
        </ListItem>
      </List>

      <Menu
        anchorEl={scenarioMenuAnchor}
        open={Boolean(scenarioMenuAnchor)}
        onClose={handleScenarioMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleExportData}>Export Data</MenuItem>
        <MenuItem onClick={handleSaveScenario}>Save Scenario</MenuItem>
        <MenuItem onClick={handleManageScenario}>Manage Scenario</MenuItem>
      </Menu>
    </Box>
  );

  return (
    <>
      <AOITracker isTracking={isTracking} /> {/* ← mouse + eye tracking */}

      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h5" sx={{ flexGrow: 0, mr: 3, color: '#ffffff' }}>CARE Menu</Typography>
          
          {!isAdminPage && <CaseSelector />}
          
          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={toggleDrawer(true)}
                sx={{ ml: 'auto' }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
                <DrawerList />
              </Drawer>
            </>
          ) : (
            <>
              <Box
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': { height: '8px' },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px' },
                  '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(255,255,255,0.1)' }
                }}
              >
                {navLinks.map((link) => {
                  // Determine if this link is active
                  const isActive = link.path === '/' 
                    ? location.pathname === '/' 
                    : location.pathname === link.path || location.pathname.startsWith(link.path + '/');
                  
                  return (
                    <Button
                      key={link.title}
                      color="inherit"
                      component={Link}
                      to={link.path}
                      sx={{
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                        px: 1.5,
                        textTransform: 'capitalize',
                        fontWeight: isActive ? 'bold' : 'normal',
                        bgcolor: isActive ? 'rgba(255,255,255,0.25)' : 'transparent',
                        borderBottom: isActive ? '3px solid #ffffff' : '3px solid transparent',
                        color: '#ffffff',
                        '&:hover': {
                          bgcolor: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                          color: '#ffffff'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      {link.title}
                    </Button>
                  );
                })}
                
                {/* Scenario Actions button after Admin */}
                <Button
                  onClick={handleScenarioMenuOpen}
                  sx={{
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    px: 1.5,
                    textTransform: 'capitalize',
                    fontWeight: 'normal',
                    bgcolor: '#1976d2',
                    border: '2px solid #1976d2',
                    color: '#ffffff',
                    borderRadius: '4px',
                    ml: 1,
                    '&:hover': {
                      bgcolor: '#1565c0',
                      borderColor: '#1565c0',
                      color: '#ffffff'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Scenario Actions
                </Button>
              </Box>
              
              {/* Start and End buttons aligned to the right */}
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                <Button
                  onClick={() => {
                    setIsTracking(true);
                    console.log('Tracking started');
                  }}
                  disabled={isTracking}
                  sx={{
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.75,
                    textTransform: 'capitalize',
                    fontWeight: 'normal',
                    bgcolor: isTracking ? '#9e9e9e' : '#1976d2',
                    border: `2px solid ${isTracking ? '#9e9e9e' : '#1976d2'}`,
                    color: '#ffffff',
                    borderRadius: '4px',
                    '&:hover': {
                      bgcolor: isTracking ? '#9e9e9e' : '#1565c0',
                      borderColor: isTracking ? '#9e9e9e' : '#1565c0',
                      color: '#ffffff'
                    },
                    '&:disabled': {
                      bgcolor: '#9e9e9e',
                      borderColor: '#9e9e9e',
                      color: '#ffffff'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Start
                </Button>
                
                <Button
                  onClick={() => {
                    setIsTracking(false);
                    console.log('Tracking stopped');
                  }}
                  disabled={!isTracking}
                  sx={{
                    whiteSpace: 'nowrap',
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.75,
                    textTransform: 'capitalize',
                    fontWeight: 'normal',
                    bgcolor: !isTracking ? '#9e9e9e' : '#d32f2f',
                    border: `2px solid ${!isTracking ? '#9e9e9e' : '#d32f2f'}`,
                    color: '#ffffff',
                    borderRadius: '4px',
                    '&:hover': {
                      bgcolor: !isTracking ? '#9e9e9e' : '#c62828',
                      borderColor: !isTracking ? '#9e9e9e' : '#c62828',
                      color: '#ffffff'
                    },
                    '&:disabled': {
                      bgcolor: '#9e9e9e',
                      borderColor: '#9e9e9e',
                      color: '#ffffff'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  End
                </Button>

                <Menu
                  anchorEl={scenarioMenuAnchor}
                  open={Boolean(scenarioMenuAnchor)}
                  onClose={handleScenarioMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={handleExportData}>Export Data</MenuItem>
                  <MenuItem onClick={handleSaveScenario}>Save Scenario</MenuItem>
                  <MenuItem onClick={handleManageScenario}>Manage Scenario</MenuItem>
                </Menu>
              </Box>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth={false} sx={{ mt: 4 }}>
        {/* When not to show case info */}
        {!isNewCasePage && !isSearchPage && !isAdminPage && !isCasePersonListPage && !isCaseCreationSummaryPage && <CurrentCaseInfo />}

        <Routes>
          <Route path="/" element={<Navigate to="/CaseGeneral" replace />} />
          <Route path="/CaseGeneral" element={<CaseGeneral />} />
          <Route path="/case/:caseId" element={<CaseInfo />} />
          <Route path="/CasePeople" element={<PeopleInterface />} />
          <Route path="/CaseMDT" element={<Typography variant="h6">MDT Component (Under Development)</Typography>} />
          <Route path="/CasePresenting" element={<Typography variant="h6">Presenting Component (Under Development)</Typography>} />
          <Route path="/CaseCPS" element={<Typography variant="h6">CPS Component (Under Development)</Typography>} />
          <Route path="/CaseLE" element={<Typography variant="h6">LE Component (Under Development)</Typography>} />
          <Route path="/CaseMedical" element={<Typography variant="h6">Medical Component (Under Development)</Typography>} />
          <Route path="/CaseFI" element={<Typography variant="h6">FI Component (Under Development)</Typography>} />
          <Route path="/CaseProsecution" element={<Typography variant="h6">Prosecution Component (Under Development)</Typography>} />
          <Route path="/CaseReport" element={<Typography variant="h6">Report Component (Under Development)</Typography>} />
          <Route path="/CaseAttachments" element={<Typography variant="h6">Case Attachments Component (Under Development)</Typography>} />
          <Route path="/NewCase" element={<NewCase />} />
          <Route path="/AddNewPerson" element={<AddNewPerson />} />
          <Route path="/CasePersonList" element={<CasePersonList />} />
          <Route path="/OtherPeople" element={<OtherPeople />} />
          <Route path="/CaseCreationSummary" element={<CaseCreationSummary />} />
          <Route path="/case-summary/:caseId" element={<CaseCreationSummary />} />
          <Route path="/CaseMH/*" element={<MHSection />} />
          <Route path="/CaseVA/*" element={<VALogInterface />} />

          {/* Search Case Route */}
          <Route path="/SearchCase" element={<SearchPerson />} />

          {/* Person Bio */}
          <Route path="/PersonBio" element={<PersonBio />} />
          <Route path="/PersonBio/:personId" element={<PersonBio />} />

          {/* Person Cases (NEW) */}
          <Route path="/PersonCases" element={<PersonCases />} />
          <Route path="/PersonCases/:personId" element={<PersonCases />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/cac-setup" element={<AdminPlaceholder title="CAC/MDT Setup" />} />
          <Route path="/admin/add-names" element={<AdminPlaceholder title="Add Names" />} />
          <Route path="/admin/data-fields" element={<AdminPlaceholder title="Data Entry Fields" />} />
          <Route path="/admin/pick-lists" element={<PickLists />} />
          <Route path="/admin/agencies" element={<AdminPlaceholder title="Agencies" />} />
          <Route path="/admin/personnel" element={<AdminPlaceholder title="Personnel" />} />
          <Route path="/admin/roles" element={<AdminPlaceholder title="Roles" />} />
          <Route path="/admin/news" element={<AdminPlaceholder title="News" />} />
          <Route path="/admin/logs" element={<AdminPlaceholder title="Logs" />} />
          
          {/* Legacy routes - can be accessed directly but not from navigation */}
          <Route path="/case-notes" element={<MHCaseNotes />} />
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/assessment" element={<AssessmentInterface />} />
          <Route path="/mh-assessment" element={<MHAssessment />} />
          <Route path="/treatment" element={<MHTreatmentPlan />} />
          <Route path="/mh-basic" element={<MHBasicInterface />} />
          <Route path="/va-logs" element={<VALogInterface />} />
          <Route path="/aoi" element={<AOIEventViewer />} />
        </Routes>
      </Container>

      {/* Export Data Dialog */}
      <ExportDataDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
      />

      {/* Save Scenario Dialog */}
      <SaveScenarioDialog
        open={saveScenarioDialogOpen}
        onClose={() => setSaveScenarioDialogOpen(false)}
        onSave={handleSaveScenarioConfirm}
      />

      {/* Manage Scenario Dialog */}
      <ManageScenarioDialog
        open={manageScenarioDialogOpen}
        onClose={() => setManageScenarioDialogOpen(false)}
        onDelete={handleDeleteScenario}
        onUpdate={handleUpdateScenario}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

const CurrentCaseInfo = () => {
  const { currentCase, cases, loading, error } = useCase();

  if (loading) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          mb: 4,
          p: 3,
          backgroundColor: 'background.default',
          border: '1px solid #01665e',
          boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CircularProgress size={30} sx={{ mr: 2 }} />
        <Typography variant="h6">Loading case information...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          mb: 4,
          p: 3,
          backgroundColor: 'error.light',
          border: '1px solid #01665e',
          boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px'
        }}
      >
        <Typography variant="h6" color="error">
          Error loading case information
        </Typography>
        <Typography variant="body1">Please try refreshing the page</Typography>
      </Box>
    );
  }

  const selectedCase = cases.find(c => c.id === currentCase);
  if (!selectedCase) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          mb: 4,
          p: 3,
          backgroundColor: 'background.default',
          border: '1px solid #01665e',
          boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px'
        }}
      >
        <Typography variant="h6">No case selected</Typography>
        <Typography variant="body1">Please select a case from the dropdown menu</Typography>
      </Box>
    );
  }

  return (
    <Box
        sx={{
          textAlign: 'center',
          mb: 4,
          p: 3,
          backgroundColor: 'background.default',
          borderRadius: 2,
          boxShadow: 1
        }}
    >
      <Typography variant="h4" gutterBottom>
        {selectedCase.name}
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Case {selectedCase.number}
        {selectedCase.cacName && ` – ${selectedCase.cacName}`}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Currently viewing data for this case. Use the dropdown in the navigation bar to switch cases.
      </Typography>
    </Box>
  );
};

function App() {
  return (
    <CaseProvider>
      <Router>
        <AppLayout />
      </Router>
    </CaseProvider>
  );
}

export default App;
