CREATE TABLE case_va_session_log (
    cac_id SMALLINT NOT NULL,
    case_id INTEGER NOT NULL,
    case_va_session_id INTEGER PRIMARY KEY,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    va_provider_agency_id INTEGER,
    session_date DATE,
    session_status INTEGER,
    FOREIGN KEY(cac_id) REFERENCES child_advocacy_center(cac_id),
    FOREIGN KEY(case_id) REFERENCES cac_case(case_id),
    FOREIGN KEY(va_provider_agency_id) REFERENCES cac_agency(agency_id)
);