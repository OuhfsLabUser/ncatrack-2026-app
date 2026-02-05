CREATE TABLE case_mh_session_attendee (
    person_id INTEGER NOT NULL,
    cac_id SMALLINT NOT NULL,
    case_id INTEGER NOT NULL,
    case_mh_session_attendee_id INTEGER PRIMARY KEY,
    case_mh_session_id INTEGER NOT NULL,
    FOREIGN KEY(person_id) REFERENCES person(person_id),
    FOREIGN KEY(cac_id) REFERENCES child_advocacy_center(cac_id),
    FOREIGN KEY(case_id) REFERENCES cac_case(case_id),
    FOREIGN KEY(case_mh_session_id) REFERENCES case_mh_session_log_enc(case_mh_session_id)
);