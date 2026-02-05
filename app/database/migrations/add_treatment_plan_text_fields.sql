-- Migration script to add missing text fields to case_mh_treatment_plans table
-- These fields are defined in Prisma schema but missing from the database table

-- Add session_notes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'case_mh_treatment_plans' 
        AND column_name = 'session_notes'
    ) THEN
        ALTER TABLE case_mh_treatment_plans ADD COLUMN session_notes TEXT;
    END IF;
END $$;

-- Add goals_progress column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'case_mh_treatment_plans' 
        AND column_name = 'goals_progress'
    ) THEN
        ALTER TABLE case_mh_treatment_plans ADD COLUMN goals_progress TEXT;
    END IF;
END $$;

-- Add privacy_forms column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'case_mh_treatment_plans' 
        AND column_name = 'privacy_forms'
    ) THEN
        ALTER TABLE case_mh_treatment_plans ADD COLUMN privacy_forms TEXT;
    END IF;
END $$;

-- Add consents column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'case_mh_treatment_plans' 
        AND column_name = 'consents'
    ) THEN
        ALTER TABLE case_mh_treatment_plans ADD COLUMN consents TEXT;
    END IF;
END $$;

