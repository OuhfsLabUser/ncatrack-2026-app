CREATE TABLE case_mh_assessment (
    cac_id SMALLINT NOT NULL,
    case_id INTEGER NOT NULL,
    assessment_id INTEGER PRIMARY KEY,
    mh_provider_agency_id INTEGER,
    timing_id INTEGER,
    session_date DATE,
    assessment_date DATE,
    agency_id INTEGER,
    provider_employee_id INTEGER,
    assessment_instrument_id INTEGER,
    comments VARCHAR(255),
    FOREIGN KEY(cac_id) REFERENCES child_advocacy_center(cac_id),
    FOREIGN KEY(case_id) REFERENCES cac_case(case_id),
    FOREIGN KEY(mh_provider_agency_id) REFERENCES cac_agency(agency_id),
    FOREIGN KEY(agency_id) REFERENCES cac_agency(agency_id),
    FOREIGN KEY(provider_employee_id) REFERENCES employee(employee_id),
    FOREIGN KEY(assessment_instrument_id) REFERENCES case_mh_assessment_instrument(instrument_id)
);