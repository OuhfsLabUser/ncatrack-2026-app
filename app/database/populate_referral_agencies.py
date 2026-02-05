"""
Script to populate referral agencies for the Base_Setup scenario.
This script adds all the required referral agencies to the cac_agency table.
"""
import psycopg2
from psycopg2 import sql
import sys
import os
from rich import print
from .config import load_config

def get_or_create_default_cac():
    """Get or create a default CAC for agencies"""
    try:
        config = load_config()
        with psycopg2.connect(**config) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Try to find an existing CAC
                cur.execute("SELECT cac_id FROM child_advocacy_center LIMIT 1")
                result = cur.fetchone()
                
                if result:
                    cac_id = result[0]
                    print(f"[yellow]Using existing CAC with ID: {cac_id}[/yellow]")
                    return cac_id
                
                # Create a default CAC if none exists
                print("[yellow]No CAC found. Creating default CAC...[/yellow]")
                cur.execute("""
                    INSERT INTO child_advocacy_center (
                        cac_id, cac_name, addr_line_1, city, state_abbr, phone_number, zip_code
                    ) VALUES (
                        1, 'Default CAC', '123 Main St', 'Default City', 'OK', '(555)555-5555', '12345'
                    ) RETURNING cac_id
                """)
                cac_id = cur.fetchone()[0]
                print(f"[green]Created default CAC with ID: {cac_id}[/green]")
                return cac_id
    except Exception as e:
        print(f"[red]Error getting/creating CAC: {e}[/red]")
        return None

def add_referral_agencies():
    """Add all referral agencies to the database"""
    # List of referral agencies from the requirements
    referral_agencies = [
        "CAC of AnyTown",
        "Cayuga CPS",
        "Child Guidance",
        "Cuyahoga County CPS",
        "DA - Anderson Co. Juv Division",
        "DCS - Anderson Co.",
        "Department of Children's Services",
        "District Attorney's Office",
        "FBI",
        "Fort West Hospital",
        "Highway Patrol Road Crew",
        "Homeland Security",
        "LE - Anderson Co. PD",
        "LE - Anderson Co. Sheriff",
        "LE New Berlin City",
        "Medical Services",
        "Mental Health Agency",
        "Mental Health Professionals Of Nowhere USA",
        "Mercy Hospital",
        "MH County Services",
        "My MH Partner",
        "New City PD",
        "Oak Ridge Hospital",
        "Oak Ridge PD",
        "Ohio Mental Health Services",
        "Ohio PD",
        "Oklahoma Department of Human Services (Oklahoma city)",
        "Oklahoma Department of Human Services (Tulsa County)",
        "Police Dept.",
        "Riverside Middle School",
        "SHIELD CAC Oklahoma City",  # Changed from "SHIELD CAC OKC"
        "SHIELD CAC Tulsa",
        "Springfield Children's Hospital",
        "St. Paul Hospital",
        "State Highway Patrol",
        "VA Associates",
        "Warren County CPS",
        "Warren County District Attorney",
        "Warren County Sherrif's Department"
    ]
    
    try:
        config = load_config()
        cac_id = get_or_create_default_cac()
        
        if not cac_id:
            print("[red]Failed to get or create CAC. Cannot proceed.[/red]")
            return False
        
        with psycopg2.connect(**config) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Get existing agency names
                cur.execute("SELECT agency_name FROM cac_agency")
                existing_agencies = {row[0] for row in cur.fetchall()}
                
                added_count = 0
                skipped_count = 0
                
                # Start agency_id from a high number to avoid conflicts
                cur.execute("SELECT COALESCE(MAX(agency_id), 0) FROM cac_agency")
                max_id = cur.fetchone()[0]
                next_id = max(max_id + 1, 1000000)  # Start from 1000000 or higher
                
                for agency_name in referral_agencies:
                    # Check if agency already exists (using full name)
                    if agency_name in existing_agencies:
                        print(f"[yellow]Skipping existing agency: {agency_name}[/yellow]")
                        skipped_count += 1
                        continue
                    
                    try:
                        cur.execute("""
                            INSERT INTO cac_agency (
                                agency_id, cac_id, agency_name, addr_line_1, city, state_abbr, phone_number, zip_code
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s
                            )
                        """, (
                            next_id,
                            cac_id,
                            agency_name,
                            None,  # addr_line_1
                            None,  # city
                            None,  # state_abbr
                            None,  # phone_number
                            None   # zip_code
                        ))
                        print(f"[green]Added agency: {agency_name}[/green]")
                        added_count += 1
                        next_id += 1
                    except psycopg2.IntegrityError as e:
                        print(f"[red]Error adding agency '{agency_name}': {e}[/red]")
                        skipped_count += 1
                    except Exception as e:
                        print(f"[red]Unexpected error adding agency '{agency_name}': {e}[/red]")
                        skipped_count += 1
                
                print(f"\n[green]Successfully added {added_count} agencies.[/green]")
                if skipped_count > 0:
                    print(f"[yellow]Skipped {skipped_count} agencies (already exist or errors).[/yellow]")
                
                return True
                
    except Exception as e:
        print(f"[red]Error populating referral agencies: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("[yellow]Populating referral agencies...[/yellow]")
    if add_referral_agencies():
        print("[green]Referral agencies populated successfully![/green]")
    else:
        print("[red]Failed to populate referral agencies.[/red]")
        sys.exit(1)

if __name__ == "__main__":
    main()

