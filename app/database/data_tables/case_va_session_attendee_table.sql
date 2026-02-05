CREATE TABLE case_va_session_attendee (
    case_id INTEGER NOT NULL,
    case_va_session_attendee_id INTEGER PRIMARY KEY,
    case_va_session_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    FOREIGN KEY(case_id) REFERENCES cac_case(case_id),
    FOREIGN KEY(case_va_session_id) REFERENCES case_va_session_log(case_va_session_id),
    FOREIGN KEY(person_id) REFERENCES person(person_id)
);