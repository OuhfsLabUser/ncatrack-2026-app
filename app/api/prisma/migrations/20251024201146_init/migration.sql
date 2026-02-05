-- CreateTable
CREATE TABLE "cac_agency" (
    "agency_id" INTEGER NOT NULL,
    "cac_id" SMALLINT NOT NULL,
    "agency_name" VARCHAR(50) NOT NULL,
    "addr_line_1" VARCHAR(50),
    "addr_line_2" VARCHAR(50),
    "city" VARCHAR(20),
    "state_abbr" VARCHAR(2),
    "phone_number" VARCHAR(20),
    "zip_code" VARCHAR(20),

    CONSTRAINT "cac_agency_pkey" PRIMARY KEY ("agency_id")
);

-- CreateTable
CREATE TABLE "cac_case" (
    "cac_id" SMALLINT NOT NULL,
    "case_id" INTEGER NOT NULL,
    "case_number" VARCHAR(20),
    "cac_received_date" DATE,
    "case_closed_date" DATE,
    "closed_reason_id" INTEGER,
    "created_date" DATE,
    "mh_lead_employee_id" INTEGER,
    "mh_agency_id" INTEGER,
    "mh_case_number" VARCHAR(20),
    "mh_mdt_ready" BOOLEAN,
    "mh_na" BOOLEAN,
    "mh_referral_agency_id" INTEGER,
    "mh_referral_date" DATE,
    "mh_therapy_accepted" BOOLEAN,
    "mh_therapy_complete_date" DATE,
    "mh_therapy_end_reason_id" INTEGER,
    "mh_therapy_offered_date" DATE,
    "mh_therapy_record_created" BOOLEAN,
    "va_agency_id" INTEGER,
    "va_case_number" VARCHAR(20),
    "va_claim_denied_reason" VARCHAR(200),
    "va_claim_number" VARCHAR(20),
    "va_claim_status_id" INTEGER,
    "va_have_birth_cert" BOOLEAN,
    "va_has_police_report" BOOLEAN,
    "va_mdt_ready" BOOLEAN,
    "va_na" BOOLEAN,
    "va_referral_agency_id" INTEGER,
    "va_referral_date" DATE,
    "va_services_accepted" BOOLEAN,
    "va_services_offered_date" DATE,
    "va_services_end_date" DATE,

    CONSTRAINT "cac_case_pkey" PRIMARY KEY ("case_id")
);

-- CreateTable
CREATE TABLE "case_mh_assessment" (
    "cac_id" SMALLINT NOT NULL,
    "case_id" INTEGER NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "mh_provider_agency_id" INTEGER,
    "timing_id" INTEGER,
    "session_date" DATE,
    "assessment_date" DATE,
    "agency_id" INTEGER,
    "provider_employee_id" INTEGER,
    "assessment_instrument_id" INTEGER,
    "comments" VARCHAR(255),

    CONSTRAINT "case_mh_assessment_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "case_mh_assessment_diagnosis" (
    "case_id" INTEGER NOT NULL,
    "diagnosis_date" DATE NOT NULL,
    "mh_provider_agency_id" INTEGER
);

-- CreateTable
CREATE TABLE "case_mh_assessment_instrument" (
    "instrument_id" INTEGER NOT NULL,
    "assessment_name" VARCHAR(255),
    "instrument_scores" VARCHAR(255),

    CONSTRAINT "case_mh_assessment_instrument_pkey" PRIMARY KEY ("instrument_id")
);

-- CreateTable
CREATE TABLE "case_mh_assessment_measure_scores" (
    "score_id" INTEGER NOT NULL,
    "cac_id" SMALLINT NOT NULL,
    "case_id" INTEGER NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "instrument_id" INTEGER NOT NULL,
    "mh_assessment_scores" VARCHAR(255),

    CONSTRAINT "case_mh_assessment_measure_scores_pkey" PRIMARY KEY ("score_id")
);

-- CreateTable
CREATE TABLE "case_mh_provider" (
    "agency_id" INTEGER,
    "case_id" INTEGER NOT NULL,
    "case_number" VARCHAR(20),
    "id" INTEGER NOT NULL,
    "lead_employee_id" INTEGER,
    "provider_type_id" INTEGER,
    "therapy_accepted" BOOLEAN,
    "therapy_complete_date" DATE,
    "therapy_end_reason_id" INTEGER,
    "therapy_offered_date" DATE,
    "therapy_record_created" BOOLEAN,

    CONSTRAINT "case_mh_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_mh_service_barriers" (
    "id" INTEGER NOT NULL,
    "number_of_miles" INTEGER,
    "barrier_id" INTEGER,

    CONSTRAINT "case_mh_service_barriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_mh_session_attendee" (
    "person_id" INTEGER NOT NULL,
    "cac_id" SMALLINT NOT NULL,
    "case_id" INTEGER NOT NULL,
    "case_mh_session_attendee_id" INTEGER NOT NULL,
    "case_mh_session_id" INTEGER NOT NULL,

    CONSTRAINT "case_mh_session_attendee_pkey" PRIMARY KEY ("case_mh_session_attendee_id")
);

-- CreateTable
CREATE TABLE "case_mh_session_attribute_group" (
    "id" INTEGER NOT NULL,
    "cac_id" SMALLINT NOT NULL,
    "case_id" INTEGER NOT NULL,
    "case_mh_session_id" INTEGER NOT NULL,
    "attribute_group_description" VARCHAR(255),
    "attributes" VARCHAR(255),
    "attribute_value" INTEGER,

    CONSTRAINT "case_mh_session_attribute_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_mh_session_log_enc" (
    "cac_id" SMALLINT NOT NULL,
    "case_id" INTEGER NOT NULL,
    "case_mh_session_id" INTEGER NOT NULL,
    "comments" VARCHAR(200),
    "start_time" VARCHAR(20),
    "end_time" VARCHAR(20),
    "intervention_id" INTEGER,
    "location_id" INTEGER,
    "onsite" BOOLEAN,
    "provider_agency_id" INTEGER,
    "provider_employee_id" INTEGER,
    "session_date" DATE NOT NULL,
    "session_status_id" INTEGER NOT NULL,
    "session_type_id" INTEGER,
    "recurring" BOOLEAN,
    "recurring_fre" VARCHAR(20),
    "recurring_duration" INTEGER,
    "recurring_duration_unit" VARCHAR(255),

    CONSTRAINT "case_mh_session_log_enc_pkey" PRIMARY KEY ("case_mh_session_id")
);

-- CreateTable
CREATE TABLE "case_mh_treatment_models" (
    "id" INTEGER NOT NULL,
    "model_name" VARCHAR(255),

    CONSTRAINT "case_mh_treatment_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_mh_treatment_plans" (
    "authorized_status_id" INTEGER,
    "cac_id" SMALLINT NOT NULL,
    "case_id" INTEGER NOT NULL,
    "duration" INTEGER,
    "duration_unit" VARCHAR(255),
    "id" INTEGER NOT NULL,
    "planned_end_date" DATE,
    "planned_review_date" DATE,
    "planned_start_date" DATE,
    "provider_agency_id" INTEGER,
    "provider_employee_id" INTEGER,
    "treatment_model_id" INTEGER,
    "treatment_plan_date" DATE,

    CONSTRAINT "case_mh_treatment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_person" (
    "person_id" INTEGER NOT NULL,
    "case_id" INTEGER NOT NULL,
    "cac_id" SMALLINT NOT NULL,
    "age" INTEGER,
    "age_unit" VARCHAR(20),
    "address_line_1" VARCHAR(200),
    "address_line_2" VARCHAR(200),
    "city" VARCHAR(50),
    "state_abbr" VARCHAR(2),
    "zip" VARCHAR(20),
    "cell_phone_number" VARCHAR(200),
    "home_phone_number" VARCHAR(200),
    "work_phone_number" VARCHAR(200),
    "custody" BOOLEAN,
    "education_level_id" INTEGER,
    "income_level_id" INTEGER,
    "marital_status_id" INTEGER,
    "relationship_id" INTEGER,
    "role_id" INTEGER,
    "same_household" BOOLEAN,
    "school_or_employer" VARCHAR(200),
    "victim_status_id" INTEGER,

    CONSTRAINT "case_person_pkey" PRIMARY KEY ("person_id","case_id")
);

-- CreateTable
CREATE TABLE "case_va_session_attendee" (
    "case_id" INTEGER NOT NULL,
    "case_va_session_attendee_id" INTEGER NOT NULL,
    "case_va_session_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,

    CONSTRAINT "case_va_session_attendee_pkey" PRIMARY KEY ("case_va_session_attendee_id")
);

-- CreateTable
CREATE TABLE "case_va_session_log" (
    "cac_id" SMALLINT NOT NULL,
    "case_id" INTEGER NOT NULL,
    "case_va_session_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(6),
    "end_time" TIMESTAMP(6),
    "va_provider_agency_id" INTEGER,
    "session_date" DATE,
    "session_status" INTEGER,

    CONSTRAINT "case_va_session_log_pkey" PRIMARY KEY ("case_va_session_id")
);

-- CreateTable
CREATE TABLE "case_va_session_service" (
    "cac_id" SMALLINT NOT NULL,
    "case_va_session_id" INTEGER NOT NULL,
    "case_va_session_service_id" INTEGER NOT NULL,
    "service_type_id" INTEGER NOT NULL,

    CONSTRAINT "case_va_session_service_pkey" PRIMARY KEY ("case_va_session_service_id")
);

-- CreateTable
CREATE TABLE "child_advocacy_center" (
    "cac_id" SMALLINT NOT NULL,
    "cac_name" VARCHAR(50) NOT NULL,
    "addr_line_1" VARCHAR(50),
    "addr_line_2" VARCHAR(50),
    "city" VARCHAR(20),
    "state_abbr" VARCHAR(2),
    "phone_number" VARCHAR(20),
    "zip_code" VARCHAR(20),

    CONSTRAINT "child_advocacy_center_pkey" PRIMARY KEY ("cac_id")
);

-- CreateTable
CREATE TABLE "employee" (
    "employee_id" INTEGER NOT NULL,
    "agency_id" INTEGER NOT NULL,
    "cac_id" SMALLINT NOT NULL,
    "email_addr" VARCHAR(50),
    "first_name" VARCHAR(20),
    "last_name" VARCHAR(20),
    "job_title" VARCHAR(200),
    "phone_number" VARCHAR(20),

    CONSTRAINT "employee_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "employee_account" (
    "employee_id" INTEGER NOT NULL,
    "date_modified" DATE,
    "account_disabled" BOOLEAN,

    CONSTRAINT "employee_account_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "example" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person" (
    "cac_id" SMALLINT NOT NULL,
    "person_id" INTEGER NOT NULL,
    "first_name" VARCHAR(256),
    "middle_name" VARCHAR(256),
    "last_name" VARCHAR(256),
    "suffix" VARCHAR(256),
    "nick_name" VARCHAR(256),
    "ssn" VARCHAR(9),
    "date_of_birth" DATE,
    "date_of_death" DATE,
    "gender" VARCHAR(1),
    "race" VARCHAR(256),
    "religion" VARCHAR(256),
    "language" VARCHAR(256),
    "prior_convictions" BOOLEAN,
    "convicted_against_children" BOOLEAN,
    "sex_offender" BOOLEAN,
    "sex_predator" BOOLEAN,

    CONSTRAINT "person_pkey" PRIMARY KEY ("person_id")
);

-- CreateTable
CREATE TABLE "pick_list" (
    "list_id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "list_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "pick_list_pkey" PRIMARY KEY ("list_id")
);

-- CreateTable
CREATE TABLE "pick_list_category" (
    "category_id" SERIAL NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "pick_list_category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "pick_list_item" (
    "item_id" SERIAL NOT NULL,
    "list_id" INTEGER NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pick_list_item_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "state_table" (
    "state_abbr" VARCHAR(2),
    "state_name" VARCHAR(20)
);

-- CreateIndex
CREATE UNIQUE INDEX "state_table_state_abbr_key" ON "state_table"("state_abbr");

-- CreateIndex
CREATE UNIQUE INDEX "state_table_state_name_key" ON "state_table"("state_name");

-- AddForeignKey
ALTER TABLE "cac_agency" ADD CONSTRAINT "cac_agency_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cac_case" ADD CONSTRAINT "cac_case_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cac_case" ADD CONSTRAINT "cac_case_mh_agency_id_fkey" FOREIGN KEY ("mh_agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cac_case" ADD CONSTRAINT "cac_case_mh_referral_agency_id_fkey" FOREIGN KEY ("mh_referral_agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cac_case" ADD CONSTRAINT "cac_case_va_agency_id_fkey" FOREIGN KEY ("va_agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cac_case" ADD CONSTRAINT "cac_case_va_referral_agency_id_fkey" FOREIGN KEY ("va_referral_agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment" ADD CONSTRAINT "case_mh_assessment_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment" ADD CONSTRAINT "case_mh_assessment_assessment_instrument_id_fkey" FOREIGN KEY ("assessment_instrument_id") REFERENCES "case_mh_assessment_instrument"("instrument_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment" ADD CONSTRAINT "case_mh_assessment_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment" ADD CONSTRAINT "case_mh_assessment_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment" ADD CONSTRAINT "case_mh_assessment_mh_provider_agency_id_fkey" FOREIGN KEY ("mh_provider_agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment" ADD CONSTRAINT "case_mh_assessment_provider_employee_id_fkey" FOREIGN KEY ("provider_employee_id") REFERENCES "employee"("employee_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment_measure_scores" ADD CONSTRAINT "case_mh_assessment_measure_scores_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "case_mh_assessment"("assessment_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment_measure_scores" ADD CONSTRAINT "case_mh_assessment_measure_scores_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment_measure_scores" ADD CONSTRAINT "case_mh_assessment_measure_scores_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_assessment_measure_scores" ADD CONSTRAINT "case_mh_assessment_measure_scores_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "case_mh_assessment_instrument"("instrument_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_provider" ADD CONSTRAINT "case_mh_provider_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_provider" ADD CONSTRAINT "case_mh_provider_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_provider" ADD CONSTRAINT "case_mh_provider_lead_employee_id_fkey" FOREIGN KEY ("lead_employee_id") REFERENCES "employee"("employee_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_attendee" ADD CONSTRAINT "case_mh_session_attendee_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_attendee" ADD CONSTRAINT "case_mh_session_attendee_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_attendee" ADD CONSTRAINT "case_mh_session_attendee_case_mh_session_id_fkey" FOREIGN KEY ("case_mh_session_id") REFERENCES "case_mh_session_log_enc"("case_mh_session_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_attendee" ADD CONSTRAINT "case_mh_session_attendee_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("person_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_attribute_group" ADD CONSTRAINT "case_mh_session_attribute_group_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_attribute_group" ADD CONSTRAINT "case_mh_session_attribute_group_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_attribute_group" ADD CONSTRAINT "case_mh_session_attribute_group_case_mh_session_id_fkey" FOREIGN KEY ("case_mh_session_id") REFERENCES "case_mh_session_log_enc"("case_mh_session_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_log_enc" ADD CONSTRAINT "case_mh_session_log_enc_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_log_enc" ADD CONSTRAINT "case_mh_session_log_enc_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_log_enc" ADD CONSTRAINT "case_mh_session_log_enc_provider_agency_id_fkey" FOREIGN KEY ("provider_agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_session_log_enc" ADD CONSTRAINT "case_mh_session_log_enc_provider_employee_id_fkey" FOREIGN KEY ("provider_employee_id") REFERENCES "employee"("employee_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_treatment_plans" ADD CONSTRAINT "case_mh_treatment_plans_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_treatment_plans" ADD CONSTRAINT "case_mh_treatment_plans_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_treatment_plans" ADD CONSTRAINT "case_mh_treatment_plans_provider_agency_id_fkey" FOREIGN KEY ("provider_agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_treatment_plans" ADD CONSTRAINT "case_mh_treatment_plans_provider_employee_id_fkey" FOREIGN KEY ("provider_employee_id") REFERENCES "employee"("employee_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_mh_treatment_plans" ADD CONSTRAINT "case_mh_treatment_plans_treatment_model_id_fkey" FOREIGN KEY ("treatment_model_id") REFERENCES "case_mh_treatment_models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_person" ADD CONSTRAINT "case_person_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_person" ADD CONSTRAINT "case_person_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_person" ADD CONSTRAINT "case_person_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("person_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_va_session_attendee" ADD CONSTRAINT "case_va_session_attendee_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_va_session_attendee" ADD CONSTRAINT "case_va_session_attendee_case_va_session_id_fkey" FOREIGN KEY ("case_va_session_id") REFERENCES "case_va_session_log"("case_va_session_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_va_session_attendee" ADD CONSTRAINT "case_va_session_attendee_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("person_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_va_session_log" ADD CONSTRAINT "case_va_session_log_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_va_session_log" ADD CONSTRAINT "case_va_session_log_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cac_case"("case_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_va_session_log" ADD CONSTRAINT "case_va_session_log_va_provider_agency_id_fkey" FOREIGN KEY ("va_provider_agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_va_session_service" ADD CONSTRAINT "case_va_session_service_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "case_va_session_service" ADD CONSTRAINT "case_va_session_service_case_va_session_id_fkey" FOREIGN KEY ("case_va_session_id") REFERENCES "case_va_session_log"("case_va_session_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "cac_agency"("agency_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "person" ADD CONSTRAINT "person_cac_id_fkey" FOREIGN KEY ("cac_id") REFERENCES "child_advocacy_center"("cac_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pick_list" ADD CONSTRAINT "pick_list_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "pick_list_category"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pick_list_item" ADD CONSTRAINT "pick_list_item_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "pick_list"("list_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
