CREATE TABLE case_mh_instrument_measure (
    measure_id SERIAL PRIMARY KEY,
    instrument_id INTEGER NOT NULL,
    measure_name VARCHAR(255) NOT NULL,
    sequence INTEGER DEFAULT 0,
    FOREIGN KEY(instrument_id) REFERENCES case_mh_assessment_instrument(instrument_id) ON DELETE CASCADE
);

