"""
Script to populate persons with last name "Lewis" for the Base_Setup scenario.
This script adds 3 persons with last name "Lewis" to the person table.
These persons are NOT associated with any cases, they are just in the person database.
"""
import psycopg2
from psycopg2 import sql
import sys
import os
from rich import print
from .config import load_config

def get_or_create_default_cac():
    """Get or create a default CAC for persons"""
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

def add_lewis_persons():
    """Add 3 persons with last name 'Lewis' to the database"""
    # List of persons with last name "Lewis"
    # These are NOT the same as case 1,2,3,4 persons - they have different first names
    lewis_persons = [
        {
            "first_name": "Michael",
            "last_name": "Lewis",
            "date_of_birth": "1985-03-15",
            "gender": "M"
        },
        {
            "first_name": "Sarah",
            "last_name": "Lewis",
            "date_of_birth": "1990-07-22",
            "gender": "F"
        },
        {
            "first_name": "David",
            "last_name": "Lewis",
            "date_of_birth": "1988-11-08",
            "gender": "M"
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
                # Get existing persons with last name "Lewis"
                cur.execute("SELECT first_name, last_name FROM person WHERE last_name = 'Lewis'")
                existing_lewis = {(row[0], row[1]) for row in cur.fetchall()}
                
                added_count = 0
                skipped_count = 0
                
                # Start person_id from a high number to avoid conflicts
                cur.execute("SELECT COALESCE(MAX(person_id), 0) FROM person")
                max_id = cur.fetchone()[0]
                next_id = max(max_id + 1, 3000000)  # Start from 3000000 or higher
                
                # Process each Lewis person
                for person in lewis_persons:
                    first_name = person["first_name"]
                    last_name = person["last_name"]
                    
                    # Check if person already exists
                    if (first_name, last_name) in existing_lewis:
                        print(f"[yellow]Person '{first_name} {last_name}' already exists. Skipping.[/yellow]")
                        skipped_count += 1
                        continue
                    
                    try:
                        cur.execute("""
                            INSERT INTO person (
                                person_id, cac_id, first_name, last_name, date_of_birth, gender
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s
                            )
                        """, (
                            next_id,
                            cac_id,
                            first_name[:256] if first_name else None,  # Truncate to 256 chars if needed
                            last_name[:256] if last_name else None,   # Truncate to 256 chars if needed
                            person.get("date_of_birth"),
                            person.get("gender")
                        ))
                        print(f"[green]Added person: {first_name} {last_name}[/green]")
                        added_count += 1
                        next_id += 1
                    except psycopg2.IntegrityError as e:
                        print(f"[red]Error adding person '{first_name} {last_name}': {e}[/red]")
                        skipped_count += 1
                    except Exception as e:
                        print(f"[red]Unexpected error adding person '{first_name} {last_name}': {e}[/red]")
                        skipped_count += 1
                
                print(f"\n[green]Successfully added {added_count} persons with last name 'Lewis'.[/green]")
                if skipped_count > 0:
                    print(f"[yellow]Skipped {skipped_count} persons (already exist or errors).[/yellow]")
                
                return True
                
    except Exception as e:
        print(f"[red]Error populating Lewis persons: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("[yellow]Populating persons with last name 'Lewis'...[/yellow]")
    if add_lewis_persons():
        print("[green]Lewis persons populated successfully![/green]")
    else:
        print("[red]Failed to populate Lewis persons.[/red]")
        sys.exit(1)

if __name__ == "__main__":
    main()

