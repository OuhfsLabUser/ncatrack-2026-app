CREATE TABLE case_mh_assessment_measure_scores (
    score_id INTEGER PRIMARY KEY,
    cac_id SMALLINT NOT NULL,
    case_id INTEGER NOT NULL,
    assessment_id INTEGER NOT NULL,
    instrument_id INTEGER NOT NULL,
    mh_assessment_scores VARCHAR(255),
    measure_id INTEGER,
    FOREIGN KEY(cac_id) REFERENCES child_advocacy_center(cac_id),
    FOREIGN KEY(case_id) REFERENCES cac_case(case_id),
    FOREIGN KEY(assessment_id) REFERENCES case_mh_assessment(assessment_id),
    FOREIGN KEY(instrument_id) REFERENCES case_mh_assessment_instrument(instrument_id),
    FOREIGN KEY(measure_id) REFERENCES case_mh_instrument_measure(measure_id)
);