"""
Create a single "Base Case" with two victims:
- Primary victim: Jackson Barns (minimal profile).
- Secondary victim: Taniel Lewis with full initial profile:
  DOB 07/09/2016, Age at incident 6, Female (She/Her), Race/Ethnicity half black and half white no Latino,
  Education Rockwood Elementary School, Language English, Religion NA,
  Current custody status OKDHS protective custody (emergency).
Both are Alleged Co-victim (role_id = 1), victim_status Primary and Secondary.
"""
import psycopg2
import sys
from datetime import date
from rich import print

# Load config from same module path as other database scripts
try:
    from .config import load_config
    from .populate_lewis_persons import get_or_create_default_cac
except ImportError:
    from config import load_config
    from populate_lewis_persons import get_or_create_default_cac

BASE_CASE_NUMBER = "BASE-001"

# Primary victim (Jackson Barns): minimal shared profile
SHARED_DOB = "1990-06-15"
SHARED_GENDER = "F"

# Taniel Lewis (secondary victim): full profile from base case spec
TANIEL_DOB = "2016-07-09"
TANIEL_GENDER = "Female"
TANIEL_PRONOUNS = "She/Her"
TANIEL_RACE = "Half black and half white, no Latino"
TANIEL_RELIGION = "NA"
TANIEL_FIRST_LANGUAGE = "English"
TANIEL_AGE_AT_INCIDENT = 6
TANIEL_AGE_UNIT = "Years"
TANIEL_EDUCATION = "Rockwood Elementary School"
TANIEL_CUSTODY = True  # OKDHS protective custody (emergency)
TANIEL_CUSTODY_STATUS = "OKDHS protective custody (emergency)"

def create_base_case():
    """Create one base case with two persons: Jackson Barns (primary) and Taniel Lewis (secondary)."""
    try:
        config = load_config()
        cac_id = get_or_create_default_cac()
        if not cac_id:
            print("[red]Failed to get or create CAC. Cannot create base case.[/red]")
            return False

        with psycopg2.connect(**config) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Skip if base case already exists
                cur.execute(
                    "SELECT case_id FROM cac_case WHERE case_number = %s",
                    (BASE_CASE_NUMBER,)
                )
                if cur.fetchone():
                    print(f"[yellow]Base case '{BASE_CASE_NUMBER}' already exists. Skipping.[/yellow]")
                    return True

                # Next case_id
                cur.execute("SELECT COALESCE(MAX(case_id), 0) + 1 FROM cac_case")
                case_id = cur.fetchone()[0]

                # Next person_id (need two)
                cur.execute("SELECT COALESCE(MAX(person_id), 0) FROM person")
                next_person_id = cur.fetchone()[0] + 1

                # Insert base case
                today = date.today().isoformat()
                cur.execute("""
                    INSERT INTO cac_case (cac_id, case_id, case_number, cac_received_date, created_date)
                    VALUES (%s, %s, %s, %s::date, %s::date)
                """, (cac_id, case_id, BASE_CASE_NUMBER, today, today))
                print(f"[green]Created base case: {BASE_CASE_NUMBER} (case_id={case_id})[/green]")

                # Primary victim: Jackson Barns (minimal profile)
                primary_id = next_person_id
                cur.execute("""
                    INSERT INTO person (person_id, cac_id, first_name, last_name, date_of_birth, gender)
                    VALUES (%s, %s, %s, %s, %s::date, %s)
                """, (primary_id, cac_id, "Jackson", "Barns", SHARED_DOB, SHARED_GENDER))
                print("[green]Added Primary victim: Jackson Barns[/green]")

                # Secondary victim: Taniel Lewis (full profile per base case spec)
                secondary_id = next_person_id + 1
                cur.execute("""
                    INSERT INTO person (
                        person_id, cac_id, first_name, last_name, date_of_birth, gender,
                        pronouns, race, religion, first_language
                    )
                    VALUES (%s, %s, %s, %s, %s::date, %s, %s, %s, %s, %s)
                """, (
                    secondary_id,
                    cac_id,
                    "Taniel",
                    "Lewis",
                    TANIEL_DOB,
                    TANIEL_GENDER,
                    TANIEL_PRONOUNS[:20] if TANIEL_PRONOUNS else None,
                    TANIEL_RACE[:256] if TANIEL_RACE else None,
                    TANIEL_RELIGION[:256] if TANIEL_RELIGION else None,
                    TANIEL_FIRST_LANGUAGE[:256] if TANIEL_FIRST_LANGUAGE else None,
                ))
                print("[green]Added Secondary victim: Taniel Lewis (DOB 07/09/2016, Female She/Her, Race/Ethnicity, Education, custody)[/green]")

                # Link both to case: role_id 1 = Alleged Co-victim
                cur.execute("""
                    INSERT INTO case_person (person_id, case_id, cac_id, role_id, victim_status)
                    VALUES (%s, %s, %s, 1, %s)
                """, (primary_id, case_id, cac_id, "Primary"))
                cur.execute("""
                    INSERT INTO case_person (
                        person_id, case_id, cac_id, role_id, victim_status,
                        age, age_unit, school_or_employer, custody, case_person_custom_field_7
                    )
                    VALUES (%s, %s, %s, 1, %s, %s, %s, %s, %s, %s)
                """, (
                    secondary_id,
                    case_id,
                    cac_id,
                    "Secondary",
                    TANIEL_AGE_AT_INCIDENT,
                    TANIEL_AGE_UNIT,
                    TANIEL_EDUCATION[:200] if TANIEL_EDUCATION else None,
                    TANIEL_CUSTODY,
                    TANIEL_CUSTODY_STATUS,
                ))
                print("[green]Associated both victims with base case (Primary & Secondary).[/green]")

        return True
    except Exception as e:
        print(f"[red]Error creating base case: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("[yellow]Creating base case with two victims (Jackson Barns & Taniel Lewis)...[/yellow]")
    if create_base_case():
        print("[green]Base case created successfully.[/green]")
    else:
        print("[red]Failed to create base case.[/red]")
        sys.exit(1)

if __name__ == "__main__":
    main()
