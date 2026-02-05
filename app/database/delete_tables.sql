-- First delete data from child tables
DELETE FROM case_mh_service_barriers;
DELETE FROM case_mh_provider;
DELETE FROM case_mh_treatment_plans;
DELETE FROM case_mh_treatment_models;
DELETE FROM case_mh_assessment_diagnosis;
DELETE FROM case_mh_assessment_measure_scores;
DELETE FROM case_mh_assessment;
DELETE FROM case_mh_assessment_instrument_measure;
DELETE FROM case_mh_assessment_instrument;
DELETE FROM case_mh_session_attribute_group;
DELETE FROM case_mh_session_attendee;
DELETE FROM case_mh_session_log_enc;
DELETE FROM case_va_session_service;
DELETE FROM case_va_session_attendee;
DELETE FROM case_va_session_log;
DELETE FROM case_person;
DELETE FROM cac_case;
DELETE FROM person;
DELETE FROM employee_account;
DELETE FROM employee;
DELETE FROM cac_agency;
DELETE FROM child_advocacy_center;
DELETE FROM state_table;

-- Then drop the pick_list tables
DELETE FROM pick_list_item;
DELETE FROM pick_list;
DELETE FROM pick_list_category;

-- Then drop child tables
DROP TABLE IF EXISTS case_mh_service_barriers;
DROP TABLE IF EXISTS case_mh_provider;
DROP TABLE IF EXISTS case_mh_treatment_plans;
DROP TABLE IF EXISTS case_mh_treatment_models;
DROP TABLE IF EXISTS case_mh_assessment_diagnosis;
DROP TABLE IF EXISTS case_mh_assessment_measure_scores;
DROP TABLE IF EXISTS case_mh_assessment;
DROP TABLE IF EXISTS case_mh_assessment_instrument_measure;
DROP TABLE IF EXISTS case_mh_assessment_instrument;
DROP TABLE IF EXISTS case_mh_session_attribute_group;
DROP TABLE IF EXISTS case_mh_session_attendee;
DROP TABLE IF EXISTS case_mh_session_log_enc;
DROP TABLE IF EXISTS case_va_session_service;
DROP TABLE IF EXISTS case_va_session_attendee;
DROP TABLE IF EXISTS case_va_session_log;
DROP TABLE IF EXISTS case_person;
DROP TABLE IF EXISTS cac_case;
DROP TABLE IF EXISTS person;
DROP TABLE IF EXISTS employee_account;
DROP TABLE IF EXISTS employee;
DROP TABLE IF EXISTS cac_agency;
DROP TABLE IF EXISTS child_advocacy_center;
DROP TABLE IF EXISTS state_table;

-- Finally drop pick list tables
DROP TABLE IF EXISTS pick_list_item;
DROP TABLE IF EXISTS pick_list;
DROP TABLE IF EXISTS pick_list_category;