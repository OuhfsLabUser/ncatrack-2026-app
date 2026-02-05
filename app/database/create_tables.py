import psycopg2
import os
from .config import load_config

tables_to_create = [
    "state",
    "child_advocacy_center",
    "cac_agency",
    "employee",
    "employee_account",
    "person",
    "cac_case",
    "case_person",
    "case_va_session_log",
    "case_va_session_attendee",
    "case_va_session_service",
    "case_mh_session_log_enc",
    "case_mh_session_attendee",
    "case_mh_session_attribute_group",
    "case_mh_assessment_instrument",
    "case_mh_instrument_measure",
    "case_mh_assessment",
    "case_mh_assessment_measure_scores",
    "case_mh_assessment_diagnosis",
    "case_mh_treatment_models",
    "case_mh_treatment_plans",
    "case_mh_provider",
    "case_mh_service_barriers"
]

# Wrapper function to simplify syntax for calling a try-except block with the database connection
def execute_command(command):
    try:
        config = load_config()
        with psycopg2.connect(**config) as conn:
            conn.autocommit = True  # Important for table creation/deletion
            with conn.cursor() as cur:
                cur.execute(command)
    except (psycopg2.DatabaseError, Exception) as error:
        print(error)
        
def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Delete all existing tables so the new database can be built
    print("Deleting old database tables...")
    delete_tables_file_path = os.path.join(base_dir, "delete_tables.sql")
    with open(delete_tables_file_path, "r") as delete_tables_file:
        commands = delete_tables_file.read().split(";")
        for command in commands:
            try:
                if command.strip() != "":
                    execute_command(command)
            except Exception as error:
                print(f"Error: {error}\nIf tables never existed, this can be ignored.")
    
    # Create new tables from the above list
    for table_name in tables_to_create:
        print(f"Creating new table {table_name}")
        sql_file_path = os.path.join(base_dir, "data_tables", f"{table_name}_table.sql")
        with open(sql_file_path, "r") as sql_file:
            commands = sql_file.read().split(";")
            for command in commands:
                if command.strip() != "":
                    execute_command(command)

    print("All database tables created successfully.")