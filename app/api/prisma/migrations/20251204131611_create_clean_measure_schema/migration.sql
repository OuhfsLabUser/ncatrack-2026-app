-- CreateTable
CREATE TABLE IF NOT EXISTS "case_mh_instrument_measure" (
    "measure_id" SERIAL NOT NULL,
    "instrument_id" INTEGER NOT NULL,
    "measure_name" VARCHAR(255) NOT NULL,
    "sequence" INTEGER DEFAULT 0,

    CONSTRAINT "case_mh_instrument_measure_pkey" PRIMARY KEY ("measure_id")
);

-- AlterTable
ALTER TABLE "case_mh_assessment_measure_scores" ADD COLUMN IF NOT EXISTS "measure_id" INTEGER;

-- AddForeignKey (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'case_mh_instrument_measure_instrument_id_fkey'
    ) THEN
        ALTER TABLE "case_mh_instrument_measure" 
        ADD CONSTRAINT "case_mh_instrument_measure_instrument_id_fkey" 
        FOREIGN KEY ("instrument_id") 
        REFERENCES "case_mh_assessment_instrument"("instrument_id") 
        ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END
$$;

-- AddForeignKey (only if not exists)
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