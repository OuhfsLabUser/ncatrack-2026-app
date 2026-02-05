CREATE TABLE employee (
    employee_id INTEGER PRIMARY KEY,
    agency_id INTEGER NOT NULL,
    cac_id SMALLINT NOT NULL,
    email_addr VARCHAR(50),
    first_name VARCHAR(20),
    last_name VARCHAR(20),
    job_title VARCHAR(200),
    phone_number VARCHAR(20),
    FOREIGN KEY(agency_id) REFERENCES cac_agency(agency_id),
    FOREIGN KEY(cac_id) REFERENCES child_advocacy_center(cac_id)
);