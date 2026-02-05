// src/components/MHAssessment.js
import React, { useState, useEffect } from "react";
import "./MHAssessment.css";
import "./MHBasicInterface.css"; // Import MH Basic styles for section consistency
import "./SessionLogAppointments.css"; // Import table and pagination styles
import DocumentUploadSection from "./DocumentUploadSection";
import AssessmentModal from "./AssessmentModal";
import DiagnosisModal from "./DiagnosisModal";
import { useCase } from "../context/CaseContext";
import { mentalHealthApi } from "../services/api";

const MHAssessment = () => {
  const { currentCase } = useCase();
  
  // Assessments Given state
  const [assessments, setAssessments] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [assessmentEditData, setAssessmentEditData] = useState(null);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  // Diagnosis Log state
  const [diagnoses, setDiagnoses] = useState([]);
  const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
  const [diagnosisEditData, setDiagnosisEditData] = useState(null);
  const [loadingDiagnoses, setLoadingDiagnoses] = useState(false);

  // Data mapping functions
  const mapAssessment = (assessment) => {
    // Map backend assessment data to frontend table format
    const instrumentName = assessment.case_mh_assessment_instrument?.assessment_name || "N/A";
    
    // Timing: map timing_id to human‑readable label consistent with modal options
    let timing = "N/A";
    if (assessment.timing_id) {
      const timingMap = {
        1: "Pre-Treatment",
        2: "Mid-Treatment",
        3: "Post-Treatment"
      };
      timing = timingMap[assessment.timing_id] || "N/A";
    }
    
    // Format assessment date
    let date = "N/A";
    if (assessment.assessment_date) {
      try {
        const dateObj = assessment.assessment_date instanceof Date 
          ? assessment.assessment_date 
          : new Date(assessment.assessment_date);
        if (!isNaN(dateObj.getTime())) {
          date = dateObj.toISOString().split('T')[0];
        }
      } catch (err) {
        console.error("Error formatting assessment date:", err);
      }
    }
    
    // Provider Personnel: combine first_name and last_name
    let providerPersonnel = "N/A";
    if (assessment.employee) {
      const firstName = assessment.employee.first_name || "";
      const lastName = assessment.employee.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      providerPersonnel = fullName || "N/A";
    }
    
    return {
      instrumentName,
      timing,
      date,
      providerPersonnel,
      // Keep original data for reference
      _original: assessment
    };
  };

  const mapDiagnosis = (diagnosis) => {
    // Map backend diagnosis data to frontend table format
    const agency = diagnosis.agency_name || "N/A";
    
    // Therapist: Get from employee first_name and last_name
    let therapist = "N/A";
    if (diagnosis.employee_first_name || diagnosis.employee_last_name) {
      const firstName = diagnosis.employee_first_name || "";
      const lastName = diagnosis.employee_last_name || "";
      therapist = `${firstName} ${lastName}`.trim() || "N/A";
    }
    
    // Format diagnosis date
    let diagnosisDate = "N/A";
    if (diagnosis.diagnosis_date) {
      try {
        const dateObj = diagnosis.diagnosis_date instanceof Date 
          ? diagnosis.diagnosis_date 
          : new Date(diagnosis.diagnosis_date);
        if (!isNaN(dateObj.getTime())) {
          diagnosisDate = dateObj.toISOString().split('T')[0];
        }
      } catch (err) {
        console.error("Error formatting diagnosis date:", err);
      }
    }
    
    // Diagnosis: backend doesn't return ICD10 diagnosis name, so leave empty for now
    const diagnosisName = ""; // Will be "N/A" in display
    
    return {
      agency,
      therapist: therapist || "N/A",
      diagnosisDate,
      diagnosis: diagnosisName || "N/A",
      // Keep original data for reference
      _original: diagnosis
    };
  };

  const resolveCaseId = (value) => {
    if (!value || value === 'create-new' || value === 'search-case') return null;
    const id = typeof value === 'string' ? parseInt(value, 10) : value;
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  // Load assessments and diagnoses when currentCase changes
  useEffect(() => {
    const loadData = async () => {
      const caseId = resolveCaseId(currentCase);
      // Early return if no case selected
      if (!caseId) {
        setAssessments([]);
        setDiagnoses([]);
        return;
      }

      try {
        setLoadingAssessments(true);
        setLoadingDiagnoses(true);

        // Load assessments and diagnoses in parallel
        const [assessmentsData, diagnosesData] = await Promise.all([
          mentalHealthApi.getAssessmentsByCaseId(caseId),
          mentalHealthApi.getDiagnosesByCaseId(caseId)
        ]);

        // Map assessments data
        const mappedAssessments = Array.isArray(assessmentsData) 
          ? assessmentsData.map(mapAssessment)
          : [];
        setAssessments(mappedAssessments);

        // Map diagnoses data
        const mappedDiagnoses = Array.isArray(diagnosesData)
          ? diagnosesData.map(mapDiagnosis)
          : [];
        setDiagnoses(mappedDiagnoses);

      } catch (err) {
        console.error("Error loading assessment data:", err);
        setAssessments([]);
        setDiagnoses([]);
      } finally {
        setLoadingAssessments(false);
        setLoadingDiagnoses(false);
      }
    };

    loadData();
  }, [currentCase]);

  const handleAddNewAssessment = () => {
    setAssessmentEditData(null);
    setAssessmentModalOpen(true);
  };

  const handleEditAssessment = (assessment) => {
    setAssessmentEditData(assessment?._original || null);
    setAssessmentModalOpen(true);
  };

  const handleEditDiagnosis = (diagnosis) => {
    const originalData = diagnosis?._original;
    if (!originalData) {
      console.error("Cannot edit: diagnosis data is missing", { originalData });
      alert("Cannot edit: diagnosis data is missing");
      return;
    }
    
    // Set edit data and open modal
    setDiagnosisEditData(originalData);
    setDiagnosisModalOpen(true);
  };

  const handleDeleteDiagnosis = async (diagnosis) => {
    const originalData = diagnosis?._original;
    console.log("handleDeleteDiagnosis called with:", { diagnosis, originalData });
    
    if (!originalData) {
      console.error("Cannot delete: diagnosis data is missing", { originalData });
      alert("Cannot delete: diagnosis data is missing");
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm("Are you sure you want to delete this diagnosis record?");

    if (!confirmed) {
      return;
    }

    try {
      // Prepare diagnosis data for deletion (using composite key)
      const diagnosisData = {
        case_id: originalData.case_id,
        diagnosis_date: originalData.diagnosis_date,
        mh_provider_agency_id: originalData.mh_provider_agency_id || null
      };
      
      // Call delete API
      await mentalHealthApi.deleteDiagnosis(diagnosisData);
      console.log("Diagnosis deleted successfully");
      
      // Reload diagnoses
      const caseId = resolveCaseId(currentCase);
      if (caseId) {
        const diagnosesData = await mentalHealthApi.getDiagnosesByCaseId(caseId);
        const mappedDiagnoses = Array.isArray(diagnosesData)
          ? diagnosesData.map(mapDiagnosis)
          : [];
        setDiagnoses(mappedDiagnoses);
      }
    } catch (err) {
      console.error("Error deleting diagnosis:", err);
      alert("Failed to delete diagnosis: " + (err.message || "Unknown error"));
    }
  };

  const handleDeleteAssessment = async (assessment) => {
    const originalData = assessment?._original;
    console.log("handleDeleteAssessment called with:", { assessment, originalData });
    
    if (!originalData || !originalData.assessment_id) {
      console.error("Cannot delete: assessment data is missing", { originalData });
      alert("Cannot delete: assessment data is missing");
      return;
    }

    const assessmentId = originalData.assessment_id;
    console.log("Deleting assessment with ID:", assessmentId);

    // Show confirmation dialog
    const confirmed = window.confirm("Are you sure you want to delete this record?");

    if (!confirmed) {
      return;
    }

    try {
      // Call delete API
      console.log("Calling deleteAssessment API with ID:", assessmentId);
      await mentalHealthApi.deleteAssessment(assessmentId);
      console.log("Assessment deleted successfully");
      
      // Reload assessments list
      const caseId = resolveCaseId(currentCase);
      if (caseId) {
        const assessmentsData = await mentalHealthApi.getAssessmentsByCaseId(caseId);
        const mappedAssessments = Array.isArray(assessmentsData) 
          ? assessmentsData.map(mapAssessment)
          : [];
        setAssessments(mappedAssessments);
      }
    } catch (err) {
      console.error("Error deleting assessment:", err);
      alert(`Failed to delete assessment: ${err.message || 'Unknown error'}`);
    }
  };

  const handleNotifyStaff = (assessment) => {
    console.log("Notify Staff clicked:", assessment?._original);
    // TODO: Implement notify logic
  };

  const handleAddDiagnosis = () => {
    setDiagnosisEditData(null);
    setDiagnosisModalOpen(true);
  };

  // Reload data after assessment is saved
  const handleAssessmentSave = async (assessment) => {
    console.log("Assessment created:", assessment);
    setAssessmentModalOpen(false);
    setAssessmentEditData(null);
    
    // Reload assessments list
    const caseId = resolveCaseId(currentCase);
    if (caseId) {
      try {
        const assessmentsData = await mentalHealthApi.getAssessmentsByCaseId(caseId);
        const mappedAssessments = Array.isArray(assessmentsData) 
          ? assessmentsData.map(mapAssessment)
          : [];
        setAssessments(mappedAssessments);
      } catch (err) {
        console.error("Error reloading assessments:", err);
      }
    }
  };

  // Reload data after diagnosis is saved
  const handleDiagnosisSave = async (diagnosis) => {
    console.log("Diagnosis saved:", diagnosis);
    setDiagnosisModalOpen(false);
    setDiagnosisEditData(null);
    
    // Reload diagnoses list
    const caseId = resolveCaseId(currentCase);
    if (caseId) {
      try {
        const diagnosesData = await mentalHealthApi.getDiagnosesByCaseId(caseId);
        const mappedDiagnoses = Array.isArray(diagnosesData)
          ? diagnosesData.map(mapDiagnosis)
          : [];
        setDiagnoses(mappedDiagnoses);
      } catch (err) {
        console.error("Error reloading diagnoses:", err);
      }
    }
  };

  const handleCloseAssessmentModal = () => {
    setAssessmentModalOpen(false);
    setAssessmentEditData(null);
  };

  return (
    <div className="mh-container" data-aoi="MH Assessment Container">
      <div className="mh-card" data-aoi="MH Assessment Card">
        {/* ASSESSMENTS GIVEN SECTION */}
        <section className="mh-section" data-aoi="Assessments Given Section">
          <h2 data-aoi="Assessments Given Header">Assessments Given</h2>
          
          {/* Action Button */}
          <div className="assessments-actions" data-aoi="Assessments Actions">
            <button
              type="button"
              className="session-log-button"
              onClick={handleAddNewAssessment}
              data-aoi="Add New Assessment Button"
            >
              + Add New Assessment
            </button>
          </div>

          {/* Table */}
          <div className="assessments-table-container" data-aoi="Assessments Table Container">
            <table className="assessments-table" data-aoi="Assessments Table">
              <thead data-aoi="Assessments Table Header">
                <tr>
                  <th data-aoi="Table Header Action">Action</th>
                  <th data-aoi="Table Header Instrument Name">Assessment Instrument Name</th>
                  <th data-aoi="Table Header Timing">
                    Timing
                    <span className="sort-indicator" data-aoi="Sort Indicator">▼</span>
                  </th>
                  <th data-aoi="Table Header Date">
                    Date
                    <span className="sort-indicator" data-aoi="Sort Indicator">▼</span>
                  </th>
                  <th data-aoi="Table Header Provider Personnel">
                    Provider Personnel
                    <span className="sort-indicator" data-aoi="Sort Indicator">▼</span>
                  </th>
                </tr>
              </thead>
              <tbody data-aoi="Assessments Table Body">
                {assessments.length === 0 ? (
                  <tr data-aoi="No Items Row">
                    <td colSpan="5" className="no-items-cell" data-aoi="No Items Cell">
                      <span className="no-items-text" data-aoi="No Items Text">No items to display</span>
                    </td>
                  </tr>
                ) : (
                  assessments.map((assessment, index) => (
                    <tr key={index} data-aoi="Assessment Row">
                      <td data-aoi="Action Cell">
                        <div className="assessment-action-buttons">
                          <div className="button-row">
                            <button
                              type="button"
                              className="assessment-btn edit"
                              onClick={() => handleEditAssessment(assessment)}
                              data-aoi="Edit Assessment Button"
                            >
                              ✐ Edit
                            </button>
                            <button
                              type="button"
                              className="assessment-btn delete"
                              onClick={() => handleDeleteAssessment(assessment)}
                              data-aoi="Delete Assessment Button"
                            >
                              ✖ Delete
                            </button>
                          </div>
                          <button
                            type="button"
                            className="assessment-btn notify"
                            onClick={() => handleNotifyStaff(assessment)}
                            data-aoi="Notify Staff Button"
                          >
                            Notify Staff
                          </button>
                        </div>
                      </td>
                      <td data-aoi="Instrument Name Cell">{assessment.instrumentName || "N/A"}</td>
                      <td data-aoi="Timing Cell">{assessment.timing || "N/A"}</td>
                      <td data-aoi="Date Cell">{assessment.date || "N/A"}</td>
                      <td data-aoi="Provider Personnel Cell">{assessment.providerPersonnel || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="assessments-pagination" data-aoi="Assessments Pagination">
            <button
              type="button"
              className="pagination-button"
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
              data-aoi="First Page Button"
            >
              ««
            </button>
            <button
              type="button"
              className="pagination-button"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              data-aoi="Previous Page Button"
            >
              «
            </button>
            <span className="pagination-page-number" data-aoi="Page Number">
              {currentPage}
            </span>
            <button
              type="button"
              className="pagination-button"
              onClick={() => setCurrentPage(currentPage + 1)}
              data-aoi="Next Page Button"
            >
              »
            </button>
            <button
              type="button"
              className="pagination-button"
              onClick={() => setCurrentPage(999)}
              data-aoi="Last Page Button"
            >
              »»
            </button>
            <select
              className="pagination-items-per-page"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              data-aoi="Items Per Page Select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="pagination-items-text" data-aoi="Items Per Page Text">
              items per page
            </span>
          </div>
        </section>

        {/* DIAGNOSIS LOG SECTION */}
        <section className="mh-section" data-aoi="Diagnosis Log Section">
          <h2 data-aoi="Diagnosis Log Header">Diagnosis Log</h2>
          
          {/* Action Button */}
          <div className="diagnosis-log-actions" data-aoi="Diagnosis Log Actions">
            <button
              type="button"
              className="add-diagnosis-button"
              onClick={handleAddDiagnosis}
              data-aoi="Add Diagnosis Button"
            >
              + Add Diagnosis
            </button>
          </div>

          {/* Table */}
          <div className="diagnosis-log-table-container" data-aoi="Diagnosis Log Table Container">
            <table className="diagnosis-log-table" data-aoi="Diagnosis Log Table">
              <thead data-aoi="Diagnosis Log Table Header">
                <tr>
                  <th data-aoi="Table Header Action">Action</th>
                  <th data-aoi="Table Header Agency">Agency</th>
                  <th data-aoi="Table Header Therapist">Therapist</th>
                  <th data-aoi="Table Header Diagnosis Date">Diagnosis Date</th>
                  <th data-aoi="Table Header Diagnosis">Diagnosis</th>
                </tr>
              </thead>
              <tbody data-aoi="Diagnosis Log Table Body">
                {diagnoses.length === 0 ? (
                  <tr data-aoi="No Items Row">
                    <td colSpan="5" className="no-items-cell" data-aoi="No Items Cell">
                      <span className="no-items-text" data-aoi="No Items Text">No items to display</span>
                    </td>
                  </tr>
                ) : (
                  diagnoses.map((diagnosis, index) => (
                    <tr key={index} data-aoi="Diagnosis Row">
                      <td data-aoi="Action Cell">
                        <div className="diagnosis-action-buttons">
                          <button
                            type="button"
                            className="diagnosis-btn edit"
                            onClick={() => handleEditDiagnosis(diagnosis)}
                            data-aoi="Edit Diagnosis Button"
                          >
                            ✐ Edit
                          </button>
                          <button
                            type="button"
                            className="diagnosis-btn delete"
                            onClick={() => handleDeleteDiagnosis(diagnosis)}
                            data-aoi="Delete Diagnosis Button"
                          >
                            ✖ Delete
                          </button>
                        </div>
                      </td>
                      <td data-aoi="Agency Cell">{diagnosis.agency || "N/A"}</td>
                      <td data-aoi="Therapist Cell">{diagnosis.therapist || "N/A"}</td>
                      <td data-aoi="Diagnosis Date Cell">{diagnosis.diagnosisDate || "N/A"}</td>
                      <td data-aoi="Diagnosis Cell">{diagnosis.diagnosis || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

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

      {/* Assessment Modal */}
      <AssessmentModal
        open={assessmentModalOpen}
        onClose={handleCloseAssessmentModal}
        onSave={handleAssessmentSave}
        editData={assessmentEditData}
      />

      {/* Diagnosis Modal */}
      <DiagnosisModal
        open={diagnosisModalOpen}
        onClose={() => {
          setDiagnosisModalOpen(false);
          setDiagnosisEditData(null);
        }}
        onSave={handleDiagnosisSave}
        editData={diagnosisEditData}
      />
    </div>
  );
};

export default MHAssessment;
