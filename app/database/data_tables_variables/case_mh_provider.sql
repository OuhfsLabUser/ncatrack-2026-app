INSERT INTO case_mh_provider (
    agency_id,
    case_id,
    case_number,
    id,
    lead_employee_id,
    provider_type_id,
    therapy_accepted,
    therapy_complete_date,
    therapy_end_reason_id,
    therapy_offered_date,
    therapy_record_created
)VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);