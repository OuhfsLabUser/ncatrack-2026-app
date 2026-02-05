-- AlterTable: Add instrument_scores column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'case_mh_assessment_instrument' 
        AND column_name = 'instrument_scores'
    ) THEN
        ALTER TABLE "case_mh_assessment_instrument" ADD COLUMN "instrument_scores" VARCHAR(255);
    END IF;
END
$$;

