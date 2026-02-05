INSERT INTO case_mh_assessment (
    cac_id,
    case_id,
    assessment_id,
    mh_provider_agency_id,
    timing_id,
    session_date,
    assessment_date,
    agency_id,
    provider_employee_id,
    assessment_instrument_id,
    comments
) VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);