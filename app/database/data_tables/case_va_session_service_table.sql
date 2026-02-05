CREATE TABLE case_va_session_service (
    cac_id SMALLINT NOT NULL,
    case_va_session_id INTEGER NOT NULL,
    case_va_session_service_id INTEGER PRIMARY KEY,
    service_type_id INTEGER NOT NULL,
    FOREIGN KEY(cac_id) REFERENCES child_advocacy_center(cac_id),
    FOREIGN KEY(case_va_session_id) REFERENCES case_va_session_log(case_va_session_id)
);