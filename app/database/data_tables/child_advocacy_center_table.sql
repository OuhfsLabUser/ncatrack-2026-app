CREATE TABLE child_advocacy_center (
    cac_id SMALLINT PRIMARY KEY,
    cac_name VARCHAR(50) NOT NULL,
    addr_line_1 VARCHAR(50),
    addr_line_2 VARCHAR(50),
    city VARCHAR(20),
    state_abbr VARCHAR(2),
    phone_number VARCHAR(20),
    zip_code VARCHAR(20)
);