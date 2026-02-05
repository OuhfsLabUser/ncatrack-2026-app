// src/components/DocumentUploadSection.js
import React, { useState } from "react";
import "./DocumentUploadSection.css";
import "./SessionLogAppointments.css"; // Import styles for Document Upload
import "./MHBasicInterface.css"; // Import MH-Basic styles for section consistency

/**
 * DocumentUploadSection Component
 * A reusable component for document upload functionality
 * 
 * @param {Array} documents - Array of document objects with properties: fileName, uploadDate, user, page, size, removed, lastRemoved
 * @param {Function} onFileSelect - Callback function when "Select files..." button is clicked
 * @param {Function} onDisplayRemovedChange - Callback function when "Display Removed Files" checkbox is changed
 * @param {Function} onPageChange - Callback function when pagination page changes
 * @param {Function} onItemsPerPageChange - Callback function when items per page changes
 * @param {boolean} showRemovedCheckbox - Whether to show "Display Removed Files" checkbox (default: true)
 * @param {boolean} showInstructions - Whether to show upload instructions (default: true)
 * @param {string} sectionTitle - Title of the section (default: "Document Upload")
 */
const DocumentUploadSection = ({
  documents = [],
  onFileSelect,
  onDisplayRemovedChange,
  onPageChange,
  onItemsPerPageChange,
  showRemovedCheckbox = true,
  showInstructions = true,
  sectionTitle = "Document Upload"
}) => {
  const [displayRemovedFiles, setDisplayRemovedFiles] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const handleDisplayRemovedChange = (e) => {
    const newValue = e.target.checked;
    setDisplayRemovedFiles(newValue);
    if (onDisplayRemovedChange) {
      onDisplayRemovedChange(newValue);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  const handleItemsPerPageChange = (e) => {
    const newValue = Number(e.target.value);
    setItemsPerPage(newValue);
    setCurrentPage(0); // Reset to first page when changing items per page
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newValue);
    }
  };

  const handleFileSelect = () => {
    if (onFileSelect) {
      onFileSelect();
    }
  };

  return (
    <section className="mh-section document-upload-section" data-aoi="Document Upload Section">
      <h2 data-aoi="Document Upload Header">{sectionTitle}</h2>
      
      {/* Display Removed Files Checkbox */}
      {showRemovedCheckbox && (
        <div className="document-upload-controls" data-aoi="Document Upload Controls">
          <label className="display-removed-checkbox" data-aoi="Display Removed Files Checkbox">
            <input
              type="checkbox"
              checked={displayRemovedFiles}
              onChange={handleDisplayRemovedChange}
              data-aoi="Display Removed Files Input"
            />
            Display Removed Files
          </label>
        </div>
      )}

      {/* Document Table */}
      <div className="document-upload-table-container" data-aoi="Document Upload Table Container">
        <table className="document-upload-table" data-aoi="Document Upload Table">
          <thead data-aoi="Document Upload Table Header">
            <tr>
              <th data-aoi="Table Header File Name">File Name</th>
              <th data-aoi="Table Header Upload Date">
                Upload Date
                <span className="sort-indicator" data-aoi="Sort Indicator">▼</span>
              </th>
              <th data-aoi="Table Header User">
                User
                <span className="sort-indicator" data-aoi="Sort Indicator">▼</span>
              </th>
              <th data-aoi="Table Header Page">
                Page
                <span className="sort-indicator" data-aoi="Sort Indicator">▼</span>
              </th>
              <th data-aoi="Table Header Size">
                Size
                <span className="sort-indicator" data-aoi="Sort Indicator">▼</span>
              </th>
              <th data-aoi="Table Header Removed">Removed</th>
              <th data-aoi="Table Header Last Removed">Last Removed</th>
            </tr>
          </thead>
          <tbody data-aoi="Document Upload Table Body">
            {documents.length === 0 ? (
              <tr data-aoi="No Documents Row">
                <td colSpan="7" className="no-documents-cell" data-aoi="No Documents Cell">
                  <span className="no-items-text" data-aoi="No Items Text">No items to display</span>
                </td>
              </tr>
            ) : (
              documents.map((doc, index) => (
                <tr key={doc.id || index} data-aoi="Document Row">
                  <td data-aoi="File Name Cell">{doc.fileName || "N/A"}</td>
                  <td data-aoi="Upload Date Cell">{doc.uploadDate || "N/A"}</td>
                  <td data-aoi="User Cell">{doc.user || "N/A"}</td>
                  <td data-aoi="Page Cell">{doc.page || "N/A"}</td>
                  <td data-aoi="Size Cell">{doc.size || "N/A"}</td>
                  <td data-aoi="Removed Cell">{doc.removed ? "Yes" : "No"}</td>
                  <td data-aoi="Last Removed Cell">{doc.lastRemoved || "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="document-upload-pagination" data-aoi="Document Upload Pagination">
        <button
          type="button"
          className="pagination-button"
          onClick={() => handlePageChange(0)}
          disabled={currentPage === 0}
          data-aoi="First Page Button"
        >
          ««
        </button>
        <button
          type="button"
          className="pagination-button"
          onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
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
          onClick={() => handlePageChange(currentPage + 1)}
          data-aoi="Next Page Button"
        >
          »
        </button>
        <button
          type="button"
          className="pagination-button"
          onClick={() => handlePageChange(999)}
          data-aoi="Last Page Button"
        >
          »»
        </button>
        <select
          className="pagination-items-per-page"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          data-aoi="Items Per Page Select"
        >
          <option value={5}>5</option>
          <option value={6}>6</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span className="pagination-items-text" data-aoi="Items Per Page Text">
          items per page
        </span>
      </div>

      {/* Select Files Button */}
      <button
        type="button"
        className="select-files-button"
        onClick={handleFileSelect}
        data-aoi="Select Files Button"
      >
        Select files...
      </button>

      {/* File Size Info */}
      <p className="file-size-info" data-aoi="File Size Info">
        Maximum allowed file size is <strong>10 MB</strong>.
      </p>

      {/* Upload Instructions */}
      {showInstructions && (
        <div className="upload-instructions" data-aoi="Upload Instructions">
          <div className="upload-instruction-item" data-aoi="Instruction 1">
            <span className="instruction-number">1.</span>
            <span className="instruction-text">Find the file on your computer or device</span>
          </div>
          <div className="upload-instruction-item" data-aoi="Instruction 2">
            <span className="instruction-number">2.</span>
            <span className="instruction-text">Confirm the file is the file you want to upload</span>
          </div>
          <div className="upload-instruction-item" data-aoi="Instruction 3">
            <span className="instruction-number">3.</span>
            <span className="instruction-text">Upload the file to CARE</span>
          </div>
          <div className="upload-instruction-item" data-aoi="Instruction 4">
            <span className="instruction-number">4.</span>
            <span className="instruction-text">Confirm the file appears on the grid above. Done!</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default DocumentUploadSection;

