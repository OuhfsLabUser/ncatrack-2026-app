"""
Populate deterministic Care 1 base data to support duplicate-check testing.

This script creates:
- A 2021 Tulsa historical case for victim Taniel Lewis (with mother and alleged offender).
- A 2019 physical abuse interference case for victim Tanel Lewis.
- A 2021 neglect interference case for victim MayaAngelou Lewis
  (shares date of birth with future victim Maya Lewis, but is a different person).

All date values are hard-coded as YYYY-MM-DD strings. No runtime date functions
like datetime.now() or date.today() are used anywhere in this file.
"""

import psycopg2
import sys
from rich import print

# Load config from same module path as other database scripts
try:
    from .config import load_config
    from .populate_lewis_persons import get_or_create_default_cac
except ImportError:
    from config import load_config
    from populate_lewis_persons import get_or_create_default_cac


# --- Person constants (all dates as plain strings) ---

# 2021 Tulsa historical case victim
TANIEL_FIRST_NAME = "Taniel"
TANIEL_LAST_NAME = "Lewis"
TANIEL_DOB = "2016-07-09"
TANIEL_GENDER = "Female"
TANIEL_PRONOUNS = "She/Her"
TANIEL_RACE = "Half black and half white, no Latino"
TANIEL_RELIGION = "NA"
TANIEL_FIRST_LANGUAGE = "English"
TANIEL_EDUCATION = "Rockwood Elementary School"

# Related person 1 (mother)
NAKEISHA_FIRST_NAME = "Nakeisha"
NAKEISHA_LAST_NAME = "Anderson"
NAKEISHA_DOB = "1992-08-18"
NAKEISHA_GENDER = "Female"
NAKEISHA_2021_COMMENT = "At this time, she did not have any substance abuse"

# Related person 2 (biological father, alleged offender)
STEVEN_FIRST_NAME = "Steven"
STEVEN_LAST_NAME = "Lewis"
STEVEN_DOB = "1990-05-04"
STEVEN_GENDER = "Male"

# Interference A: similar spelling victim
TANEL_FIRST_NAME = "Tanel"  # note: no 'i'
TANEL_LAST_NAME = "Lewis"
TANEL_DOB = "2016-09-07"
TANEL_GENDER = "Female"

# Interference B: same DOB + name contains "Maya Lewis"
MAYAANGELO_FIRST_NAME = "MayaAngelou"
MAYAANGELO_LAST_NAME = "Lewis"
MAYAANGELO_DOB = "2014-11-22"
MAYAANGELO_GENDER = "Female"


# --- Case constants (all dates as plain strings) ---

# Case numbers used only for identifying/cleaning these fixtures
CASE_NUMBER_2021_TANIEL = "CARE1-2021-TANIEL"      # 17 chars, within 20-char limit
CASE_NUMBER_2019_TANEL = "CARE1-2019-TANEL"        # 17 chars, within 20-char limit
CASE_NUMBER_2021_MAYAANGELO = "CARE1-2021-MAYA"    # 15 chars, within 20-char limit

# Historical / interference record dates
CASE_2021_TANIEL_DATE = "2021-04-15"
CASE_2019_TANEL_DATE = "2019-01-02"
CASE_2021_MAYAANGELO_DATE = "2021-04-15"

TULSA_COUNTY = "Tulsa County"


def _delete_existing_care1_data(cur, cac_id: int) -> None:
    """
    Remove any previously inserted Care 1 test data so this script is idempotent.
    Only touches:
    - The three known case_numbers defined above.
    - Persons that exactly match the first_name/last_name/DOB combinations below.
    """
    print("[yellow]Clearing existing Care 1 base data (if any)...[/yellow]")

    # Delete case_person rows and their parent cases for our known case_numbers
    cur.execute(
        """
        SELECT case_id
        FROM cac_case
        WHERE cac_id = %s
          AND case_number IN (%s, %s, %s)
        """,
        (cac_id, CASE_NUMBER_2021_TANIEL, CASE_NUMBER_2019_TANEL, CASE_NUMBER_2021_MAYAANGELO),
    )
    rows = cur.fetchall()
    case_ids = [r[0] for r in rows]

    for case_id in case_ids:
        cur.execute("DELETE FROM case_person WHERE case_id = %s", (case_id,))
        cur.execute("DELETE FROM cac_case WHERE case_id = %s", (case_id,))

    if case_ids:
        print(f"[green]Removed existing Care 1 cases: {case_ids}[/green]")

    # Delete only the exact fixture persons for this CAC (by name + DOB)
    fixture_people = [
        (TANIEL_FIRST_NAME, TANIEL_LAST_NAME, TANIEL_DOB),
        (NAKEISHA_FIRST_NAME, NAKEISHA_LAST_NAME, NAKEISHA_DOB),
        (STEVEN_FIRST_NAME, STEVEN_LAST_NAME, STEVEN_DOB),
        (TANEL_FIRST_NAME, TANEL_LAST_NAME, TANEL_DOB),
        (MAYAANGELO_FIRST_NAME, MAYAANGELO_LAST_NAME, MAYAANGELO_DOB),
    ]

    deleted_count = 0
    for first_name, last_name, dob in fixture_people:
        cur.execute(
            """
            DELETE FROM person
            WHERE cac_id = %s
              AND first_name = %s
              AND last_name = %s
              AND date_of_birth = %s::date
            """,
            (cac_id, first_name, last_name, dob),
        )
        deleted_count += cur.rowcount

    if deleted_count:
        print(f"[green]Removed {deleted_count} existing Care 1 fixture person record(s).[/green]")


def create_care1_base_data() -> bool:
    """
    Insert deterministic Care 1 fixtures:
    - 2021 Tulsa historical case for victim Taniel Lewis (with mother & alleged offender).
    - 2019 interference case for victim Tanel Lewis.
    - 2021 neglect interference case for victim MayaAngelou Lewis.
    """
    try:
        config = load_config()
        cac_id = get_or_create_default_cac()
        if not cac_id:
            print("[red]Failed to get or create CAC. Cannot create Care 1 base data.[/red]")
            return False

        with psycopg2.connect(**config) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Clean out any previous runs of this script
                _delete_existing_care1_data(cur, cac_id)

                # Allocate new case_ids for our three cases
                cur.execute("SELECT COALESCE(MAX(case_id), 0) + 1 FROM cac_case")
                first_case_id = cur.fetchone()[0]
                case_id_2021_taniel = first_case_id
                case_id_2019_tanel = first_case_id + 1
                case_id_2021_mayaangelo = first_case_id + 2

                # Allocate person_ids for our five people
                cur.execute("SELECT COALESCE(MAX(person_id), 0) + 1 FROM person")
                next_person_id = cur.fetchone()[0]
                taniel_id = next_person_id
                nakeisha_id = next_person_id + 1
                steven_id = next_person_id + 2
                tanel_id = next_person_id + 3
                mayaangelo_id = next_person_id + 4

                # --- Insert persons ---

                # Victim: Taniel Lewis (full profile)
                cur.execute(
                    """
                    INSERT INTO person (
                        person_id,
                        cac_id,
                        first_name,
                        last_name,
                        date_of_birth,
                        gender,
                        pronouns,
                        race,
                        religion,
                        first_language
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        taniel_id,
                        cac_id,
                        TANIEL_FIRST_NAME,
                        TANIEL_LAST_NAME,
                        TANIEL_DOB,
                        TANIEL_GENDER,
                        TANIEL_PRONOUNS[:20],
                        TANIEL_RACE[:256],
                        TANIEL_RELIGION[:256],
                        TANIEL_FIRST_LANGUAGE[:256],
                    ),
                )
                print("[green]Added victim: Taniel Lewis (2016-07-09).[/green]")

                # Mother: Nakeisha Anderson (with 2021 comment)
                cur.execute(
                    """
                    INSERT INTO person (
                        person_id,
                        cac_id,
                        first_name,
                        last_name,
                        date_of_birth,
                        gender,
                        comments_for_people
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        nakeisha_id,
                        cac_id,
                        NAKEISHA_FIRST_NAME,
                        NAKEISHA_LAST_NAME,
                        NAKEISHA_DOB,
                        NAKEISHA_GENDER,
                        NAKEISHA_2021_COMMENT[:512],
                    ),
                )
                print("[green]Added related person (mother): Nakeisha Anderson (1992-08-18).[/green]")

                # Biological father / alleged offender: Steven Lewis
                cur.execute(
                    """
                    INSERT INTO person (
                        person_id,
                        cac_id,
                        first_name,
                        last_name,
                        date_of_birth,
                        gender
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        steven_id,
                        cac_id,
                        STEVEN_FIRST_NAME,
                        STEVEN_LAST_NAME,
                        STEVEN_DOB,
                        STEVEN_GENDER,
                    ),
                )
                print("[green]Added related person (alleged offender): Steven Lewis (1990-05-04).[/green]")

                # Interference A victim: Tanel Lewis
                cur.execute(
                    """
                    INSERT INTO person (
                        person_id,
                        cac_id,
                        first_name,
                        last_name,
                        date_of_birth,
                        gender
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        tanel_id,
                        cac_id,
                        TANEL_FIRST_NAME,
                        TANEL_LAST_NAME,
                        TANEL_DOB,
                        TANEL_GENDER,
                    ),
                )
                print("[green]Added interference victim A: Tanel Lewis (2016-09-07).[/green]")

                # Interference B victim: MayaAngelou Lewis
                cur.execute(
                    """
                    INSERT INTO person (
                        person_id,
                        cac_id,
                        first_name,
                        last_name,
                        date_of_birth,
                        gender
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        mayaangelo_id,
                        cac_id,
                        MAYAANGELO_FIRST_NAME,
                        MAYAANGELO_LAST_NAME,
                        MAYAANGELO_DOB,
                        MAYAANGELO_GENDER,
                    ),
                )
                print("[green]Added interference victim B: MayaAngelou Lewis (2014-11-22).[/green]")

                # --- Insert cases ---

                # 2021 Tulsa historical case for Taniel
                cur.execute(
                    """
                    INSERT INTO cac_case (
                        cac_id,
                        case_id,
                        case_number,
                        cac_received_date,
                        created_date
                    )
                    VALUES (%s, %s, %s, %s::date, %s::date)
                    """,
                    (
                        cac_id,
                        case_id_2021_taniel,
                        CASE_NUMBER_2021_TANIEL,
                        CASE_2021_TANIEL_DATE,
                        CASE_2021_TANIEL_DATE,
                    ),
                )
                print(
                    f"[green]Created 2021 Tulsa historical case for Taniel "
                    f"(case_id={case_id_2021_taniel}, date={CASE_2021_TANIEL_DATE}).[/green]"
                )

                # 2019 interference case for Tanel
                cur.execute(
                    """
                    INSERT INTO cac_case (
                        cac_id,
                        case_id,
                        case_number,
                        cac_received_date,
                        created_date
                    )
                    VALUES (%s, %s, %s, %s::date, %s::date)
                    """,
                    (
                        cac_id,
                        case_id_2019_tanel,
                        CASE_NUMBER_2019_TANEL,
                        CASE_2019_TANEL_DATE,
                        CASE_2019_TANEL_DATE,
                    ),
                )
                print(
                    f"[green]Created 2019 interference case for Tanel "
                    f"(case_id={case_id_2019_tanel}, date={CASE_2019_TANEL_DATE}).[/green]"
                )

                # 2021 interference neglect case for MayaAngelou
                cur.execute(
                    """
                    INSERT INTO cac_case (
                        cac_id,
                        case_id,
                        case_number,
                        cac_received_date,
                        created_date
                    )
                    VALUES (%s, %s, %s, %s::date, %s::date)
                    """,
                    (
                        cac_id,
                        case_id_2021_mayaangelo,
                        CASE_NUMBER_2021_MAYAANGELO,
                        CASE_2021_MAYAANGELO_DATE,
                        CASE_2021_MAYAANGELO_DATE,
                    ),
                )
                print(
                    f"[green]Created 2021 interference neglect case for MayaAngelou "
                    f"(case_id={case_id_2021_mayaangelo}, date={CASE_2021_MAYAANGELO_DATE}).[/green]"
                )

                # --- Link persons to cases via case_person ---

                # Taniel as primary victim in 2021 historical case
                cur.execute(
                    """
                    INSERT INTO case_person (
                        person_id,
                        case_id,
                        cac_id,
                        victim_status,
                        age,
                        age_unit,
                        school_or_employer,
                        custody,
                        case_person_custom_field_7,
                        county,
                        role_id,
                        same_household
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        taniel_id,
                        case_id_2021_taniel,
                        cac_id,
                        "Primary",
                        4,  # approximate age at 2021-04-15
                        "Years",
                        TANIEL_EDUCATION[:200],
                        False,
                        "Allegation of abuse - physical abuse (kicked/struck Taniel)",
                        TULSA_COUNTY,
                        1,  # Alleged Co-victim / victim role
                        True,
                    ),
                )

                # Mother Nakeisha as caregiver / biological parent on same case
                cur.execute(
                    """
                    INSERT INTO case_person (
                        person_id,
                        case_id,
                        cac_id,
                        relationship_id,
                        role_id,
                        same_household,
                        custody
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        nakeisha_id,
                        case_id_2021_taniel,
                        cac_id,
                        1,  # Biological Parent
                        3,  # Caregiver
                        True,
                        True,
                    ),
                )

                # Biological father Steven as alleged offender / birth father on same case
                cur.execute(
                    """
                    INSERT INTO case_person (
                        person_id,
                        case_id,
                        cac_id,
                        relationship_id,
                        role_id,
                        same_household,
                        custody
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        steven_id,
                        case_id_2021_taniel,
                        cac_id,
                        10,  # Birth Father
                        2,   # Alleged Offender
                        False,
                        False,
                    ),
                )

                # Interference A victim (Tanel) with 2019 physical abuse record
                cur.execute(
                    """
                    INSERT INTO case_person (
                        person_id,
                        case_id,
                        cac_id,
                        victim_status,
                        case_person_custom_field_7,
                        county,
                        role_id,
                        same_household
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        tanel_id,
                        case_id_2019_tanel,
                        cac_id,
                        "Primary",
                        "Historical physical abuse record (2019-01-02)",
                        TULSA_COUNTY,
                        1,  # victim
                        True,
                    ),
                )

                # Interference B victim (MayaAngelou) with 2021 neglect record
                cur.execute(
                    """
                    INSERT INTO case_person (
                        person_id,
                        case_id,
                        cac_id,
                        victim_status,
                        case_person_custom_field_7,
                        county,
                        role_id,
                        same_household
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        mayaangelo_id,
                        case_id_2021_mayaangelo,
                        cac_id,
                        "Primary",
                        "Neglect record (2021-04-15)",
                        TULSA_COUNTY,
                        1,  # victim
                        True,
                    ),
                )

        return True
    except Exception as e:
        print(f"[red]Error creating Care 1 base data: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("[yellow]Creating Care 1 base data (2021 Tulsa historical case + interference records)...[/yellow]")
    if create_care1_base_data():
        print("[green]Care 1 base data created successfully.[/green]")
    else:
        print("[red]Failed to create Care 1 base data.[/red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
