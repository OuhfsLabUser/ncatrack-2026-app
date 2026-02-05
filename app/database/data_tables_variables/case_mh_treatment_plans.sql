INSERT INTO case_mh_treatment_plans (
    authorized_status_id,
    cac_id,
    case_id,
    duration,
    duration_unit,
    id,
    planned_end_date,
    planned_review_date,
    planned_start_date,
    provider_agency_id,
    provider_employee_id,
    treatment_model_id,
    treatment_plan_date
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);