CREATE TABLE case_mh_assessment_diagnosis (
    case_id INTEGER NOT NULL,
    diagnosis_date DATE NOT NULL,
    mh_provider_agency_id INTEGER,
    provider_employee_id INTEGER,
    FOREIGN KEY(case_id) REFERENCES cac_case(case_id),
    FOREIGN KEY(mh_provider_agency_id) REFERENCES cac_agency(agency_id),
    FOREIGN KEY(provider_employee_id) REFERENCES employee(employee_id)
);