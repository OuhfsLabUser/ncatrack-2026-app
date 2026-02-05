import React, { useState, useEffect } from "react";
import "./TreatmentPlan.css";
import "./MHBasicInterface.css"; // Import MH-Basic styles for consistency
import { useCase } from '../context/CaseContext';
import { mentalHealthApi, employeesApi, agenciesApi, casesApi } from '../services/api';
import DocumentUploadSection from "./DocumentUploadSection";
import TreatmentPlanModal from "./TreatmentPlanModal";
import { 
  Box, 
  Button, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';

export default function MHTreatmentPlan() {
  // Context for current case
  const { currentCase } = useCase();
  
  // States for data
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [treatmentModels, setTreatmentModels] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // Modal visibility states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editPlanData, setEditPlanData] = useState(null);

  // State for expanded rows in setup
  const [expandedRows, setExpandedRows] = useState({});

  // "Add new record" state within setup
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecordModel, setNewRecordModel] = useState("");
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({ open: false, modelId: null });

  // Form state for main modal
  const [planForm, setPlanForm] = useState({
    planDate: "",
    selectedModelId: "",
    providerId: "",
    therapistId: "",
    expectedLength: "",
    lengthUnit: "Weeks",
    plannedStart: "",
    plannedEnd: "",
    planReview: "",
    authStatus: "",
    sessionNotes: [""],
    planGoals: [""],
    privacyForms: {},
    consents: {}
  });

  // Fetch data when component mounts or currentCase changes
  useEffect(() => {
    if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
      setTreatmentPlans([]);
      setTreatmentModels([]);
      setAgencies([]);
      setEmployees([]);
      setError(null);
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Convert currentCase to number if it's a string
        const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
        
        if (isNaN(caseId) || caseId <= 0) {
          setError("Invalid case ID");
          setLoading(false);
          return;
        }
        
        // Fetch all data in parallel
        const [models, agencyList, employeeList, plans] = await Promise.all([
          mentalHealthApi.getTreatmentModels().catch(err => {
            console.error("Error fetching treatment models:", err);
            return [];
          }),
          agenciesApi.getAllAgencies().catch(err => {
            console.error("Error fetching agencies:", err);
            return [];
          }),
          employeesApi.getAllEmployees().catch(err => {
            console.error("Error fetching employees:", err);
            return [];
          }),
          mentalHealthApi.getTreatmentPlansByCaseId(caseId).catch(err => {
            console.error("Error fetching treatment plans:", err);
            throw err; // Re-throw this error as it's the main data we need
          })
        ]);
        
        setTreatmentModels(models || []);
        setAgencies(agencyList || []);
        setEmployees(employeeList || []);
        setTreatmentPlans(plans || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        // Only show error if it's a real error, not just empty data
        const errorMessage = err.message || "Failed to load data. Please try again later.";
        setError(errorMessage);
        // Set empty arrays to prevent undefined errors
        setTreatmentPlans([]);
        setTreatmentModels([]);
        setAgencies([]);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentCase]);

  // Reset form state
  const resetForm = () => {
    setPlanForm({
      planDate: "",
      selectedModelId: "",
      providerId: "",
      therapistId: "",
      expectedLength: "",
      lengthUnit: "Weeks",
      plannedStart: "",
      plannedEnd: "",
      planReview: "",
      authStatus: "",
      sessionNotes: [""],
      planGoals: [""],
      privacyForms: {},
      consents: {}
    });
    setIsEditing(false);
    setEditId(null);
  };

  // Handle opening add/edit modal
  const handleOpenPlanModal = (plan = null) => {
    if (plan) {
      // Edit existing plan
      setIsEditing(true);
      setEditId(plan.id);
      setEditPlanData(plan);
    } else {
      // Add new plan
      setIsEditing(false);
      setEditId(null);
      setEditPlanData(null);
    }
    
    setShowPlanModal(true);
  };

  // Handle saving treatment plan from modal
  const handleSavePlanFromModal = async (savedPlan) => {
    // Reload treatment plans
    try {
      const plans = await mentalHealthApi.getTreatmentPlansByCaseId(currentCase);
      setTreatmentPlans(plans);
      setNotification({
        open: true,
        message: isEditing ? 'Treatment plan updated successfully' : 'Treatment plan created successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error("Error reloading treatment plans:", err);
    }
    setShowPlanModal(false);
    setIsEditing(false);
    setEditId(null);
    setEditPlanData(null);
  };

  // Handle form input changes
  const handleFormChange = (field, value) => {
    // Convert string ID values to integers where needed
    if (field === 'selectedModelId' || field === 'providerId' || field === 'therapistId' || field === 'authStatus') {
      value = value ? parseInt(value) : null;
    }
    
    setPlanForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle note changes
  const handleNoteChange = (i, val) => {
    const newNotes = [...planForm.sessionNotes];
    newNotes[i] = val;
    setPlanForm(prev => ({
      ...prev,
      sessionNotes: newNotes
    }));
  };

  const addNote = () => {
    setPlanForm(prev => ({
      ...prev,
      sessionNotes: [...prev.sessionNotes, ""]
    }));
  };

  const removeNote = (i) => {
    setPlanForm(prev => ({
      ...prev,
      sessionNotes: prev.sessionNotes.filter((_, idx) => idx !== i)
    }));
  };

  // Handle goal changes
  const handleGoalChange = (i, val) => {
    const newGoals = [...planForm.planGoals];
    newGoals[i] = val;
    setPlanForm(prev => ({
      ...prev,
      planGoals: newGoals
    }));
  };

  const addGoal = () => {
    setPlanForm(prev => ({
      ...prev,
      planGoals: [...prev.planGoals, ""]
    }));
  };

  const removeGoal = (i) => {
    setPlanForm(prev => ({
      ...prev,
      planGoals: prev.planGoals.filter((_, idx) => idx !== i)
    }));
  };

  // Handle checkbox changes
  const togglePrivacy = (key) => {
    setPlanForm(prev => ({
      ...prev,
      privacyForms: {
        ...prev.privacyForms,
        [key]: !prev.privacyForms[key]
      }
    }));
  };

  const toggleConsent = (key) => {
    setPlanForm(prev => ({
      ...prev,
      consents: {
        ...prev.consents,
        [key]: !prev.consents[key]
      }
    }));
  };

  // Save treatment plan
  const handleSavePlan = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Prepare data for API
      const planData = {
        treatment_plan_date: planForm.planDate || null,
        treatment_model_id: planForm.selectedModelId,  // Already converted to integer in handleFormChange
        provider_agency_id: planForm.providerId,      // Already converted to integer in handleFormChange
        provider_employee_id: planForm.therapistId,   // Already converted to integer in handleFormChange
        duration: planForm.expectedLength ? parseInt(planForm.expectedLength) : null,
        duration_unit: planForm.lengthUnit || null,
        planned_start_date: planForm.plannedStart || null,
        planned_end_date: planForm.plannedEnd || null,
        planned_review_date: planForm.planReview || null,
        authorized_status_id: planForm.authStatus,    // Already converted to integer in handleFormChange
        // These fields would need to be saved to their respective tables
        // For now, we're just focusing on the basic treatment plan data
      };
      
      // Dates are properly handled in the backend to convert to proper DateTime format
      
      if (isEditing) {
        // Update existing plan
        await mentalHealthApi.updateTreatmentPlan(editId, {
          ...planData,
          cac_id: treatmentPlans.find(p => p.id === editId)?.cac_id,
          case_id: parseInt(currentCase)
        });
        
        setNotification({
          open: true,
          message: 'Treatment plan updated successfully',
          severity: 'success'
        });
      } else {
        // Get CAC ID from case data
        const caseData = await casesApi.getCaseById(currentCase);
        
        // Create new plan
        await mentalHealthApi.createTreatmentPlan({
          ...planData,
          cac_id: caseData.cac_id,
          case_id: parseInt(currentCase)
        });
        
        setNotification({
          open: true,
          message: 'Treatment plan created successfully',
          severity: 'success'
        });
      }
      
      // Refresh treatment plans
      const plans = await mentalHealthApi.getTreatmentPlansByCaseId(currentCase);
      setTreatmentPlans(plans);
      
      // Close modal
      setShowPlanModal(false);
      resetForm();
    } catch (err) {
      console.error("Error saving treatment plan:", err);
      setError("Failed to save treatment plan. Please try again.");
      setNotification({
        open: true,
        message: 'Failed to save treatment plan',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle setup modal
  const startAddRecord = () => {
    setIsAddingRecord(true);
    setNewRecordModel("");
  };

  const cancelAddRecord = () => {
    setIsAddingRecord(false);
  };

  const saveNewRecord = async () => {
    const trimmedModel = newRecordModel.trim();
    if (!trimmedModel) return;
    
    setLoading(true);
    
    try {
      // Get the highest existing ID to create a new one
      const highestId = treatmentModels.length > 0 
        ? Math.max(...treatmentModels.map(m => m.id)) 
        : 0;
      
      // Create new treatment model
      const newModel = await mentalHealthApi.createTreatmentModel({
        id: highestId + 1,
        model_name: trimmedModel
      });
      
      // Add to local state
      setTreatmentModels([...treatmentModels, newModel]);
      
      setNotification({
        open: true,
        message: 'Treatment model added successfully',
        severity: 'success'
      });
      
      setIsAddingRecord(false);
    } catch (err) {
      console.error("Error adding treatment model:", err);
      setNotification({
        open: true,
        message: 'Failed to add treatment model',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (i) => {
    setExpandedRows((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  // Handle delete treatment model
  const confirmDeleteModel = (modelId) => {
    setConfirmDeleteDialog({ open: true, modelId });
  };

  const handleDeleteModel = async () => {
    const modelId = confirmDeleteDialog.modelId;
    
    if (!modelId) {
      setConfirmDeleteDialog({ open: false, modelId: null });
      return;
    }
    
    setLoading(true);
    
    try {
      await mentalHealthApi.deleteTreatmentModel(modelId);
      
      // Remove from local state
      setTreatmentModels(treatmentModels.filter(model => model.id !== modelId));
      
      setNotification({
        open: true,
        message: 'Treatment model deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error("Error deleting treatment model:", err);
      setNotification({
        open: true,
        message: 'Failed to delete treatment model',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setConfirmDeleteDialog({ open: false, modelId: null });
    }
  };

  // Render the component
  return (
    <div className="mh-basic-container" data-aoi="MH Treatment Plan Container">
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', m: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Box sx={{ m: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <div className="mh-basic-form" data-aoi="MH Treatment Plan Form">
        {/* TREATMENT PLANS SECTION */}
        <section className="mh-section" data-aoi="Treatment Plans Section">
          <h2 data-aoi="Treatment Plans Header">Treatment Plans</h2>
          
          <button 
            className="add-button" 
            onClick={() => handleOpenPlanModal()}
            disabled={loading}
            data-aoi="Add Treatment Plan Button"
            style={{ marginBottom: '15px' }}
          >
            + Add New
          </button>

          <div className="mh-log-table-container" data-aoi="Treatment Plans Table Container">
            <table className="mh-log-table" data-aoi="TreatmentPlan Data Table">
              <thead data-aoi="TreatmentPlan Table Head">
                <tr>
                  <th>Action</th>
                  <th>Plan Date</th>
                  <th>Treatment Model</th>
                  <th>Provider Agency</th>
                  <th>Therapist</th>
                </tr>
              </thead>
              <tbody>
                {treatmentPlans.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No items to display</td>
                  </tr>
                ) : (
                  treatmentPlans.map((plan) => {
                    const formatDate = (dateString) => {
                      if (!dateString) return 'N/A';
                      try {
                        const isoString =
                          typeof dateString === "string"
                            ? dateString
                            : new Date(dateString).toISOString();
                        const [year, month, day] = isoString.slice(0, 10).split("-");
                        return `${month}/${day}/${year}`;
                      } catch {
                        return 'N/A';
                      }
                    };
                    
                    const therapist = plan.provider_employee_id 
                      ? employees.find(e => e.employee_id === plan.provider_employee_id)
                      : null;
                    const therapistName = therapist 
                      ? `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim() || 'N/A'
                      : 'N/A';
                    
                    return (
                      <tr key={plan.id}>
                        <td>
                          <Button 
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenPlanModal(plan)}
                            disabled={loading}
                            sx={{
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              background: '#fff',
                              color: '#374151',
                              fontSize: '0.85rem',
                              padding: '6px 14px',
                              minWidth: '80px',
                              textTransform: 'none',
                              '&:hover': {
                                background: '#f3f4f6',
                                borderColor: '#bfc5d0',
                              }
                            }}
                          >
                            ✐ Edit
                          </Button>
                        </td>
                        <td>{formatDate(plan.treatment_plan_date)}</td>
                        <td>
                          {plan.treatment_model_id 
                            ? treatmentModels.find(m => m.id === plan.treatment_model_id)?.model_name 
                            : 'N/A'}
                        </td>
                        <td>
                          {plan.provider_agency_id 
                            ? agencies.find(a => a.agency_id === plan.provider_agency_id)?.agency_name 
                            : 'N/A'}
                        </td>
                        <td>{therapistName}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* UPLOADED DOCUMENTS SECTION */}
        <DocumentUploadSection
          documents={[]}
          onFileSelect={() => {
            // Handle file select
            console.log("File select clicked");
          }}
          showRemovedCheckbox={true}
          showInstructions={true}
          sectionTitle="Uploaded Documents"
        />
      </div>

      {/* Edit Treatment Plan Modal - OLD VERSION (keeping for reference, will be replaced) */}
      {false && showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditing ? 'Edit Treatment Plan' : 'Add New Treatment Plan'}</h2>
              <button
                className="modal-close"
                onClick={() => setShowPlanModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label htmlFor="plan-date">Plan Date</label>
                <input
                  type="date"
                  id="plan-date"
                  value={planForm.planDate}
                  onChange={(e) => handleFormChange('planDate', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="treatment-model">Treatment Model</label>
                <div className="inline-group">
                  <select
                    id="treatment-model"
                    value={planForm.selectedModelId}
                    onChange={(e) => handleFormChange('selectedModelId', e.target.value)}
                  >
                    <option value="">-- select --</option>
                    {treatmentModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.model_name}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setShowSetupModal(true)}>Add</button>
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="provider-agency">Provider Agency</label>
                <select
                  id="provider-agency"
                  value={planForm.providerId}
                  onChange={(e) => handleFormChange('providerId', e.target.value)}
                >
                  <option value="">-- select --</option>
                  {agencies.map((agency) => (
                    <option key={agency.agency_id} value={agency.agency_id}>
                      {agency.agency_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="therapist">Therapist</label>
                <select
                  id="therapist"
                  value={planForm.therapistId}
                  onChange={(e) => handleFormChange('therapistId', e.target.value)}
                >
                  <option value="">-- select --</option>
                  {employees.map((employee) => (
                    <option key={employee.employee_id} value={employee.employee_id}>
                      {`${employee.first_name} ${employee.last_name}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="expected-length">Expected Length of Services</label>
                <div className="inline-group">
                  <input
                    type="number"
                    id="expected-length"
                    value={planForm.expectedLength}
                    onChange={(e) => handleFormChange('expectedLength', e.target.value)}
                  />
                  <select
                    value={planForm.lengthUnit}
                    onChange={(e) => handleFormChange('lengthUnit', e.target.value)}
                  >
                    <option>Days</option>
                    <option>Weeks</option>
                    <option>Months</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label>Planned Start</label>
                <input
                  type="date"
                  value={planForm.plannedStart}
                  onChange={(e) => handleFormChange('plannedStart', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Planned End</label>
                <input
                  type="date"
                  value={planForm.plannedEnd}
                  onChange={(e) => handleFormChange('plannedEnd', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Plan Review Date</label>
                <input
                  type="date"
                  value={planForm.planReview}
                  onChange={(e) => handleFormChange('planReview', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Authorization Status</label>
                <select
                  value={planForm.authStatus}
                  onChange={(e) => handleFormChange('authStatus', e.target.value)}
                >
                  <option value="">-- select --</option>
                  <option value="1">Pending</option>
                  <option value="2">Active</option>
                  <option value="3">Closed</option>
                </select>
              </div>
              <div className="form-row">
                <label>Session Notes</label>
                {planForm.sessionNotes.map((note, i) => (
                  <div className="inline-group" key={i}>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => handleNoteChange(i, e.target.value)}
                    />
                    <button type="button" onClick={addNote}>
                      +
                    </button>
                    {planForm.sessionNotes.length > 1 && (
                      <button type="button" onClick={() => removeNote(i)}>
                        -
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="form-row">
                <label>Treatment Plan Goals/Progress</label>
                {planForm.planGoals.map((goal, i) => (
                  <div className="inline-group" key={i}>
                    <textarea
                      rows={2}
                      value={goal}
                      onChange={(e) => handleGoalChange(i, e.target.value)}
                    />
                    <button type="button" onClick={addGoal}>
                      +
                    </button>
                    {planForm.planGoals.length > 1 && (
                      <button type="button" onClick={() => removeGoal(i)}>
                        -
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="form-row">
                <label>Privacy Forms Distributed</label>
                <div className="checkbox-items">
                  {[
                    "HIPAA",
                    "Agency Disclosure",
                    "MDT Procedural",
                    "Right to Privacy",
                    "Chaperones",
                  ].map((key) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={!!planForm.privacyForms[key]}
                        onChange={() => togglePrivacy(key)}
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label>Consents Obtained</label>
                <div className="checkbox-items">
                  {[
                    "Parent",
                    "Guardian",
                    "G. Ad Litem",
                    "CPS",
                    "District Attorney",
                  ].map((key) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={!!planForm.consents[key]}
                        onChange={() => toggleConsent(key)}
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-save" 
                onClick={handleSavePlan}
                disabled={loading}
              >
                {loading ? "Saving..." : (isEditing ? "Update" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Model Setup Modal */}
      {showSetupModal && (
        <div className="modal-overlay" onClick={() => setShowSetupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Treatment Model Setup</h2>
              <button
                className="modal-close"
                onClick={() => setShowSetupModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="setup-actions">
                <button className="add-new-record" onClick={startAddRecord} disabled={loading}>
                  + Add new record
                </button>
              </div>
              <div className="setup-table-container">
                <table className="setup-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Treatment Model</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isAddingRecord && (
                      <tr className="editing-row">
                        <td>
                          <button
                            className="update-btn"
                            onClick={saveNewRecord}
                            disabled={loading}
                          >
                            {loading ? "Saving..." : "✔ Update"}
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={cancelAddRecord}
                            disabled={loading}
                          >
                            ⛔ Cancel
                          </button>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Treatment Model"
                            value={newRecordModel}
                            onChange={(e) => setNewRecordModel(e.target.value)}
                          />
                        </td>
                      </tr>
                    )}
                    {treatmentModels.map((model, i) => (
                      <React.Fragment key={model.id}>
                        <tr>
                          <td>
                            <span
                              className="expand-icon"
                              onClick={() => toggleExpand(i)}
                              style={{
                                transform: expandedRows[i]
                                  ? "rotate(90deg)"
                                  : "rotate(0deg)",
                              }}
                            >
                              ▶
                            </span>
                          </td>
                          <td>
                            <strong>{model.model_name}</strong>
                          </td>
                        </tr>
                        {expandedRows[i] && (
                          <tr className="detail-row">
                            <td>
                              <button 
                                className="delete-btn"
                                onClick={() => confirmDeleteModel(model.id)}
                                disabled={loading}
                              >
                                ✖ Delete
                              </button>
                            </td>
                            <td>{model.model_name}</td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={confirmDeleteDialog.open}
        onClose={() => setConfirmDeleteDialog({ open: false, modelId: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this treatment model? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDeleteDialog({ open: false, modelId: null })}
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteModel} 
            color="error"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Treatment Plan Modal */}
      <TreatmentPlanModal
        open={showPlanModal}
        onClose={() => {
          setShowPlanModal(false);
          setIsEditing(false);
          setEditId(null);
          setEditPlanData(null);
        }}
        onSave={handleSavePlanFromModal}
        editData={editPlanData}
      />

    </div>
  );
}
