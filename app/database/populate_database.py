import os
from .config import load_config
import psycopg2
import pandas as pd
import numpy as np
from rich import print
# Global

tables_to_fill = [
"child_advocacy_center",
"cac_agency",
"employee",
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

data_to_get = [
"child_advocacy_center_data.csv",
"cac_agency_data.csv",
"employee_data.csv",
"person_data.csv",
"cac_case_data.csv",
"case_person_data.csv",
"case_va_session_log_data.csv",
"case_va_session_attendee_data.csv",
"case_va_session_service_data.csv",
"case_mh_session_log_enc_data.csv",
"case_mh_session_attendee_data.csv",
"case_mh_attribute_group_data.csv",
    "case_mh_assessment_instruments_data.csv",
    "case_mh_instrument_measure_data.csv",
    "case_mh_assessments_data.csv",
    "case_mh_assessment_measure_scores_data.csv",
    "case_mh_diagonosis_log_data.csv",
"case_mh_treatment_models_data.csv",
"case_mh_treatment_plans_data.csv",
"case_mh_provider_log_data.csv",
"case_mh_service_barriers_data.csv"
]
    

def execute_command(command, data, name):
    try:
        config = load_config()
        successful_inserts = 0
        failed_inserts = 0
        
        # Count the number of placeholders in the SQL command
        placeholder_count = command.count('%s')
        
        print(f"[cyan]Table: {name}")
        print(f"[cyan]SQL placeholders (%s): {placeholder_count}")
        
        with psycopg2.connect(**config) as conn:
            with conn.cursor() as cur:
                for row_index, row in enumerate(data, start=1):
                    try:
                        # Debug: Check row length
                        row_length = len(row)
                        if row_length != placeholder_count:
                            print(f"[red]Row {row_index}: Mismatch! Expected {placeholder_count} values, got {row_length}")
                            print(f"[red]  Row data: {row}")
                            print(f"[red]  Row length: {row_length}, Placeholder count: {placeholder_count}")
                            failed_inserts += 1
                            continue
                        
                        cur.execute("SAVEPOINT savepoint_before_insert")
                        cur.execute(command, row)
                        successful_inserts += 1
                    except Exception as e:
                        cur.execute("ROLLBACK TO SAVEPOINT savepoint_before_insert")
                        failed_inserts += 1
                        print(f"[red]Error inserting row {row_index}: {e}")
                        print(f"[red]  Row data: {row}")
                        print(f"[red]  Row length: {len(row)}, Expected: {placeholder_count}")
                        # Print first few and last few values for debugging
                        if len(row) > 0:
                            print(f"[red]  First value: {row[0]}, Last value: {row[-1]}")
                conn.commit()
            print(
                f"[yellow]{name}: [green]{successful_inserts} rows inserted successfully, [red]{failed_inserts} rows failed.")
    except (psycopg2.DatabaseError, Exception) as error:
        print(f"[red]{error} on [yellow]{name}")
        
def main():
    for i in range(len(tables_to_fill)):
        table_name = tables_to_fill[i]
        data_name = data_to_get[i]
        # File Moving across different os
        cwd = os.path.dirname(os.path.abspath(__file__))
        table_file_path = os.path.join(cwd, "data_tables_variables")
        variable_file_path = os.path.join(table_file_path, table_name + ".sql")
        parent_dir = os.path.dirname(cwd)
        generator_dir = os.path.join(parent_dir, "generator")
        csvs_dir = os.path.join(generator_dir, "csvs")
        data_file_path = os.path.join(csvs_dir, data_name)

        try:
            with open(variable_file_path, "r") as file:
                insert_query = file.read()
                file.close()

            data = []
            with open(data_file_path, "r") as file:
                df = pd.read_csv(file)
                
                # Debug: Print CSV column information
                csv_columns = df.columns.tolist()
                csv_column_count = len(csv_columns)
                print(f"[cyan]CSV file: {data_name}")
                print(f"[cyan]CSV columns: {csv_column_count}")
                print(f"[cyan]CSV column names: {csv_columns}")
                
                # Fix nan to None so SQL can read it (https://stackoverflow.com/questions/14162723/replacing-pandas-or-numpy-nan-with-a-none-to-use-with-mysqldb)
                df = df.replace(np.nan, None)
                data = [tuple(row) for row in df.itertuples(index=False, name=None)]
                
                # Debug: Check first row length
                if len(data) > 0:
                    first_row_length = len(data[0])
                    print(f"[cyan]First row length: {first_row_length}")
                    print(f"[cyan]First row sample (first 5 values): {data[0][:5]}")
                
                file.close()
            execute_command(insert_query, data, name=table_name)
        except Exception as e:
            print(f"[red]Error processing {table_name}: {e}")
            import traceback
            traceback.print_exc()
