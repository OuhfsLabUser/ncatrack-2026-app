// src/components/MHBasicInterface.js
import React, { useState, useEffect } from "react";
import { useCase } from "../context/CaseContext";
import { casesApi, agenciesApi, employeesApi, peopleApi } from "../services/api";
import { Snackbar, Alert, CircularProgress, Box } from "@mui/material";
import ToggleReviewSwitch from "./ToggleReviewSwitch";
import DocumentUploadSection from "./DocumentUploadSection";
import NewAgencyModal from "./NewAgencyModal";
import NewPersonnelModal from "./NewPersonnelModal";
import MHProviderModal from "./MHProviderModal";
import OutsideReferralModal from "./OutsideReferralModal";
import PointOfContactModal from "./PointOfContactModal";
import "./MHBasicInterface.css";

function MHBasicInterface() {
  const { currentCase } = useCase();
  const [loading, setLoading] = useState(false);
  const [mdtReady, setMdtReady] = useState(false);
  const [agencies, setAgencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newAgencyModalOpen, setNewAgencyModalOpen] = useState(false);
  const [newPersonnelModalOpen, setNewPersonnelModalOpen] = useState(false);
  const [mhProviderModalOpen, setMhProviderModalOpen] = useState(false);
  const [outsideReferralModalOpen, setOutsideReferralModalOpen] = useState(false);
  const [pointOfContactModalOpen, setPointOfContactModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    referralDate: "",
    referralSource: "",
    personAgencyId: "",
    selectedEmployeeId: "" // Store selected employee_id separately
  });

  // Debug: Log formData changes
  useEffect(() => {
    console.log("[MHBasicInterface] formData updated:", formData);
  }, [formData]);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  const [clientContactInfo, setClientContactInfo] = useState("");
  const [parentContactInfo, setParentContactInfo] = useState("");

  // Load agencies on mount and when modal closes
  const loadAgencies = async () => {
    try {
      const agenciesData = await agenciesApi.getAllAgencies();
      setAgencies(agenciesData);
    } catch (err) {
      console.error("[MHBasicInterface] Error loading agencies:", err);
    }
  };

  // Load employees on mount and when modal closes
  const loadEmployees = async () => {
    try {
      const employeesData = await employeesApi.getAllEmployees();
      setEmployees(employeesData);
    } catch (err) {
      console.error("[MHBasicInterface] Error loading employees:", err);
    }
  };

  // Format contact information from case_person data
  const formatContactInfo = (casePersonData) => {
    if (!casePersonData) return "";
    
    const parts = [];
    
    // Address
    if (casePersonData.address_line_1) {
      parts.push(casePersonData.address_line_1);
    }
    if (casePersonData.address_line_2) {
      parts.push(casePersonData.address_line_2);
    }
    if (casePersonData.city || casePersonData.state_abbr || casePersonData.zip) {
      const cityStateZip = [
        casePersonData.city,
        casePersonData.state_abbr,
        casePersonData.zip
      ].filter(Boolean).join(", ");
      if (cityStateZip) {
        parts.push(cityStateZip);
      }
    }
    if (casePersonData.county) {
      parts.push(`County: ${casePersonData.county}`);
    }
    if (casePersonData.region) {
      parts.push(`Region: ${casePersonData.region}`);
    }
    
    // Phone numbers
    if (casePersonData.home_phone_number) {
      parts.push(`Home: ${casePersonData.home_phone_number}`);
    }
    if (casePersonData.cell_phone_number) {
      parts.push(`Cell: ${casePersonData.cell_phone_number}`);
    }
    if (casePersonData.work_phone_number) {
      parts.push(`Work: ${casePersonData.work_phone_number}`);
    }
    
    // Email
    if (casePersonData.email_address) {
      parts.push(`Email: ${casePersonData.email_address}`);
    }
    
    return parts.length > 0 ? parts.join("\n") : "";
  };

  useEffect(() => {
    loadAgencies();
    loadEmployees();
  }, []);
  
  // Update selectedEmployeeId when employees are loaded and we have a saved personAgencyId
  useEffect(() => {
    if (employees.length > 0 && formData.personAgencyId) {
      const matchingEmployee = employees.find(emp => 
        emp.agency_id && emp.agency_id.toString() === formData.personAgencyId
      );
      if (matchingEmployee) {
        const newSelectedEmployeeId = matchingEmployee.employee_id.toString();
        setFormData(prev => {
          // Only update if different to avoid unnecessary re-renders
          if (prev.selectedEmployeeId !== newSelectedEmployeeId) {
            console.log("[MHBasicInterface] Matching employee found in useEffect:", {
              personAgencyId: formData.personAgencyId,
              employeeId: newSelectedEmployeeId,
              employeeName: `${matchingEmployee.first_name} ${matchingEmployee.last_name}`,
              previousSelectedEmployeeId: prev.selectedEmployeeId
            });
            return {
              ...prev,
              selectedEmployeeId: newSelectedEmployeeId
            };
          }
          return prev;
        });
      } else if (formData.personAgencyId) {
        console.warn("[MHBasicInterface] No matching employee found for agency_id:", formData.personAgencyId, 
          "Available employees:", employees.filter(e => e.agency_id).map(e => ({ 
            id: e.employee_id, 
            name: `${e.first_name} ${e.last_name}`, 
            agency_id: e.agency_id 
          })));
      }
    }
  }, [employees.length, formData.personAgencyId]); // Re-run when employees are loaded or personAgencyId changes

  // Handle agency selection from modal
  const handleAgencySelect = (agency) => {
    // Set referral source to agency name
    setFormData(prev => ({
      ...prev,
      referralSource: agency.agency_name || ""
    }));
    // Reload agencies to ensure latest data
    loadAgencies();
  };

  // Handle personnel selection from modal
  const handlePersonnelSelect = (employee) => {
    // Set person agency ID to employee's agency ID (mh_referral_agency_id stores agency_id)
    setFormData(prev => ({
      ...prev,
      personAgencyId: employee.agency_id ? employee.agency_id.toString() : "",
      selectedEmployeeId: employee.employee_id ? employee.employee_id.toString() : ""
    }));
    // Reload employees to ensure latest data
    loadEmployees();
  };

  // Handle opening new agency modal
  const handleOpenNewAgencyModal = () => {
    setNewAgencyModalOpen(true);
  };

  // Handle closing new agency modal
  const handleCloseNewAgencyModal = () => {
    setNewAgencyModalOpen(false);
  };

  // Handle opening new personnel modal
  const handleOpenNewPersonnelModal = () => {
    setNewPersonnelModalOpen(true);
  };

  // Handle closing new personnel modal
  const handleCloseNewPersonnelModal = () => {
    setNewPersonnelModalOpen(false);
  };

  // Load case data when currentCase changes
  useEffect(() => {
    const loadCaseData = async () => {
      // Skip if no case selected or special cases
      if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
        console.log("[MHBasicInterface] No valid case selected:", currentCase);
        setMdtReady(false);
        setFormData({
          referralDate: "",
          referralSource: "",
          personAgencyId: "",
          selectedEmployeeId: ""
        });
        setClientContactInfo("");
        setParentContactInfo("");
        return;
      }

      // Convert currentCase to number if it's a string
      const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
      
      if (isNaN(caseId) || caseId <= 0) {
        console.error("[MHBasicInterface] Invalid case ID:", currentCase, '->', caseId);
        setMdtReady(false);
        setFormData({
          referralDate: "",
          referralSource: "",
          personAgencyId: "",
          selectedEmployeeId: ""
        });
        setClientContactInfo("");
        setParentContactInfo("");
        return;
      }

      try {
        const data = await casesApi.getCaseById(caseId);
        console.log("[MHBasicInterface] Loaded case data:", {
          case_id: caseId,
          mh_referral_date: data.mh_referral_date,
          mh_referral_source: data.mh_referral_source,
          mh_referral_agency_id: data.mh_referral_agency_id,
          mh_mdt_ready: data.mh_mdt_ready,
          fullData: data
        });
        
        // Map mh_mdt_ready to toggle switch (true=YES, false/null=NO)
        // Handle null, undefined, true, false values
        const mdtReadyValue = data.mh_mdt_ready === true || data.mh_mdt_ready === 1 || data.mh_mdt_ready === 'true';
        setMdtReady(mdtReadyValue);
        
        // Format date for input field (YYYY-MM-DD)
        let formattedDate = "";
        if (data.mh_referral_date) {
          try {
            // Handle both Date objects and date strings
            const dateObj = data.mh_referral_date instanceof Date 
              ? data.mh_referral_date 
              : new Date(data.mh_referral_date);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toISOString().split('T')[0];
            } else {
              console.warn("[MHBasicInterface] Invalid date:", data.mh_referral_date);
            }
          } catch (dateErr) {
            console.error("[MHBasicInterface] Error formatting date:", dateErr, data.mh_referral_date);
          }
        }
        
        const referralSource = data.mh_referral_source || "";
        const personAgencyId = data.mh_referral_agency_id 
          ? data.mh_referral_agency_id.toString() 
          : "";
        
        // Find the employee that matches the saved agency_id
        // Note: If multiple employees have the same agency_id, we'll use the first one found
        const matchingEmployee = employees.find(emp => 
          emp.agency_id && emp.agency_id.toString() === personAgencyId
        );
        const selectedEmployeeId = matchingEmployee 
          ? matchingEmployee.employee_id.toString() 
          : "";
        
        console.log("[MHBasicInterface] Setting form data:", {
          referralDate: formattedDate,
          referralSource: referralSource,
          personAgencyId: personAgencyId,
          selectedEmployeeId: selectedEmployeeId
        });
        
        setFormData({
          referralDate: formattedDate,
          referralSource: referralSource,
          personAgencyId: personAgencyId,
          selectedEmployeeId: selectedEmployeeId
        });

        // Load contact information for client and parent
        try {
          const peopleInCase = await peopleApi.getPeopleByCaseId(caseId);
          
          // Get detailed case_person information for each person
          const contactInfoPromises = peopleInCase.map(async (person) => {
            try {
              const casesForPerson = await peopleApi.getCasesForPerson(person.person_id);
              const casePersonData = casesForPerson.find(cp => cp.case_id === caseId);
              return {
                person_id: person.person_id,
                role_id: person.role_id,
                contactData: casePersonData
              };
            } catch (err) {
              console.error(`[MHBasicInterface] Error loading contact info for person ${person.person_id}:`, err);
              return null;
            }
          });
          
          const contactInfoResults = await Promise.all(contactInfoPromises);
          
          // Find client (typically role_id 1 = Alleged Co-victim, or role_id 2 = Alleged Offender)
          // and parent (typically role_id 3 = Caregiver)
          let clientInfo = "";
          let parentInfo = "";
          
          for (const result of contactInfoResults) {
            if (!result || !result.contactData) continue;
            
            // Client: role_id 1 (Alleged Co-victim) or 2 (Alleged Offender)
            if (result.role_id === 1 || result.role_id === 2) {
              if (!clientInfo) {
                clientInfo = formatContactInfo(result.contactData);
              }
            }
            // Parent: role_id 3 (Caregiver) or relationship_id indicates parent
            else if (result.role_id === 3 || (result.contactData.relationship_id && 
                     [1, 2, 3, 8, 9].includes(result.contactData.relationship_id))) {
              if (!parentInfo) {
                parentInfo = formatContactInfo(result.contactData);
              }
            }
          }
          
          setClientContactInfo(clientInfo || "");
          setParentContactInfo(parentInfo || "");
        } catch (contactErr) {
          console.error("[MHBasicInterface] Error loading contact information:", contactErr);
          setClientContactInfo("");
          setParentContactInfo("");
        }
      } catch (err) {
        console.error("[MHBasicInterface] Error loading case data:", err);
        setNotification({
          open: true,
          message: "Failed to load case data",
          severity: "error"
        });
        setClientContactInfo("");
        setParentContactInfo("");
      }
    };
    loadCaseData();
  }, [currentCase]);

  // Handle MDT Ready toggle change
  // Only update frontend state, do not save to database
  const handleMdtReadyChange = (newValue) => {
    setMdtReady(newValue);
    // No API call here - only save when SAVE button is clicked
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Handle Cancel button click
  const handleCancel = () => {
    // Reset form data to original values
    if (currentCase && currentCase !== 'create-new' && currentCase !== 'search-case') {
      const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
      if (!isNaN(caseId) && caseId > 0) {
        // Reload case data to reset form
        const loadCaseData = async () => {
          try {
            const data = await casesApi.getCaseById(caseId);
            // Map mh_mdt_ready to toggle switch (true=YES, false/null=NO)
            const mdtReadyValue = data.mh_mdt_ready === true || data.mh_mdt_ready === 1 || data.mh_mdt_ready === 'true';
            setMdtReady(mdtReadyValue);
          
          let formattedDate = "";
          if (data.mh_referral_date) {
            try {
              const dateObj = data.mh_referral_date instanceof Date 
                ? data.mh_referral_date 
                : new Date(data.mh_referral_date);
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toISOString().split('T')[0];
              }
            } catch (dateErr) {
              console.error("[MHBasicInterface] Error formatting date:", dateErr);
            }
          }
          
          // Find the employee that matches the saved agency_id
          const matchingEmployee = employees.find(emp => 
            emp.agency_id && emp.agency_id.toString() === (data.mh_referral_agency_id ? data.mh_referral_agency_id.toString() : "")
          );
          const selectedEmployeeId = matchingEmployee 
            ? matchingEmployee.employee_id.toString() 
            : "";
          
          setFormData({
            referralDate: formattedDate,
            referralSource: data.mh_referral_source || "",
            personAgencyId: data.mh_referral_agency_id ? data.mh_referral_agency_id.toString() : "",
            selectedEmployeeId: selectedEmployeeId
          });
          
          setNotification({
            open: true,
            message: "Form data reset to saved values",
            severity: "info"
          });
          } catch (err) {
            console.error("[MHBasicInterface] Error loading case data for cancel:", err);
          }
        };
        loadCaseData();
      }
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // When employee is selected, also update personAgencyId with the employee's agency_id
    if (name === 'selectedEmployeeId') {
      const selectedEmployee = employees.find(emp => emp.employee_id === parseInt(value));
      
      if (!selectedEmployee) {
        console.error("[MHBasicInterface] Employee not found in employees array:", {
          selectedEmployeeId: value,
          employeesCount: employees.length,
          employees: employees.map(e => ({ id: e.employee_id, name: `${e.first_name} ${e.last_name}` }))
        });
        setNotification({
          open: true,
          message: "Error: Selected person not found. Please try again.",
          severity: "error"
        });
        return;
      }
      
      if (!selectedEmployee.agency_id) {
        console.error("[MHBasicInterface] Selected employee has no agency_id:", {
          employeeId: selectedEmployee.employee_id,
          employeeName: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
        });
        setNotification({
          open: true,
          message: "Error: Selected person has no associated agency. Please select another person.",
          severity: "error"
        });
        return;
      }
      
      console.log("[MHBasicInterface] Person selected:", {
        employeeId: selectedEmployee.employee_id,
        employeeName: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
        agencyId: selectedEmployee.agency_id
      });
      
      setFormData(prev => ({ 
        ...prev, 
        selectedEmployeeId: value,
        personAgencyId: selectedEmployee.agency_id.toString()
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle form submission (can be called from button or form submit)
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    // Validate currentCase
    if (!currentCase || currentCase === 'create-new' || currentCase === 'search-case') {
      setNotification({
        open: true,
        message: "No case selected",
        severity: "error"
      });
      return;
    }

    // Convert currentCase to number if it's a string
    const caseId = typeof currentCase === 'string' ? parseInt(currentCase) : currentCase;
    
    if (isNaN(caseId) || caseId <= 0) {
      setNotification({
        open: true,
        message: "Invalid case ID",
        severity: "error"
      });
      return;
    }

    setLoading(true);
    try {
      // Ensure personAgencyId is set from selectedEmployeeId if not already set
      let personAgencyIdToSave = formData.personAgencyId;
      if (!personAgencyIdToSave && formData.selectedEmployeeId) {
        const selectedEmployee = employees.find(emp => emp.employee_id === parseInt(formData.selectedEmployeeId));
        if (selectedEmployee && selectedEmployee.agency_id) {
          personAgencyIdToSave = selectedEmployee.agency_id.toString();
          console.log("[MHBasicInterface] Setting personAgencyId from selectedEmployeeId:", {
            selectedEmployeeId: formData.selectedEmployeeId,
            personAgencyId: personAgencyIdToSave,
            employee: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
            agency_id: selectedEmployee.agency_id
          });
        } else {
          console.warn("[MHBasicInterface] Could not find employee or agency_id:", {
            selectedEmployeeId: formData.selectedEmployeeId,
            employeesCount: employees.length,
            foundEmployee: selectedEmployee ? 'found' : 'not found'
          });
        }
      }
      
      // Validate that we have personAgencyId if selectedEmployeeId is set
      if (formData.selectedEmployeeId && !personAgencyIdToSave) {
        console.error("[MHBasicInterface] ERROR: selectedEmployeeId is set but personAgencyId is missing!", {
          selectedEmployeeId: formData.selectedEmployeeId,
          personAgencyId: formData.personAgencyId,
          employeesCount: employees.length
        });
        setNotification({
          open: true,
          message: "Error: Could not determine agency ID for selected person. Please try selecting again.",
          severity: "error"
        });
        setLoading(false);
        return;
      }
      
      // Always include mh_referral_agency_id in updateData, even if null
      // This ensures the backend knows we want to update this field
      const updateData = {
        mh_referral_date: formData.referralDate || null,
        mh_referral_source: formData.referralSource || null,
        mh_referral_agency_id: personAgencyIdToSave ? parseInt(personAgencyIdToSave, 10) : null,
        mh_mdt_ready: mdtReady // Include MDT Ready status in save payload
      };
      
      // Ensure mh_referral_agency_id is explicitly set (not undefined)
      if (updateData.mh_referral_agency_id === undefined) {
        updateData.mh_referral_agency_id = null;
      }

      console.log("[MHBasicInterface] Saving data:", {
        caseId: caseId,
        updateData: updateData,
        updateDataStringified: JSON.stringify(updateData),
        formData: {
          referralDate: formData.referralDate,
          referralSource: formData.referralSource,
          personAgencyId: formData.personAgencyId,
          selectedEmployeeId: formData.selectedEmployeeId,
          personAgencyIdToSave: personAgencyIdToSave
        },
        employeesCount: employees.length
      });

      const response = await casesApi.updateCase(caseId, updateData);
      console.log("[MHBasicInterface] Save response:", response);
      
      // Verify the data was saved by fetching it back
      const verifyData = await casesApi.getCaseById(caseId);
      console.log("[MHBasicInterface] Verified saved data:", {
        mh_referral_agency_id: verifyData.mh_referral_agency_id,
        mh_referral_source: verifyData.mh_referral_source,
        mh_referral_date: verifyData.mh_referral_date
      });
      
      setNotification({
        open: true,
        message: "Incoming Referral data saved successfully",
        severity: "success"
      });
    } catch (err) {
      console.error("[MHBasicInterface] Error saving data:", err);
      console.error("[MHBasicInterface] Error details:", {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      setNotification({
        open: true,
        message: `Failed to save data: ${err.message || 'Please try again.'}`,
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle scroll to show/hide sticky buttons
  useEffect(() => {
    const handleScroll = () => {
      const container = document.querySelector('.mh-basic-container');
      const topButtons = document.querySelector('.mh-action-buttons-top');
      
      if (container && topButtons) {
        const topButtonsRect = topButtons.getBoundingClientRect();
        // Check if top buttons are visible in viewport
        const isTopButtonsVisible = topButtonsRect.top >= 0 && topButtonsRect.bottom <= window.innerHeight;
        
        if (isTopButtonsVisible) {
          container.classList.add('top-buttons-visible');
        } else {
          container.classList.remove('top-buttons-visible');
        }
      }
    };

    // Use requestAnimationFrame for smoother performance
    let ticking = false;
    const optimizedHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', optimizedHandleScroll, { passive: true });
    window.addEventListener('resize', optimizedHandleScroll);
    
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', optimizedHandleScroll);
      window.removeEventListener('resize', optimizedHandleScroll);
    };
  }, []);

  return (
    <div className="mh-basic-container" data-aoi="MH Basic Container">
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
      {/* TOP ACTION BUTTONS - Sticky on scroll */}
      <div className="mh-action-buttons mh-action-buttons-top" data-aoi="Top Action Buttons">
        <button 
          type="button" 
          className="save-button" 
          data-aoi="Top Save Button" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "SAVING..." : "SAVE"}
        </button>
        <button 
          type="button" 
          className="cancel-button" 
          data-aoi="Top Cancel Button"
          onClick={handleCancel}
        >
          CANCEL
        </button>
      </div>

      <form className="mh-basic-form" data-aoi="MH Basic Form" onSubmit={handleSubmit}>
        {/* 1. INCOMING REFERRAL SECTION */}
        <section className="mh-section" data-aoi="Incoming Referral Section">
          {/* Ready for MDT Review Toggle */}
          <ToggleReviewSwitch
            value={mdtReady}
            onChange={handleMdtReadyChange}
            label="Ready for MDT Review"
            name="mdtReady"
          />
          <h2 data-aoi="Incoming Referral Header">Incoming Referral</h2>
          <div className="form-row" data-aoi="Referral Date Row">
            <label htmlFor="referral-date" data-aoi="Referral Date Label">
              Date
            </label>
            <input
              type="date"
              id="referral-date"
              name="referralDate"
              value={formData.referralDate || ""}
              onChange={handleChange}
              data-aoi="Referral Date Input"
            />
          </div>
          <div className="form-row" data-aoi="Referral Source Row">
            <label htmlFor="referral-source" data-aoi="Referral Source Label">
              Referral Source
            </label>
            <select
              id="referral-source"
              name="referralSource"
              value={formData.referralSource || ""}
              onChange={handleChange}
              data-aoi="Referral Source Select"
              style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="" data-aoi="Referral Source Option Empty">
              </option>
              {agencies.map((agency) => (
                <option
                  key={agency.agency_id}
                  value={agency.agency_name}
                  data-aoi={`Referral Source Option ${agency.agency_id}`}
                >
                  {agency.agency_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="add-button"
              onClick={handleOpenNewAgencyModal}
              data-aoi="Add Referral Source Button"
            >
              + Add
            </button>
          </div>
          <div className="form-row" data-aoi="Person Select Row">
            <label htmlFor="person-select" data-aoi="Person Select Label">
              Person
            </label>
            <select
              id="person-select"
              name="selectedEmployeeId"
              value={formData.selectedEmployeeId || ""}
              onChange={handleChange}
              data-aoi="Person Select Input"
              style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="" data-aoi="Person Select Option">
              </option>
              {employees.map((employee) => {
                const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
                return (
                  <option
                    key={employee.employee_id}
                    value={employee.employee_id ? employee.employee_id.toString() : ""}
                    data-aoi={`Person Select Option ${employee.employee_id}`}
                  >
                    {fullName || `Employee ${employee.employee_id}`}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              className="add-button"
              onClick={handleOpenNewPersonnelModal}
              data-aoi="Add Person Button"
            >
              + Add
            </button>
          </div>
        </section>

        {/* 2. CUSTOM FIELDS SECTION */}
        <section className="mh-section" data-aoi="Custom Fields Section">
          <h2 data-aoi="Custom Fields Header">Custom Fields</h2>
          {/* MH_Abuse Type */}
          <div className="form-row" data-aoi="MH Abuse Type Row">
            <label data-aoi="MH Abuse Type Label">MH_Abuse Type 1</label>
            <div className="checkbox-group" data-aoi="MH Abuse Type Group">
              {/* Left column: Yes, Addiction, SA */}
              <label data-aoi="MH Abuse Yes Checkbox">
                <input
                  type="checkbox"
                  name="mhAbuseType"
                  value="Yes"
                  data-aoi="MH Abuse Yes Input"
                />
                Yes
              </label>
              <label data-aoi="MH Abuse Addiction Checkbox">
                <input
                  type="checkbox"
                  name="mhAbuseType"
                  value="Addiction"
                  data-aoi="MH Abuse Addiction Input"
                />
                Addiction
              </label>
              <label data-aoi="MH Abuse SA Checkbox">
                <input
                  type="checkbox"
                  name="mhAbuseType"
                  value="SA"
                  data-aoi="MH Abuse SA Input"
                />
                SA
              </label>
              {/* Middle column: No, DV */}
              <label data-aoi="MH Abuse No Checkbox">
                <input
                  type="checkbox"
                  name="mhAbuseType"
                  value="No"
                  data-aoi="MH Abuse No Input"
                />
                No
              </label>
              <label data-aoi="MH Abuse DV Checkbox">
                <input
                  type="checkbox"
                  name="mhAbuseType"
                  value="DV"
                  data-aoi="MH Abuse DV Input"
                />
                DV
              </label>
              {/* Right column: Bullying, PA */}
              <label data-aoi="MH Abuse Bullying Checkbox">
                <input
                  type="checkbox"
                  name="mhAbuseType"
                  value="Bullying"
                  data-aoi="MH Abuse Bullying Input"
                />
                Bullying
              </label>
              <label data-aoi="MH Abuse PA Checkbox">
                <input
                  type="checkbox"
                  name="mhAbuseType"
                  value="PA"
                  data-aoi="MH Abuse PA Input"
                />
                PA
              </label>
            </div>
          </div>
          {/* Status of Mental Health Referral */}
          <div className="form-row" data-aoi="MH Referral Status Row">
            <label data-aoi="MH Referral Status Label">Status of Mental Health Referral 2</label>
            <div className="checkbox-group" data-aoi="MH Referral Status Group">
              <label data-aoi="Referral Declined Checkbox">
                <input
                  type="checkbox"
                  name="mhReferralStatus"
                  value="declined"
                  data-aoi="Referral Declined Input"
                />
                Declined/Already receiving therapy services
              </label>
              <label data-aoi="Referral Waiting List Checkbox">
                <input
                  type="checkbox"
                  name="mhReferralStatus"
                  value="waitingList"
                  data-aoi="Referral Waiting List Input"
                />
                Accepted: On Waiting List
              </label>
              <label data-aoi="Referral Attending Checkbox">
                <input
                  type="checkbox"
                  name="mhReferralStatus"
                  value="attending"
                  data-aoi="Referral Attending Input"
                />
                Accepted: Attending Therapy Sessions
              </label>
            </div>
          </div>
          {/* Seen For MH Services Elsewhere */}
          <div className="form-row" data-aoi="Seen Elsewhere Row">
            <label htmlFor="seenElsewhere" data-aoi="Seen Elsewhere Label">
              Seen For MH Services Elsewhere (3)
            </label>
            <input
              type="text"
              id="seenElsewhere"
              name="seenElsewhere"
              data-aoi="Seen Elsewhere Input"
            />
          </div>
          {/* PsychoSocial Notes (4) with + button */}
          <div className="form-row" data-aoi="PsychoSocial Notes Row">
            <label
              htmlFor="psychoSocialNotes"
              data-aoi="PsychoSocial Notes Label"
            >
              Psycho/Social Notes (4)
            </label>
            <div className="plus-group" data-aoi="PsychoSocial Notes Group">
              <input
                type="text"
                id="psychoSocialNotes"
                name="psychoSocialNotes"
                data-aoi="PsychoSocial Notes Input"
              />
              <button
                type="button"
                className="add-button"
                data-aoi="Add PsychoSocial Note Button"
              >
                +
              </button>
            </div>
          </div>
          {/* MH Extended Services Candidate */}
          <div className="form-row" data-aoi="MH Extended Services Candidate Row">
            <label
              htmlFor="mhExtendedServicesCandidate"
              data-aoi="MH Extended Services Candidate Label"
            >
              MH Extended Services Candidate? (5)
            </label>
            <select
              id="mhExtendedServicesCandidate"
              name="mhExtendedServicesCandidate"
              data-aoi="MH Extended Services Candidate Select"
            >
              <option value="" data-aoi="MH Extended Services Candidate Option">
              </option>
              <option value="Urgent Need" data-aoi="MH Extended Services Urgent Need Option">
                Urgent Need
              </option>
              {Array.from({ length: 30 }, (_, i) => i + 4).map((num) => (
                <option
                  key={num}
                  value={num.toString()}
                  data-aoi={`MH Extended Services Option ${num}`}
                >
                  {num}
                </option>
              ))}
              <option value="If Space Allows" data-aoi="MH Extended Services If Space Allows Option">
                If Space Allows
              </option>
            </select>
          </div>
          {/* MH - Services Custom Field #5 */}
          <div className="form-row" data-aoi="MH Custom Field 5 Row">
            <label htmlFor="mhCustomField5" data-aoi="MH Custom Field 5 Label">
              MH - Services Custom Field #5
            </label>
            <input
              type="text"
              id="mhCustomField5"
              name="mhCustomField5"
              data-aoi="MH Custom Field 5 Input"
            />
          </div>
          {/* MH - Services Custom Field #6 */}
          <div className="form-row" data-aoi="MH Custom Field 6 Row">
            <label htmlFor="mhCustomField6" data-aoi="MH Custom Field 6 Label">
              MH - Services Custom Field #6
            </label>
            <input
              type="text"
              id="mhCustomField6"
              name="mhCustomField6"
              data-aoi="MH Custom Field 6 Input"
            />
          </div>
          {/* MH - Services Custom Field #7 */}
          <div className="form-row" data-aoi="MH Custom Field 7 Row">
            <label htmlFor="mhCustomField7" data-aoi="MH Custom Field 7 Label">
              MH - Services Custom Field #7
            </label>
            <input
              type="text"
              id="mhCustomField7"
              name="mhCustomField7"
              data-aoi="MH Custom Field 7 Input"
            />
          </div>
          {/* Client Declined Services? */}
          <div className="form-row" data-aoi="Client Declined Services Row">
            <label data-aoi="Client Declined Services Label">Client Declined Services? (8)</label>
            <div className="checkbox-group" data-aoi="Client Declined Services Group">
              <label data-aoi="Client Declined Yes Checkbox">
                <input
                  type="checkbox"
                  name="clientDeclinedServices"
                  value="yes"
                  data-aoi="Client Declined Yes Input"
                />
                Yes
              </label>
            </div>
          </div>
          {/* Why Client Declined Services */}
          <div className="form-row" data-aoi="Why Client Declined Services Row">
            <label data-aoi="Why Client Declined Services Label">Why Client Declined Services (9)</label>
            <div className="checkbox-group" data-aoi="Why Client Declined Services Group">
              <label data-aoi="Declined Already Receiving Checkbox">
                <input
                  type="checkbox"
                  name="clientDeclinedReason"
                  value="alreadyReceivingTherapy"
                  data-aoi="Declined Already Receiving Input"
                />
                Already receiving therapy services
              </label>
              <label data-aoi="Declined Family Not Supportive Checkbox">
                <input
                  type="checkbox"
                  name="clientDeclinedReason"
                  value="familyNotSupportive"
                  data-aoi="Declined Family Not Supportive Input"
                />
                Family didn't think needed/not supportive
              </label>
            </div>
          </div>
        </section>

        {/* 3. TELEHEALTH SERVICES SECTION */}
        <section className="mh-section" data-aoi="Telehealth Services Section">
          <h2 data-aoi="Telehealth Services Header">Telehealth Services</h2>
          <div className="form-row" data-aoi="Miles Saved Row">
            <label htmlFor="milesSaved" data-aoi="Miles Saved Label">
              Number of Miles Saved Providing Telehealth Services Per Session
            </label>
            <input
              type="number"
              id="milesSaved"
              name="milesSaved"
              data-aoi="Miles Saved Input"
            />
          </div>
          <div className="form-row" data-aoi="Telehealth Barriers Row">
            <label data-aoi="Telehealth Barriers Label">
              Barriers Encountered During Mental Health Services
            </label>
            <div className="checkbox-group column-layout" data-aoi="Telehealth Barriers Group">
              <label data-aoi="Barrier No Services Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="noServicesNeeded"
                  data-aoi="Barrier No Services Input"
                />
                Center doesn't offer the Services needed
              </label>
              <label data-aoi="Barrier Concerned Others Think Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="concernedOthersThink"
                  data-aoi="Barrier Concerned Others Think Input"
                />
                Concerned about what others would think about seeking services
              </label>
              <label data-aoi="Barrier Cost Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="cost"
                  data-aoi="Barrier Cost Input"
                />
                Cost of services
              </label>
              <label data-aoi="Barrier Distance Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="distance"
                  data-aoi="Barrier Distance Input"
                />
                Distance to mental health services clinic
              </label>
              <label data-aoi="Barrier Program Criteria Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="programCriteria"
                  data-aoi="Barrier Program Criteria Input"
                />
                Doesn't Fit Program Criteria
              </label>
              <label data-aoi="Barrier Family Perceived Lack Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="familyPerceivedLack"
                  data-aoi="Barrier Family Perceived Lack Input"
                />
                Family Perceived Lack of Need
              </label>
              <label data-aoi="Barrier Transportation Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="transportation"
                  data-aoi="Barrier Transportation Input"
                />
                Lack of Transportation
              </label>
              <label data-aoi="Barrier Language Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="language"
                  data-aoi="Barrier Language Input"
                />
                Language - Provider does not speak my preferred language
              </label>
              <label data-aoi="Barrier Childcare Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="childcare"
                  data-aoi="Barrier Childcare Input"
                />
                Need for Childcare
              </label>
              <label data-aoi="Barrier No Insurance Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="noInsurance"
                  data-aoi="Barrier No Insurance Input"
                />
                No insurance
              </label>
              <label data-aoi="Barrier Other Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="other"
                  data-aoi="Barrier Other Input"
                />
                Other
              </label>
              <label data-aoi="Barrier Other Acute Family Needs Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="otherAcuteFamilyNeeds"
                  data-aoi="Barrier Other Acute Family Needs Input"
                />
                Other Acute Family Needs
              </label>
              <label data-aoi="Barrier Scheduling Difficulty Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="schedulingDifficulty"
                  data-aoi="Barrier Scheduling Difficulty Input"
                />
                Scheduling Difficulty
              </label>
              <label data-aoi="Barrier Waitlist Too Long Checkbox">
                <input
                  type="checkbox"
                  name="telehealthBarriers"
                  value="waitlistTooLong"
                  data-aoi="Barrier Waitlist Too Long Input"
                />
                Waitlist Too Long
              </label>
            </div>
          </div>
        </section>

        {/* 4. MENTAL HEALTH PROVIDER LOG SECTION */}
        <section className="mh-section" data-aoi="Provider Log Section">
          <h2 data-aoi="Provider Log Header">Mental Health Provider Log</h2>
          <div className="mh-log-actions" data-aoi="Provider Log Actions">
            <button
              type="button"
              className="session-log-button"
              onClick={() => setMhProviderModalOpen(true)}
              data-aoi="Add Provider Button"
            >
              + Add Provider
            </button>
            <button
              type="button"
              className="session-log-button"
              data-aoi="Provider Details Button"
            >
              Details
            </button>
          </div>
          <table className="mh-log-table" data-aoi="Provider Log Table">
            <thead data-aoi="Provider Log Table Header">
              <tr>
                <th data-aoi="Date Services Offered Header">
                  Date Services Offered
                </th>
                <th data-aoi="Agency Header">Agency</th>
                <th data-aoi="Therapist Header">Therapist</th>
                <th data-aoi="Referral Type Header">Referral Type</th>
                <th data-aoi="Case Number Header">Case #</th>
              </tr>
            </thead>
            <tbody data-aoi="Provider Log Table Body">
              <tr data-aoi="Provider Log Example Row">
                <td data-aoi="Example Date Services Offered">08/30/2015</td>
                <td data-aoi="Example Agency">Anderson SW Team</td>
                <td data-aoi="Example Therapist">Sylvia Jones</td>
                <td data-aoi="Example Referral Type">Therapy</td>
                <td data-aoi="Example Case Number">12345</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 5. OUTSIDE REFERRALS SECTION */}
        <section className="mh-section" data-aoi="Outside Referrals Section">
          <h2 data-aoi="Outside Referrals Header">Outside Referrals</h2>
          <button
            type="button"
            className="session-log-button"
            onClick={() => setOutsideReferralModalOpen(true)}
            data-aoi="Add Outside Referral Button"
          >
            + Add New Referral
          </button>
          <table className="mh-log-table" data-aoi="Outside Referrals Table">
            <thead data-aoi="Outside Referrals Table Header">
              <tr>
                <th data-aoi="Referral Date Header">Referral Date</th>
                <th data-aoi="Referred To Header">Referred To</th>
                <th data-aoi="Comments Header">Comments</th>
              </tr>
            </thead>
            <tbody data-aoi="Outside Referrals Table Body">
              <tr data-aoi="No Outside Referrals Row">
                <td colSpan="3">No items to display</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 6. ADDITIONAL POINTS OF CONTACT SECTION */}
        <section className="mh-section" data-aoi="Additional Points of Contact Section">
          <h2 data-aoi="Additional Points of Contact Header">
            Additional Points of Contact
          </h2>
          <button
            type="button"
            className="session-log-button"
            onClick={() => setPointOfContactModalOpen(true)}
            data-aoi="Add Point of Contact Button"
          >
            + Add New Point of Contact
          </button>
          <table className="mh-log-table" data-aoi="Points of Contact Table">
            <thead data-aoi="Points of Contact Table Header">
              <tr>
                <th data-aoi="Action Header">Action</th>
                <th data-aoi="Agency Header">Agency</th>
                <th data-aoi="Name Header">Name</th>
                <th data-aoi="Phone Header">Phone</th>
                <th data-aoi="Email Header">Email</th>
              </tr>
            </thead>
            <tbody data-aoi="Points of Contact Table Body">
              <tr data-aoi="No Points of Contact Row">
                <td colSpan="5">No items to display</td>
              </tr>
            </tbody>
          </table>
        </section>

          {/* 7. CONTACT INFO SECTION */}
        <section className="mh-section" data-aoi="Contact Info Section">
          <h2 data-aoi="Contact Info Header">Contact Info</h2>
          <div className="contact-info-row" data-aoi="Contact Info Row">
            <div className="contact-box" data-aoi="Client Contact Info Box">
              <label
                htmlFor="clientContactInfo"
                data-aoi="Client Contact Info Label"
              >
                Client Contact Info
              </label>
              <div
                id="clientContactInfo"
                name="clientContactInfo"
                data-aoi="Client Contact Info Display"
                style={{
                  minHeight: '100px',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9',
                  whiteSpace: 'pre-wrap',
                  overflowY: 'auto',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              >
                {clientContactInfo}
              </div>
            </div>
            <div className="contact-box" data-aoi="Parent Contact Info Box">
              <label
                htmlFor="parentContactInfo"
                data-aoi="Parent Contact Info Label"
              >
                Parent Contact Info
              </label>
              <div
                id="parentContactInfo"
                name="parentContactInfo"
                data-aoi="Parent Contact Info Display"
                style={{
                  minHeight: '100px',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9',
                  whiteSpace: 'pre-wrap',
                  overflowY: 'auto',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              >
                {parentContactInfo}
              </div>
            </div>
            <div className="contact-box" data-aoi="Date Therapy Completed Box">
              <label
                htmlFor="dateTherapyCompleted"
                data-aoi="Date Therapy Completed Label"
              >
                Date Therapy Completed
              </label>
              <input
                type="date"
                id="dateTherapyCompleted"
                name="dateTherapyCompleted"
                data-aoi="Date Therapy Completed Input"
              />
            </div>
          </div>
        </section>

        {/* 8. UPLOADED DOCUMENTS SECTION */}
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

        {/* STICKY BOTTOM BUTTONS - Appears when scrolling */}
        <div className="mh-action-buttons mh-action-buttons-sticky" data-aoi="Sticky Action Buttons">
          <button 
            type="button" 
            className="save-button" 
            data-aoi="Sticky Save Button" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "SAVING..." : "SAVE"}
          </button>
          <button 
            type="button" 
            className="cancel-button" 
            data-aoi="Sticky Cancel Button"
            onClick={handleCancel}
          >
            CANCEL
          </button>
        </div>
      </form>

      {/* New Agency Modal */}
      <NewAgencyModal
        open={newAgencyModalOpen}
        onClose={handleCloseNewAgencyModal}
        onSelectAgency={handleAgencySelect}
      />

      {/* New Personnel Modal */}
      <NewPersonnelModal
        open={newPersonnelModalOpen}
        onClose={handleCloseNewPersonnelModal}
        onSelectPersonnel={handlePersonnelSelect}
      />

      {/* MH Provider Modal */}
      <MHProviderModal
        open={mhProviderModalOpen}
        onClose={() => setMhProviderModalOpen(false)}
        onSave={(provider) => {
          // Reload provider list or update UI as needed
          console.log("Provider created:", provider);
          setMhProviderModalOpen(false);
        }}
      />

      {/* Outside Referral Modal */}
      <OutsideReferralModal
        open={outsideReferralModalOpen}
        onClose={() => setOutsideReferralModalOpen(false)}
        onSave={(referral) => {
          // Reload referral list or update UI as needed
          console.log("Outside referral created:", referral);
          setOutsideReferralModalOpen(false);
        }}
      />

      {/* Point of Contact Modal */}
      <PointOfContactModal
        open={pointOfContactModalOpen}
        onClose={() => setPointOfContactModalOpen(false)}
        onSave={(contact) => {
          // Reload contact list or update UI as needed
          console.log("Point of contact created:", contact);
          setPointOfContactModalOpen(false);
        }}
      />
    </div>
  );
}

export default MHBasicInterface;
