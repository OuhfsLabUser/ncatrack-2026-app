-- AlterTable: Add measure_id column to case_mh_assessment_measure_scores
ALTER TABLE "case_mh_assessment_measure_scores" 
ADD COLUMN IF NOT EXISTS "measure_id" INTEGER;

-- AddForeignKey: Add foreign key constraint for measure_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'case_mh_assessment_measure_scores_measure_id_fkey'
    ) THEN
        ALTER TABLE "case_mh_assessment_measure_scores" 
        ADD CONSTRAINT "case_mh_assessment_measure_scores_measure_id_fkey" 
        FOREIGN KEY ("measure_id") 
        REFERENCES "case_mh_instrument_measure"("measure_id") 
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END
$$;

