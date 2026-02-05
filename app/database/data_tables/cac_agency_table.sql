CREATE TABLE cac_agency (
    agency_id INTEGER PRIMARY KEY,
    cac_id SMALLINT NOT NULL,
    agency_name VARCHAR(100) NOT NULL,
    addr_line_1 VARCHAR(50),
    addr_line_2 VARCHAR(50),
    city VARCHAR(20),
    state_abbr VARCHAR(2),
    phone_number VARCHAR(20),
    zip_code VARCHAR(20),
    FOREIGN KEY(cac_id) REFERENCES child_advocacy_center(cac_id)
);