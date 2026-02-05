INSERT INTO case_va_session_log (
    cac_id,
    case_id,
    case_va_session_id,
    start_time,
    end_time,
    va_provider_agency_id,
    session_date,
    session_status
) VALUES(%s, %s, %s, %s, %s, %s, %s, %s);