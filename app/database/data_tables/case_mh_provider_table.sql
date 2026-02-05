CREATE TABLE case_mh_provider (
    agency_id INTEGER,
    case_id INTEGER NOT NULL,
    case_number VARCHAR(20),
    id INTEGER PRIMARY KEY,
    lead_employee_id INTEGER,
    provider_type_id INTEGER,
    therapy_accepted BOOLEAN,
    therapy_complete_date DATE,
    therapy_end_reason_id INTEGER,
    therapy_offered_date DATE,
    therapy_record_created BOOLEAN,
    FOREIGN KEY(case_id) REFERENCES cac_case(case_id),
    FOREIGN KEY(agency_id) REFERENCES cac_agency(agency_id),
    FOREIGN KEY(lead_employee_id) REFERENCES employee(employee_id)
);