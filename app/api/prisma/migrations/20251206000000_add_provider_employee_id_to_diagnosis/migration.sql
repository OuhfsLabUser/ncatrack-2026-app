-- AlterTable: Add provider_employee_id column to case_mh_assessment_diagnosis
ALTER TABLE "case_mh_assessment_diagnosis" ADD COLUMN IF NOT EXISTS "provider_employee_id" INTEGER;

-- AddForeignKey: Add foreign key constraint for provider_employee_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'case_mh_assessment_diagnosis_provider_employee_id_fkey'
    ) THEN
        ALTER TABLE "case_mh_assessment_diagnosis"
        ADD CONSTRAINT "case_mh_assessment_diagnosis_provider_employee_id_fkey"
        FOREIGN KEY ("provider_employee_id")
        REFERENCES "employee"("employee_id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END
$$;

