import os
import pandas as pd
import numpy as np
import re
from psycopg2 import sql
import sys

sys.path.append('..')
from database.config import load_config
from database.connect import connect

# Define table dependencies (which tables need to be loaded before others)
TABLE_DEPENDENCIES = {
    "child_advocacy_center": [],  # No dependencies
    "cac_agency": ["child_advocacy_center"],
    "employee": ["child_advocacy_center", "cac_agency"],
    "employee_account": ["employee"],
    "person": ["child_advocacy_center"],
    "cac_case": ["child_advocacy_center", "cac_agency"],
    "case_person": ["person", "cac_case", "child_advocacy_center"],
    "case_mh_assessment_instrument": [],  # No dependencies
    "case_mh_treatment_models": [],  # No dependencies
    "case_mh_assessment": ["child_advocacy_center", "cac_case", "cac_agency", "case_mh_assessment_instrument", "employee"],
    "case_mh_assessment_measure_scores": ["child_advocacy_center", "cac_case", "case_mh_assessment", "case_mh_assessment_instrument"],
    "case_mh_assessment_diagnosis": ["cac_case", "cac_agency"],
    "case_mh_session_log_enc": ["child_advocacy_center", "cac_case", "cac_agency", "employee"],
    "case_mh_session_attendee": ["person", "child_advocacy_center", "cac_case", "case_mh_session_log_enc"],
    "case_mh_session_attribute_group": ["child_advocacy_center", "cac_case", "case_mh_session_log_enc"],
    "case_mh_treatment_plans": ["child_advocacy_center", "cac_case", "cac_agency", "employee", "case_mh_treatment_models"],
    "case_mh_provider": ["cac_agency", "cac_case", "employee"],
    "case_mh_service_barriers": [],  # No dependencies
    "case_va_session_log": ["child_advocacy_center", "cac_case", "cac_agency"],
    "case_va_session_attendee": ["cac_case", "case_va_session_log", "person"],
    "case_va_session_service": ["child_advocacy_center", "case_va_session_log"]
}

def sort_tables_by_dependencies(tables):
    """
    Sort tables by their dependencies to ensure foreign key constraints are respected.
    """
    # Create a mapping of tables to their dependencies
    dependency_map = {table: TABLE_DEPENDENCIES.get(table, []) for table in tables}
    
    # Topological sort algorithm
    visited = set()
    result = []
    
    def dfs(node):
        if node in visited:
            return
        visited.add(node)
        for dep in dependency_map.get(node, []):
            if dep in tables:  # Only consider dependencies that are in our tables list
                dfs(dep)
        result.append(node)
    
    # Visit all nodes
    for table in tables:
        dfs(table)
    
    return result

def main(scenario_config):
    """
    Populate the database with data from a scenario.
    
    Args:
        scenario_config: A dictionary containing:
            - scenario_path: Path to the scenario directory
            - tables: List of tables to populate
    """
    try:
        # Load database configuration
        config = load_config()
        conn = connect(config)
        
        if not conn:
            print("[red]Failed to connect to database. Check your database.ini configuration.")
            return False
        
        scenario_path = scenario_config["scenario_path"]
        tables = scenario_config["tables"]
        
        # Sort tables by dependencies
        sorted_tables = sort_tables_by_dependencies(tables)
        print(f"[green]Tables will be loaded in this order: {', '.join(sorted_tables)}")
        
        # For each table in the scenario (in dependency order)
        for table in sorted_tables:
            # Load the CSV file
            csv_path = os.path.join(scenario_path, f"{table}_data.csv")
            if not os.path.exists(csv_path):
                print(f"[yellow]Warning: No CSV file found for table {table}")
                continue
                
            print(f"[yellow]Loading data for table {table}...")
            
            try:
                # Read the CSV file
                df = pd.read_csv(csv_path)
                
                # Clean up the data - replace NaN with None
                df = df.replace({np.nan: None})
                
                # Skip if there's no data
                if df.empty:
                    print(f"[yellow]No data found in CSV for {table}")
                    continue
                
                # Get column names from CSV
                columns = df.columns.tolist()
                
                # Clear existing data from the table
                with conn.cursor() as cursor:
                    cursor.execute(sql.SQL("DELETE FROM {}").format(sql.Identifier(table)))
                    print(f"[green]Cleared existing data from {table}")
                
                # Find the corresponding SQL file in the data_tables_variables directory
                sql_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                            "data_tables_variables", f"{table}.sql")
                
                if not os.path.exists(sql_file_path):
                    print(f"[red]SQL file not found for table {table}. Skipping.")
                    continue
                
                # Read the SQL insert statement
                with open(sql_file_path, "r") as sql_file:
                    insert_sql = sql_file.read()
                
                # Extract column names from SQL INSERT statement
                # Find the column list between parentheses after INSERT INTO table_name
                sql_columns_match = re.search(r'INSERT INTO\s+\w+\s*\((.*?)\)', insert_sql, re.IGNORECASE | re.DOTALL)
                if sql_columns_match:
                    sql_column_names = [col.strip() for col in sql_columns_match.group(1).split(',')]
                else:
                    sql_column_names = []
                
                # Count the number of placeholders in the SQL command
                placeholder_count = insert_sql.count('%s')
                
                # Create column mapping: CSV column name -> SQL column name
                # Handle column name mismatches (e.g., va_have_police_report -> va_has_police_report)
                column_mapping = {}
                csv_lower_to_original = {col.lower(): col for col in columns}
                
                for sql_col in sql_column_names:
                    sql_col_lower = sql_col.lower()
                    # Try exact match first
                    if sql_col in columns:
                        column_mapping[sql_col] = sql_col
                    # Try case-insensitive match
                    elif sql_col_lower in csv_lower_to_original:
                        column_mapping[sql_col] = csv_lower_to_original[sql_col_lower]
                    # Handle specific known mismatches
                    elif sql_col == 'va_has_police_report' and 'va_have_police_report' in columns:
                        column_mapping[sql_col] = 'va_have_police_report'
                    elif sql_col == 'cac_name' and 'agency_name' in columns:
                        column_mapping[sql_col] = 'agency_name'
                    elif sql_col == 'instrument_id' and 'instruments_id' in columns:
                        column_mapping[sql_col] = 'instruments_id'
                    elif sql_col == 'model_name' and 'Name' in columns:
                        column_mapping[sql_col] = 'Name'
                    elif sql_col == 'victim_status' and 'victim_status_id' in columns:
                        column_mapping[sql_col] = 'victim_status_id'
                    elif sql_col == 'addr_line_1' and 'address_line_1' in columns:
                        column_mapping[sql_col] = 'address_line_1'
                    elif sql_col == 'addr_line_2' and 'address_line_2' in columns:
                        column_mapping[sql_col] = 'address_line_2'
                    elif sql_col == 'zip_code' and 'zip' in columns:
                        column_mapping[sql_col] = 'zip'
                    else:
                        # Column not found in CSV, will be set to None
                        column_mapping[sql_col] = None
                
                # Debug: Print column information
                print(f"[cyan]Table: {table}")
                print(f"[cyan]CSV columns: {len(columns)}")
                print(f"[cyan]CSV column names: {columns}")
                print(f"[cyan]SQL columns: {len(sql_column_names)}")
                print(f"[cyan]SQL column names: {sql_column_names}")
                print(f"[cyan]SQL placeholders (%s): {placeholder_count}")
                if len(columns) != placeholder_count:
                    print(f"[yellow]Warning: Column count mismatch. CSV has {len(columns)} columns, SQL expects {placeholder_count} values.")
                
                # Now insert each row
                successful_inserts = 0
                failed_inserts = 0
                
                with conn.cursor() as cursor:
                    for row_index, (_, row) in enumerate(df.iterrows(), start=1):
                        try:
                            # Build row data based on SQL column order
                            processed_row = []
                            for sql_col in sql_column_names:
                                csv_col = column_mapping.get(sql_col)
                                if csv_col is None:
                                    # Column not in CSV, use None
                                    processed_row.append(None)
                                else:
                                    val = row.get(csv_col)
                                    # Convert values to proper types
                                    # Convert string 'None' to actual None
                                    if isinstance(val, str) and val.lower() == 'none':
                                        processed_row.append(None)
                                    # Handle boolean fields
                                    elif isinstance(val, str) and val.lower() in ('true', 'false'):
                                        processed_row.append(val.lower() == 'true')
                                    # Handle NaN values
                                    elif pd.isna(val):
                                        processed_row.append(None)
                                    # Handle numpy int64 types (convert to Python int)
                                    elif isinstance(val, (np.integer, np.int64)):
                                        processed_row.append(int(val))
                                    # Handle numpy float64 types (convert to Python float)
                                    elif isinstance(val, (np.floating, np.float64)):
                                        processed_row.append(float(val))
                                    # Special handling for role_id: if empty/None, default to 1 (Victim role)
                                    # This must be checked BEFORE empty string check to ensure role_id gets a value
                                    elif sql_col == 'role_id' and (val is None or pd.isna(val) or (isinstance(val, str) and val.strip() == '')):
                                        processed_row.append(1)  # Default to role_id = 1 (Victim)
                                    # Handle empty strings as None for optional fields
                                    elif isinstance(val, str) and val.strip() == '':
                                        processed_row.append(None)
                                    else:
                                        processed_row.append(val)
                            
                            # Create a tuple of processed values
                            row_data = tuple(processed_row)
                            
                            # Debug: Check row length before insert
                            row_length = len(row_data)
                            if row_length != placeholder_count:
                                print(f"[red]Row {row_index}: Mismatch! Expected {placeholder_count} values, got {row_length}")
                                print(f"[red]  Row data: {row_data}")
                                print(f"[red]  Row length: {row_length}, Placeholder count: {placeholder_count}")
                                failed_inserts += 1
                                continue
                            
                            # Execute the SQL with the row data
                            cursor.execute("SAVEPOINT before_insert")
                            cursor.execute(insert_sql, row_data)
                            successful_inserts += 1
                        except Exception as insert_error:
                            cursor.execute("ROLLBACK TO SAVEPOINT before_insert")
                            failed_inserts += 1
                            print(f"[red]Error inserting row {row_index}: {insert_error}")
                            print(f"[red]  Row data: {row_data}")
                            print(f"[red]  Row length: {len(row_data)}, Expected: {placeholder_count}")
                            # Print first few and last few values for debugging
                            if len(row_data) > 0:
                                print(f"[red]  First value: {row_data[0]}, Last value: {row_data[-1]}")
                    
                    # Commit the transaction
                    conn.commit()
                
                print(f"[green]Table {table}: {successful_inserts} rows inserted successfully, {failed_inserts} rows failed.")
                
            except Exception as e:
                print(f"[red]Error processing table {table}: {str(e)}")
        
        # Close the connection
        conn.close()
        return True
        
    except Exception as e:
        print(f"[red]Error loading scenario: {str(e)}")
        return False

if __name__ == "__main__":
    # This can be run independently for testing purposes
    import argparse
    parser = argparse.ArgumentParser(description='Load a database scenario')
    parser.add_argument('scenario_path', help='Path to the scenario directory')
    args = parser.parse_args()
    
    # Find which tables have CSV files
    tables = []
    for file in os.listdir(args.scenario_path):
        if file.endswith('_data.csv'):
            table_name = file[:-9]  # Remove the _data.csv suffix
            tables.append(table_name)
    
    scenario_config = {
        "scenario_path": args.scenario_path,
        "tables": tables
    }
    
    main(scenario_config)