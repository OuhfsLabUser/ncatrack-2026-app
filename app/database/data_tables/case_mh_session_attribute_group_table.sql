CREATE TABLE case_mh_session_attribute_group (
    id INTEGER PRIMARY KEY,
    cac_id SMALLINT NOT NULL,
    case_id INTEGER NOT NULL,
    case_mh_session_id INTEGER NOT NULL,
    attribute_group_description VARCHAR(255),
    attributes VARCHAR(255),
    attribute_value INTEGER,
    FOREIGN KEY(cac_id) REFERENCES child_advocacy_center(cac_id),
    FOREIGN KEY(case_id) REFERENCES cac_case(case_id),
    FOREIGN KEY(case_mh_session_id) REFERENCES case_mh_session_log_enc(case_mh_session_id)
);