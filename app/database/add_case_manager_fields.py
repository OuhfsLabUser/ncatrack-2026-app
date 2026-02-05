"""
Script to add Case Manager Agency, Case Manager, and MDT Meeting Types fields to cac_case table.
This script adds new fields to store Case Manager information and MDT Meeting Types.
"""
import psycopg2
from psycopg2 import sql
import sys
import os
from rich import print
from .config import load_config

def add_case_manager_fields():
    """Add Case Manager Agency, Case Manager, and MDT Meeting Types fields to cac_case table"""
    try:
        config = load_config()
        with psycopg2.connect(**config) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Check if fields already exist
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'cac_case' 
                    AND column_name IN ('case_manager_agency', 'case_manager', 'mdt_meeting_types')
                """)
                existing_fields = {row[0] for row in cur.fetchall()}
                
                # Add case_manager_agency field (VARCHAR(255) to store agency name)
                if 'case_manager_agency' not in existing_fields:
                    cur.execute("""
                        ALTER TABLE cac_case
                        ADD COLUMN case_manager_agency VARCHAR(255);
                    """)
                    print("[green]Added 'case_manager_agency' column to cac_case table.[/green]")
                else:
                    print("[yellow]Column 'case_manager_agency' already exists.[/yellow]")
                
                # Add case_manager field (VARCHAR(255) to store employee name)
                if 'case_manager' not in existing_fields:
                    cur.execute("""
                        ALTER TABLE cac_case
                        ADD COLUMN case_manager VARCHAR(255);
                    """)
                    print("[green]Added 'case_manager' column to cac_case table.[/green]")
                else:
                    print("[yellow]Column 'case_manager' already exists.[/yellow]")
                
                # Add mdt_meeting_types field (TEXT to store JSON array of selected types)
                if 'mdt_meeting_types' not in existing_fields:
                    cur.execute("""
                        ALTER TABLE cac_case
                        ADD COLUMN mdt_meeting_types TEXT;
                    """)
                    print("[green]Added 'mdt_meeting_types' column to cac_case table.[/green]")
                else:
                    print("[yellow]Column 'mdt_meeting_types' already exists.[/yellow]")
                
                print("[green]Successfully added Case Manager and MDT Meeting Types fields.[/green]")
                return True
                
    except Exception as e:
        print(f"[red]Error adding Case Manager fields: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("[yellow]Adding Case Manager and MDT Meeting Types fields to cac_case table...[/yellow]")
    if add_case_manager_fields():
        print("[green]Case Manager fields added successfully![/green]")
    else:
        print("[red]Failed to add Case Manager fields.[/red]")
        sys.exit(1)

if __name__ == "__main__":
    main()

