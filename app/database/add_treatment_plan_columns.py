"""
Script to add missing text columns to case_mh_treatment_plans table.
These columns are defined in Prisma schema but may be missing from existing databases.
"""
import psycopg2
from .config import load_config

def add_missing_columns():
    """
    Add missing text columns to case_mh_treatment_plans table if they don't exist.
    """
    try:
        config = load_config()
        with psycopg2.connect(**config) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Check and add session_notes
                cur.execute("""
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
                """)
                
                # Check and add goals_progress
                cur.execute("""
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
                """)
                
                # Check and add privacy_forms
                cur.execute("""
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
                """)
                
                # Check and add consents
                cur.execute("""
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
                """)
                
                print("[green]Successfully added missing columns to case_mh_treatment_plans table.[/green]")
                return True
    except Exception as e:
        print(f"[red]Error adding columns: {e}[/red]")
        # If columns already exist, that's okay - just return True
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            print("[yellow]Columns may already exist. Continuing...[/yellow]")
            return True
        return False

def main():
    """Main function to run the migration."""
    return add_missing_columns()

if __name__ == "__main__":
    main()

