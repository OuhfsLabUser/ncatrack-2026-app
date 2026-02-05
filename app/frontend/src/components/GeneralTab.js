// src/components/GeneralTab.js
import React from "react";
import AOIInput from "./AOIInput";
import DocumentUploadSection from "./DocumentUploadSection";
import "./GeneralTab.css";

function GeneralTab() {
  // Button handlers (now no‐ops)
  const handleSaveClick = (e) => {};
  const handleCancelClick = (e) => {};
  const handleAddButtonClick = (e, fieldName) => {};
  const handleEditClick = (e, context) => {};

  return (
    <div className="general-tab-container">
      <header className="general-tab-header">
        <h1 data-aoi="Case Tracking Header">Case Tracking</h1>
      </header>

      <form className="general-tab-form">
        {/* 1. CASE TRACKING TABLE */}
        <section className="gt-section" data-aoi="Case Tracking Table Section">
          <table className="gt-table">
            <thead>
              <tr>
                <th data-aoi="Table Header Action">Action</th>
                <th data-aoi="Table Header Service">Service</th>
                <th data-aoi="Table Header Referral Date">Referral Date</th>
                <th data-aoi="Table Header Referred By">Referred By</th>
                <th data-aoi="Table Header Providing Agency">Providing Agency</th>
                <th data-aoi="Table Header Primary Contact">Primary Contact</th>
                <th data-aoi="Table Header Status">Status</th>
                <th data-aoi="Table Header Status Date">Status Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <button
                    type="button"
                    className="gt-edit-button"
                    data-aoi="Edit Case Tracking Row 1"
                    onClick={(e) => handleEditClick(e, "Case Tracking Table")}
                  >
                    Edit
                  </button>
                </td>
                <td data-aoi="Row1 Service">MDT</td>
                <td data-aoi="Row1 Referral Date">07/03/2015</td>
                <td data-aoi="Row1 Referred By">Unknown</td>
                <td data-aoi="Row1 Providing Agency">Anderson SVU Team</td>
                <td data-aoi="Row1 Primary Contact">Jane Doe</td>
                <td data-aoi="Row1 Status">Adjourned</td>
                <td data-aoi="Row1 Status Date">07/03/2015</td>
              </tr>
              <tr>
                <td>
                  <button
                    type="button"
                    className="gt-edit-button"
                    data-aoi="Edit Case Tracking Row 2"
                    onClick={(e) => handleEditClick(e, "Case Tracking Table")}
                  >
                    Edit
                  </button>
                </td>
                <td data-aoi="Row2 Service">MH</td>
                <td data-aoi="Row2 Referral Date">07/03/2015</td>
                <td data-aoi="Row2 Referred By">DCS - Anderson Co.</td>
                <td data-aoi="Row2 Providing Agency">Anderson SVU Team</td>
                <td data-aoi="Row2 Primary Contact">Sylvia Jones</td>
                <td data-aoi="Row2 Status">Referred</td>
                <td data-aoi="Row2 Status Date">01/10/2030</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 2. FIELDS BELOW THE TABLE */}
        <section className="gt-section" data-aoi="Fields Section">
          <AOIInput
            label="Date Received by CAC"
            id="date-received-cac"
            type="date"
            data-aoi="Date Received by CAC Input"
            readOnly
            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
          />

          <div className="form-row">
            <label htmlFor="main-agency" data-aoi="Main Agency Label">
              Main Agency Involved
            </label>
            <AOIInput
              id="main-agency"
              type="text"
              placeholder="Anderson SVU Team"
              data-aoi="Main Agency Input"
            />
            <button
              type="button"
              className="add-button"
              data-aoi="Add Main Agency Button"
              onClick={(e) => handleAddButtonClick(e, "Main Agency")}
            >
              + Add
            </button>
          </div>

          <div className="form-row">
            <label htmlFor="main-personnel" data-aoi="Main Personnel Label">
              Main Personnel Involved
            </label>
            <AOIInput
              id="main-personnel"
              type="text"
              placeholder="Janice Smith"
              data-aoi="Main Personnel Input"
            />
            <button
              type="button"
              className="add-button"
              data-aoi="Add Main Personnel Button"
              onClick={(e) => handleAddButtonClick(e, "Main Personnel")}
            >
              + Add
            </button>
          </div>

          <div className="form-row">
            <label htmlFor="case-closed-reason" data-aoi="Case Closed Reason Label">
              Case Closed Reason
            </label>
            <select
              id="case-closed-reason"
              name="caseClosedReason"
              data-aoi="Case Closed Reason Select"
            >
              <option value="">Select reason...</option>
              <option value="allComplete">All Investigations/Services Completed</option>
              <option value="clientMoved">Client Moved</option>
              <option value="noServicesNeeded">No Services Needed</option>
            </select>
          </div>

          <AOIInput
            label="Case Close Date"
            id="case-close-date"
            type="date"
            data-aoi="Case Close Date Input"
          />

          <div className="form-row checkbox-row">
            <label htmlFor="survey-complete" data-aoi="Survey Complete Label">
              Survey Complete (1)
            </label>
            <input
              type="checkbox"
              id="survey-complete"
              name="surveyComplete"
              data-aoi="Survey Complete Checkbox"
            />
          </div>

          <div className="form-row checkbox-row">
            <label htmlFor="followup-survey-complete" data-aoi="Follow Up Survey Label">
              Follow Up Survey Complete (2)
            </label>
            <input
              type="checkbox"
              id="followup-survey-complete"
              name="followupSurveyComplete"
              data-aoi="Follow Up Survey Checkbox"
            />
          </div>

          <AOIInput
            label="CAC Case # (3)"
            id="cac-case-b"
            type="text"
            placeholder="Enter CAC Case #(B)"
            data-aoi="CAC Case B Input"
          />

          {/* EDUCATION PROGRAM QUESTION */}
          <div className="form-row" data-aoi="Education Program Section">
            <label data-aoi="Education Program Label">
              Did child go through the education program? (4)
            </label>
            <div className="radio-group">
              {["yes", "no", "maybe", "notSure", "notInterested", "denied"].map((val) => (
                <label key={val} data-aoi={`Education Program ${val}`}>
                  <input
                    type="radio"
                    name="educationProgram"
                    value={val}
                  />
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <AOIInput
            label="Test (5)"
            id="test-3"
            type="text"
            placeholder="Optional field"
            data-aoi="Test 5 Input"
          />

          <AOIInput
            label="General - Custom Field (6)"
            id="general-custom-6"
            type="text"
            placeholder="Optional field"
            data-aoi="General Custom 6 Input"
          />

          <AOIInput
            label="General - Custom Field Chp (7)"
            id="general-custom-cfp"
            type="text"
            placeholder="Optional field"
            data-aoi="General Custom CFP Input"
          />

          <div className="form-row checkbox-group-row" data-aoi="Chapter Test Field Section">
            <label data-aoi="Chapter Test Field Label">Chapter Test Field (8)</label>
            <div className="checkbox-group">
              <label data-aoi="No Testing Checkbox">
                <input
                  type="checkbox"
                  name="chapterTestField"
                  value="noTesting"
                />
                No Testing
              </label>
              <label data-aoi="New Client Checkbox">
                <input
                  type="checkbox"
                  name="chapterTestField"
                  value="newClient"
                />
                New Client
              </label>
            </div>
          </div>
        </section>

        {/* 3. CASES LINKED TO THIS ALLEGATION */}
        <section className="gt-section" data-aoi="Linked Cases Section">
          <h2 data-aoi="Linked Cases Header">Cases Linked to this Allegation</h2>
          <button
            type="button"
            className="session-log-button"
            data-aoi="Add Linked Cases Button"
            onClick={(e) => handleAddButtonClick(e, "Linked Cases")}
          >
            + Add new record
          </button>
          <table className="gt-table">
            <thead>
              <tr>
                <th data-aoi="Linked Cases Table Header CAC Case Number">CAC Case Number</th>
                <th data-aoi="Linked Cases Table Header Alleged Victim">Alleged Victim</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="2" data-aoi="No Linked Cases">No items to display</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 4. COURT ACTIVITIES */}
        <section className="gt-section" data-aoi="Court Activities Section">
          <h2 data-aoi="Court Activities Header">Court Activities</h2>
          <button
            type="button"
            className="session-log-button"
            data-aoi="Add Court Activities Button"
            onClick={(e) => handleAddButtonClick(e, "Court Activities")}
          >
            + Add new record
          </button>
          <table className="gt-table">
            <thead>
              <tr>
                <th data-aoi="Court Activities Table Header Court Type">Court Type</th>
                <th data-aoi="Court Activities Table Header Court Date">Court Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="2" data-aoi="No Court Activities">No items to display</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 5. RELEASE OF INFORMATION */}
        <section className="gt-section" data-aoi="Release of Information Section">
          <h2 data-aoi="Release of Information Header">Release of Information</h2>
          <button
            type="button"
            className="session-log-button"
            data-aoi="Add Release of Information Button"
            onClick={(e) => handleAddButtonClick(e, "Release of Information")}
          >
            + Add new record
          </button>
          <table className="gt-table">
            <thead>
              <tr>
                <th data-aoi="Release Info Date Requested">Date Requested</th>
                <th data-aoi="Release Info Requested By">Requested By</th>
                <th data-aoi="Release Info By Subpoena">By Subpoena</th>
                <th data-aoi="Release Info Authorized By">Authorized By</th>
                <th data-aoi="Release Info Released By">Released By</th>
                <th data-aoi="Release Info Records">Records</th>
                <th data-aoi="Release Info Date Released">Date Released</th>
                <th data-aoi="Release Info Date to be Returned">Date to be Returned</th>
                <th data-aoi="Release Info Date Returned">Date Returned</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="9" data-aoi="No Release Info">No items to display</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 6. OUTSIDE REFERRALS */}
        <section className="gt-section" data-aoi="Outside Referrals Section">
          <h2 data-aoi="Outside Referrals Header">Outside Referrals</h2>
          <table className="gt-table">
            <thead>
              <tr>
                <th data-aoi="Outside Referrals Table Header Action">Action</th>
                <th data-aoi="Outside Referrals Table Header Referred From">Referred From</th>
                <th data-aoi="Outside Referrals Table Header Referral Date">Referral Date</th>
                <th data-aoi="Outside Referrals Table Header Referred To">Referred To</th>
                <th data-aoi="Outside Referrals Table Header Comments">Comments</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <button
                    type="button"
                    className="gt-view-button"
                    data-aoi="View Outside Referrals Button"
                    onClick={(e) => handleEditClick(e, "Outside Referrals")}
                  >
                    View
                  </button>
                </td>
                <td data-aoi="Outside Referrals Row1 Referred From">Prosecution</td>
                <td data-aoi="Outside Referrals Row1 Referral Date">11/19/2014</td>
                <td data-aoi="Outside Referrals Row1 Referred To">ChildSafe Therapeutic Foster Care</td>
                <td data-aoi="Outside Referrals Row1 Comments"></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 7. INSURANCE INFORMATION */}
        <section className="gt-section" data-aoi="Insurance Information Section">
          <h2 data-aoi="Insurance Information Header">Insurance Information</h2>
          <div className="insurance-container">
            <div className="insurance-column" data-aoi="Primary Insurance Column">
              <h3 data-aoi="Primary Insurance Header">Primary Insurance</h3>
              <AOIInput label="Company" id="primary-company" type="text" data-aoi="Primary Company Input" />
              <AOIInput label="Subscriber" id="primary-subscriber" type="text" data-aoi="Primary Subscriber Input" />
              <AOIInput label="Policy Number" id="primary-policy" type="text" data-aoi="Primary Policy Input" />
              <AOIInput label="Group" id="primary-group" type="text" data-aoi="Primary Group Input" />
            </div>
            <div className="insurance-column" data-aoi="Secondary Insurance Column">
              <h3 data-aoi="Secondary Insurance Header">Secondary Insurance</h3>
              <AOIInput label="Company" id="secondary-company" type="text" data-aoi="Secondary Company Input" />
              <AOIInput label="Subscriber" id="secondary-subscriber" type="text" data-aoi="Secondary Subscriber Input" />
              <AOIInput label="Policy Number" id="secondary-policy" type="text" data-aoi="Secondary Policy Input" />
              <AOIInput label="Group" id="secondary-group" type="text" data-aoi="Secondary Group Input" />
            </div>
          </div>
          <div className="form-row checkbox-row">
            <label htmlFor="client-received-referral" data-aoi="Client Received Referral Label">
              Has Client received referral?
            </label>
            <input
              type="checkbox"
              id="client-received-referral"
              name="clientReceivedReferral"
              data-aoi="Client Received Referral Checkbox"
            />
          </div>
          <AOIInput label="Primary Clinic" id="primary-clinic" type="text" data-aoi="Primary Clinic Input" />
          <AOIInput label="Primary Provider" id="primary-provider" type="text" data-aoi="Primary Provider Input" />
          <AOIInput label="Primary Provider Phone" id="primary-provider-phone" type="text" data-aoi="Primary Provider Phone Input" />
        </section>

        {/* 8. ICD CODES */}
        <section className="gt-section" data-aoi="ICD Codes Section">
          <h2 data-aoi="ICD Codes Header">ICD Codes</h2>
          <button
            type="button"
            className="session-log-button"
            data-aoi="Add ICD Codes Button"
            onClick={(e) => handleAddButtonClick(e, "ICD Codes")}
          >
            + Add new record
          </button>
          <table className="gt-table">
            <thead>
              <tr>
                <th data-aoi="ICD Codes Table Header Action">Action</th>
                <th data-aoi="ICD Codes Table Header Group">Group</th>
                <th data-aoi="ICD Codes Table Header Code">Code</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <button
                    type="button"
                    className="gt-edit-button"
                    data-aoi="Delete ICD Code 1"
                    onClick={(e) => handleEditClick(e, "ICD Codes")}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="gt-edit-button"
                    data-aoi="Edit ICD Code 1"
                    onClick={(e) => handleEditClick(e, "ICD Codes")}
                  >
                    Edit
                  </button>
                </td>
                <td data-aoi="ICD Code Row1 Group">Child Abuse Diagnosis</td>
                <td data-aoi="ICD Code Row1 Code">995.53 sexual abuse</td>
              </tr>
              <tr>
                <td>
                  <button
                    type="button"
                    className="gt-edit-button"
                    data-aoi="Delete ICD Code 2"
                    onClick={(e) => handleEditClick(e, "ICD Codes")}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="gt-edit-button"
                    data-aoi="Edit ICD Code 2"
                    onClick={(e) => handleEditClick(e, "ICD Codes")}
                  >
                    Edit
                  </button>
                </td>
                <td data-aoi="ICD Code Row2 Group">Physical Abuse Diagnosis</td>
                <td data-aoi="ICD Code Row2 Code">T07 Unspecified multiple injuries</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 9. DOCUMENT UPLOAD */}
        <DocumentUploadSection
          documents={[]}
          onFileSelect={() => {
            // Handle file select
            console.log("File select clicked");
          }}
          showRemovedCheckbox={true}
          showInstructions={true}
          sectionTitle="Document Upload"
        />

        {/* 10. SAVE / CANCEL */}
        <div className="gt-form-buttons" data-aoi="Form Buttons Section">
          <button
            type="submit"
            className="save-button"
            id="save-button"
            data-aoi="Save Button"
            onClick={handleSaveClick}
          >
            SAVE
          </button>
          <button
            type="button"
            className="cancel-button"
            id="cancel-button"
            data-aoi="Cancel Button"
            onClick={handleCancelClick}
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
}

export default GeneralTab;
