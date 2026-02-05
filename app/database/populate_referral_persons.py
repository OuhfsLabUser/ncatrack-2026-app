"""
Script to populate referral persons (employees) for the Base_Setup scenario.
This script adds required referral persons like Hannah Brini to the employee table.
"""
import psycopg2
from psycopg2 import sql
import sys
import os
from rich import print
from .config import load_config

def get_or_create_default_cac():
    """Get or create a default CAC for employees"""
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

def get_agency_by_name(agency_name):
    """Get agency_id by agency name"""
    try:
        config = load_config()
        with psycopg2.connect(**config) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute("SELECT agency_id FROM cac_agency WHERE agency_name = %s", (agency_name,))
                result = cur.fetchone()
                if result:
                    return result[0]
                return None
    except Exception as e:
        print(f"[red]Error getting agency: {e}[/red]")
        return None

def add_referral_persons():
    """Add all referral persons (employees) to the database"""
    # List of referral persons from the requirements
    referral_persons = [
        {
            "first_name": "Hannah",
            "last_name": "Brini",
            "agency_name_patterns": [
                "Oklahoma Department of Human Services (Oklahoma city)",
                "Oklahoma Department of Human Services (Tulsa County)",
                "Oklahoma DHS (Oklahoma City)",
                "Oklahoma DHS (Tulsa County)",
                "Oklahoma Department of Human Services"
            ],
            "job_title": "Child Welfare Specialist",
            "email": "hannah.brini@okdhs.gov",
            "phone": "(918) 555-0123"
        },
        {
            "first_name": "Kendra",
            "last_name": "Wallace",
            "agency_name_patterns": [
                "Department of Children's Services",
                "DCS - Anderson Co.",
                "Warren County CPS",
                "Cayuga CPS",
                "Cuyahoga County CPS"
            ],
            "job_title": "Case Manager",
            "email": "kendra.wallace@dhs.gov",
            "phone": "(555) 555-0124"
        }
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
                # Get existing employees
                cur.execute("SELECT first_name, last_name FROM employee")
                existing_employees = {(row[0], row[1]) for row in cur.fetchall()}
                
                added_count = 0
                skipped_count = 0
                
                # Start employee_id from a high number to avoid conflicts
                cur.execute("SELECT COALESCE(MAX(employee_id), 0) FROM employee")
                max_id = cur.fetchone()[0]
                next_id = max(max_id + 1, 2000000)  # Start from 2000000 or higher
                
                # Process each referral person
                for person in referral_persons:
                    first_name = person["first_name"]
                    last_name = person["last_name"]
                    
                    # Check if employee already exists
                    if (first_name, last_name) in existing_employees:
                        print(f"[yellow]Employee '{first_name} {last_name}' already exists. Skipping.[/yellow]")
                        skipped_count += 1
                        continue
                    
                    # Try to find agency by different name patterns
                    agency_id = None
                    agency_found = None
                    for agency_pattern in person.get("agency_name_patterns", []):
                        agency_id = get_agency_by_name(agency_pattern)
                        if agency_id:
                            agency_found = agency_pattern
                            print(f"[green]Found agency '{agency_pattern}' with ID: {agency_id}[/green]")
                            break
                    
                    # If no agency found, use the first available agency
                    if not agency_id:
                        print(f"[yellow]Agency for '{first_name} {last_name}' not found. Using first available agency...[/yellow]")
                        cur.execute("SELECT agency_id FROM cac_agency LIMIT 1")
                        result = cur.fetchone()
                        if result:
                            agency_id = result[0]
                            print(f"[yellow]Using agency ID: {agency_id}[/yellow]")
                        else:
                            print(f"[red]No agencies found. Cannot add employee '{first_name} {last_name}' without an agency.[/red]")
                            skipped_count += 1
                            continue
                    
                    try:
                        cur.execute("""
                            INSERT INTO employee (
                                employee_id, agency_id, cac_id, email_addr, first_name, last_name, job_title, phone_number
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s
                            )
                        """, (
                            next_id,
                            agency_id,
                            cac_id,
                            person.get("email"),
                            first_name[:20] if first_name else None,  # Truncate to 20 chars if needed
                            last_name[:20] if last_name else None,   # Truncate to 20 chars if needed
                            person.get("job_title")[:200] if person.get("job_title") else None,  # Truncate to 200 chars if needed
                            person.get("phone")[:20] if person.get("phone") else None  # Truncate to 20 chars if needed
                        ))
                        print(f"[green]Added employee: {first_name} {last_name} ({person.get('job_title', 'N/A')})[/green]")
                        if agency_found:
                            print(f"[green]  Associated with agency: {agency_found}[/green]")
                        added_count += 1
                        next_id += 1
                    except psycopg2.IntegrityError as e:
                        print(f"[red]Error adding employee '{first_name} {last_name}': {e}[/red]")
                        skipped_count += 1
                    except Exception as e:
                        print(f"[red]Unexpected error adding employee '{first_name} {last_name}': {e}[/red]")
                        skipped_count += 1
                
                print(f"\n[green]Successfully added {added_count} employees.[/green]")
                if skipped_count > 0:
                    print(f"[yellow]Skipped {skipped_count} employees (already exist or errors).[/yellow]")
                
                return True
                
    except Exception as e:
        print(f"[red]Error populating referral persons: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("[yellow]Populating referral persons (employees)...[/yellow]")
    if add_referral_persons():
        print("[green]Referral persons populated successfully![/green]")
    else:
        print("[red]Failed to populate referral persons.[/red]")
        sys.exit(1)

if __name__ == "__main__":
    main()

