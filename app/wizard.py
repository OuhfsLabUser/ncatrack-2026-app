import os
import subprocess
import getpass

from rich import print
from rich.prompt import Prompt, Confirm
from rich.console import Console

from database.create_tables import main as create_tables
from database.populate_database import main as populate_database
from database.populate_picklists import main as populate_picklists  # Import the new Python-based picklist handler
from database.add_treatment_plan_columns import main as add_treatment_plan_columns
from generator.data_generator import run_generator_menu, create_scenario

console = Console()

db_tables = [
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
    "case_mh_assessment",
    "case_mh_assessment_measure_scores",
    "case_mh_assessment_diagnosis",
    "case_mh_treatment_models",
    "case_mh_treatment_plans",
    "case_mh_provider",
    "case_mh_service_barriers",
    # We don't include pick list tables here as they're handled separately
]

def setup_database_config():
    """
    Setup database configuration with superuser credentials only
    """
    print("[yellow]Database Configuration Setup[/yellow]")
    print("[blue]Please provide the following information for your PostgreSQL installation:[/blue]")
    
    # PostgreSQL superuser information
    print("\n[bold]PostgreSQL Superuser Information[/bold]")
    pg_host = Prompt.ask("[yellow]Enter PostgreSQL server hostname/IP", default="localhost")
    pg_port = Prompt.ask("[yellow]Enter PostgreSQL server port", default="5432")
    pg_super_user = Prompt.ask("[yellow]Enter PostgreSQL superuser name", default="postgres")
    pg_super_pass = getpass.getpass("[yellow]Enter PostgreSQL superuser password: ")
    
    # Set environment variable for superuser password
    os.environ["PGPASSWORD"] = pg_super_pass
    os.environ["PG_SUPERUSER"] = pg_super_user
    os.environ["PG_PORT"] = pg_port
    
    # Database information
    print("\n[bold]Database Information[/bold]")
    db_name = Prompt.ask("[yellow]Enter the name for your database", default="ncatrak")
    
    # Confirm settings before proceeding
    print("\n[bold]Please confirm your settings:[/bold]")
    print(f"[cyan]PostgreSQL Server: {pg_host}:{pg_port}[/cyan]")
    print(f"[cyan]PostgreSQL Superuser: {pg_super_user}[/cyan]")
    print(f"[cyan]Database Name: {db_name}[/cyan]")
    print("\n[yellow]Note: The superuser account will be used for all database operations.[/yellow]")
    
    confirmed = Confirm.ask("[yellow]Are these settings correct?", default=True)
    if not confirmed:
        print("[red]Configuration cancelled. Please try again.[/red]")
        return None
    
    # Create database.ini file using superuser credentials
    cwd = os.path.dirname(os.path.abspath(__file__))
    database_ini_path = os.path.join(cwd, "database", "database.ini")
    with open(database_ini_path, "w") as file:
        file.write("[postgresql]\n")
        file.write(f"host={pg_host}\n")
        file.write(f"port={pg_port}\n")
        file.write(f"database={db_name}\n")
        file.write(f"user={pg_super_user}\n")
        file.write(f"password={pg_super_pass}\n")
    print("[green]Database.ini file has been created.[/green]")
    
    # Create .env file for API
    env_file_path = os.path.join(cwd, "api", ".env")
    os.makedirs(os.path.dirname(env_file_path), exist_ok=True)
    with open(env_file_path, "w") as env_file:
        env_file.write(f'DATABASE_URL="postgresql://{pg_super_user}:{pg_super_pass}@{pg_host}:{pg_port}/{db_name}?schema=public"')
    print("[green].env file has been created.[/green]")
    
    return [pg_host, db_name, pg_super_user, pg_super_pass]

def create_database_if_not_exists(config_data):
    """
    Create the database if it doesn't exist using psql command
    """
    host, db_name, user, password = config_data
    port = os.environ.get("PG_PORT", "5432")
    
    try:
        # Check if database exists
        print(f"[yellow]Checking if database '{db_name}' exists...[/yellow]")
        
        # Use subprocess to run psql command
        check_cmd = [
            "psql",
            "-h", host,
            "-p", port,
            "-U", user,
            "-d", "postgres",
            "-t",
            "-c", f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"
        ]
        
        result = subprocess.run(check_cmd, capture_output=True, text=True)
        
        if "1" in result.stdout.strip():
            print(f"[yellow]Database '{db_name}' already exists.[/yellow]")
            return True
        
        # Create database if it doesn't exist
        print(f"[yellow]Creating database '{db_name}'...[/yellow]")
        
        create_cmd = [
            "psql",
            "-h", host,
            "-p", port,
            "-U", user,
            "-d", "postgres",
            "-c", f"CREATE DATABASE {db_name}"
        ]
        
        subprocess.run(create_cmd, check=True)
        print(f"[green]Database '{db_name}' created successfully.[/green]")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"[red]Error creating database: {e}[/red]")
        if hasattr(e, 'stderr'):
            print(f"[red]{e.stderr}[/red]")
        return False
    except Exception as e:
        print(f"[red]Error: {e}[/red]")
        return False

def list_scenarios():
    """
    List all available scenarios and let the user select one.
    """
    cwd = os.path.dirname(os.path.abspath(__file__))
    scenarios_dir = os.path.join(cwd, "scenarios")
    
    # Create scenarios directory if it doesn't exist
    if not os.path.exists(scenarios_dir):
        os.makedirs(scenarios_dir)
        print("[yellow]No scenarios found. Please add scenario folders to the 'scenarios' directory.[/yellow]")
        return None
    
    # Get list of scenario directories
    scenarios = [d for d in os.listdir(scenarios_dir) 
                if os.path.isdir(os.path.join(scenarios_dir, d))]
    
    if not scenarios:
        print("[yellow]No scenarios found. Please add scenario folders to the 'scenarios' directory.[/yellow]")
        return None
    
    print("[yellow]Available scenarios:[/yellow]")
    for i, scenario in enumerate(scenarios, 1):
        # Check if scenario has a description file
        desc_file = os.path.join(scenarios_dir, scenario, "description.txt")
        description = ""
        if os.path.exists(desc_file):
            with open(desc_file, 'r') as f:
                description = f" - " + f.read().strip()
                
        print(f"[white][{i}] {scenario}{description}[/white]")
    
    while True:
        selection = input("Select a scenario (number): ")
        if selection.isdigit() and 0 < int(selection) <= len(scenarios):
            return scenarios[int(selection) - 1]
        else:
            print("[red]Invalid selection. Please enter a valid number.[/red]")

def load_scenario(scenario_name):
    """
    Load a predefined scenario into the database.
    """
    try:
        # Path to the scenario data
        cwd = os.path.dirname(os.path.abspath(__file__))
        scenario_path = os.path.join(cwd, "scenarios", scenario_name)
        
        if not os.path.exists(scenario_path):
            print(f"[red]Error: Scenario '{scenario_name}' not found.[/red]")
            return False
        
        print(f"[yellow]Loading scenario '{scenario_name}'...[/yellow]")
        
        # Create an empty config file that we'll pass to populate_database
        scenario_config = {
            "scenario_path": scenario_path,
            "tables": []
        }
        
        # Check which tables have data in this scenario
        for table in db_tables:
            csv_file = os.path.join(scenario_path, f"{table}_data.csv")
            if os.path.exists(csv_file):
                scenario_config["tables"].append(table)
                print(f"[green]Found data for table '{table}'[/green]")
                
        # Handle empty scenario (like Base_Setup) - still proceed to clear tables and populate picklists
        if not scenario_config["tables"]:
            print("[yellow]No data files found in this scenario. This will clear all data tables and populate picklists only.[/yellow]")
            # Still need to clear existing data from tables
            print("[yellow]Clearing existing data by recreating tables...[/yellow]")
            try:
                create_tables()
                add_treatment_plan_columns()
                print("[green]Tables cleared successfully.[/green]")
            except Exception as e:
                print(f"[red]Error clearing tables: {e}[/red]")
                return False
        else:
            # Call populate_scenario with the scenario config if there are data files
            from database.populate_scenario import main as populate_scenario
            if not populate_scenario(scenario_config):
                print(f"[red]Failed to populate scenario data.[/red]")
                return False
        
        # Populate pick lists using the Python-based handler (same as generate_and_populate_data)
        print("[yellow]Populating pick lists...[/yellow]")
        try:
            populate_picklists()
            print("[green]Pick lists populated successfully.[/green]")
        except Exception as e:
            print(f"[red]Error populating pick lists: {e}[/red]")
            return False
        
        # Extend agency_name field length if needed
        print("[yellow]Checking agency_name field length...[/yellow]")
        try:
            from database.extend_agency_name_length import main as extend_agency_name_length
            extend_agency_name_length()
            
            # Add Case Manager fields to cac_case table
            print("[yellow]Adding Case Manager fields to cac_case table...[/yellow]")
            try:
                from database.add_case_manager_fields import main as add_case_manager_fields
                add_case_manager_fields()
                print("[green]Case Manager fields added successfully.[/green]")
            except Exception as e:
                print(f"[yellow]Warning: Error adding Case Manager fields: {e}[/yellow]")
                # Don't fail the scenario load if this fails
        except Exception as e:
            print(f"[yellow]Warning: Error extending agency_name field: {e}[/yellow]")
        
        # Populate referral agencies (especially for Base_Setup scenario)
        if scenario_name == "Base_Setup" or not scenario_config["tables"]:
            print("[yellow]Populating referral agencies...[/yellow]")
            try:
                from database.populate_referral_agencies import main as populate_referral_agencies
                populate_referral_agencies()
                print("[green]Referral agencies populated successfully.[/green]")
            except Exception as e:
                print(f"[yellow]Warning: Error populating referral agencies: {e}[/yellow]")
                # Don't fail the scenario load if referral agencies fail
            
            # Populate referral persons (employees)
            print("[yellow]Populating referral persons...[/yellow]")
            try:
                from database.populate_referral_persons import main as populate_referral_persons
                populate_referral_persons()
                print("[green]Referral persons populated successfully.[/green]")
            except Exception as e:
                print(f"[yellow]Warning: Error populating referral persons: {e}[/yellow]")
                # Don't fail the scenario load if referral persons fail
            
            # Populate persons with last name "Lewis"
            print("[yellow]Populating Lewis persons...[/yellow]")
            try:
                from database.populate_lewis_persons import main as populate_lewis_persons
                populate_lewis_persons()
                print("[green]Lewis persons populated successfully.[/green]")
            except Exception as e:
                print(f"[yellow]Warning: Error populating Lewis persons: {e}[/yellow]")
                # Don't fail the scenario load if Lewis persons fail
        
        # Fix database permissions for Prisma (same as generate_and_populate_data)
        fix_database_permissions()
        
        print(f"[green]Successfully loaded scenario '{scenario_name}'.[/green]")
        return True
    
    except Exception as e:
        print(f"[red]Error loading scenario: {str(e)}[/red]")
        return False

def fix_database_permissions():
    """
    Fix permissions for the PostgreSQL superuser to properly access the database through Prisma
    """
    from database.fix_permissions import fix_permissions
    
    print("[yellow]Fixing database permissions for Prisma...[/yellow]")
    if fix_permissions():
        print("[green]Database permissions fixed successfully![/green]")
        return True
    else:
        print("[red]Failed to fix database permissions. You may need to manually grant permissions.[/red]")
        return False

def save_scenario_from_generator():
    """
    Create a new scenario from generated data.
    This is different from the data_generator's scenario creation in that
    it assumes data has already been generated.
    """
    scenario_name = Prompt.ask("[yellow]Enter a name for the new scenario[/yellow]")
    result = create_scenario(scenario_name)
    if result:
        print(f"[green]Scenario '{scenario_name}' has been created successfully.[/green]")
    else:
        print("[red]Failed to create scenario.[/red]")

def generate_and_populate_data():
    """
    Generate data and populate the database
    Ensures tables are created first before any data population
    """
    # First ensure tables are created in the database
    print("[yellow]Creating database tables...[/yellow]")
    try:
        create_tables()
        print("[green]Database tables created successfully.[/green]")
        
        # Add missing columns to case_mh_treatment_plans if needed
        print("[yellow]Checking for missing columns in case_mh_treatment_plans...[/yellow]")
        add_treatment_plan_columns()
    except Exception as e:
        print(f"[red]Error creating tables: {e}[/red]")
        return False
    
    # Then generate data
    print("[yellow]Generating fake data...[/yellow]")
    run_generator_menu()
    print("[green]Data generated successfully.[/green]")
    
    # Then populate the database with the generated data
    print("[yellow]Populating database with generated data...[/yellow]")
    try:
        populate_database()
        print("[green]Database populated successfully.[/green]")
    except Exception as e:
        print(f"[red]Error populating database: {e}[/red]")
        return False
    
    # Populate pick lists using the Python-based handler
    print("[yellow]Populating pick lists...[/yellow]")
    try:
        populate_picklists()
        print("[green]Pick lists populated successfully.[/green]")
    except Exception as e:
        print(f"[red]Error populating pick lists: {e}[/red]")
        return False
    
    # Extend agency_name field length if needed
    print("[yellow]Checking agency_name field length...[/yellow]")
    try:
        from database.extend_agency_name_length import main as extend_agency_name_length
        extend_agency_name_length()
        
        # Add Case Manager fields to cac_case table
        print("[yellow]Adding Case Manager fields to cac_case table...[/yellow]")
        try:
            from database.add_case_manager_fields import main as add_case_manager_fields
            add_case_manager_fields()
            print("[green]Case Manager fields added successfully.[/green]")
        except Exception as e:
            print(f"[yellow]Warning: Error adding Case Manager fields: {e}[/yellow]")
            # Don't fail if this fails
    except Exception as e:
        print(f"[yellow]Warning: Error extending agency_name field: {e}[/yellow]")
    
    # Populate referral agencies
    print("[yellow]Populating referral agencies...[/yellow]")
    try:
        from database.populate_referral_agencies import main as populate_referral_agencies
        populate_referral_agencies()
        print("[green]Referral agencies populated successfully.[/green]")
    except Exception as e:
        print(f"[yellow]Warning: Error populating referral agencies: {e}[/yellow]")
        # Don't fail if referral agencies fail
    
    # Populate referral persons (employees)
    print("[yellow]Populating referral persons...[/yellow]")
    try:
        from database.populate_referral_persons import main as populate_referral_persons
        populate_referral_persons()
        print("[green]Referral persons populated successfully.[/green]")
    except Exception as e:
        print(f"[yellow]Warning: Error populating referral persons: {e}[/yellow]")
        # Don't fail if referral persons fail
    
    # Populate persons with last name "Lewis"
    print("[yellow]Populating Lewis persons...[/yellow]")
    try:
        from database.populate_lewis_persons import main as populate_lewis_persons
        populate_lewis_persons()
        print("[green]Lewis persons populated successfully.[/green]")
    except Exception as e:
        print(f"[yellow]Warning: Error populating Lewis persons: {e}[/yellow]")
        # Don't fail if Lewis persons fail
    
    # Fix database permissions for Prisma
    fix_database_permissions()
    
    return True

if __name__ == "__main__":
    console.print('''
[bold blue]WELCOME TO THE NCA-TRAK SETUP WIZARD[/bold blue]

If you haven't yet, please read the [red]README.MD[/red] file in the home directory.
[bold red]IT IS VITAL YOU HAVE THE REQUIREMENTS INSTALLED BEFORE PROCEEDING[/bold red]

[yellow]Please Select From the following options:[/yellow]
[white]
[1] Complete Install
[2] Add New Generated Data
[3] Load Predefined Scenario
[4] Save Current Data as Scenario
[/white]
''')

    while True:
        n = input()
        if not (n.isdigit() and 4 >= int(n) > 0):
            print("[red]Please insert a number from the options listed.[/red]")
        else:
            break
    n = int(n)

    if n == 1:
        # Complete install
        config_data = setup_database_config()
        if config_data is None:
            print("[red]Setup cancelled.[/red]")
            exit(1)
            
        # Create the database
        if not create_database_if_not_exists(config_data):
            print("[red]Failed to create database. Setup cancelled.[/red]")
            exit(1)
        
        # Generate and populate data
        if generate_and_populate_data():
            print("[green][bold]Installation complete. Database has been populated.[/bold][/green]")
            
            # After complete install, automatically load Base_Setup scenario if it exists
            cwd = os.path.dirname(os.path.abspath(__file__))
            scenarios_dir = os.path.join(cwd, "scenarios")
            default_scenario = "Base_Setup"
            
            if os.path.exists(scenarios_dir):
                scenario_path = os.path.join(scenarios_dir, default_scenario)
                
                if os.path.exists(scenario_path) and os.path.isdir(scenario_path):
                    print(f"\n[yellow]Found default scenario: '{default_scenario}'[/yellow]")
                    print("[yellow]Loading a scenario will replace the generated data with scenario data.[/yellow]")
                    
                    load_scenario_choice = Prompt.ask(
                        f"[yellow]Load default scenario '{default_scenario}'?[/yellow]", 
                        choices=["y", "n", "choose"], 
                        default="y"
                    )
                    
                    scenario_name = None
                    if load_scenario_choice.lower() == "y":
                        scenario_name = default_scenario
                    elif load_scenario_choice.lower() == "choose":
                        scenario_name = list_scenarios()
                    
                    if scenario_name:
                        if load_scenario(scenario_name):
                            print(f"[bold green]Scenario '{scenario_name}' has been loaded successfully.[/bold green]")
                        else:
                            print(f"[bold red]Failed to load scenario '{scenario_name}'.[/bold red]")
                    else:
                        print("[yellow]No scenario loaded. Using generated data.[/yellow]")
                else:
                    # If Base_Setup doesn't exist, check for other scenarios
                    scenarios = [d for d in os.listdir(scenarios_dir) 
                               if os.path.isdir(os.path.join(scenarios_dir, d))]
                    
                    if scenarios:
                        print(f"\n[yellow]Default scenario '{default_scenario}' not found.[/yellow]")
                        print(f"[yellow]Found {len(scenarios)} other available scenario(s).[/yellow]")
                        print("[yellow]Loading a scenario will replace the generated data with scenario data.[/yellow]")
                        
                        load_scenario_choice = Prompt.ask(
                            "[yellow]Load a scenario?[/yellow]", 
                            choices=["y", "n", "choose"], 
                            default="n"
                        )
                        
                        scenario_name = None
                        if load_scenario_choice.lower() == "y" or load_scenario_choice.lower() == "choose":
                            scenario_name = list_scenarios()
                        
                        if scenario_name:
                            if load_scenario(scenario_name):
                                print(f"[bold green]Scenario '{scenario_name}' has been loaded successfully.[/bold green]")
                            else:
                                print(f"[bold red]Failed to load scenario '{scenario_name}'.[/bold red]")
                        else:
                            print("[yellow]No scenario loaded. Using generated data.[/yellow]")
                    else:
                        print(f"[yellow]Default scenario '{default_scenario}' not found. No other scenarios available.[/yellow]")
            else:
                print("[yellow]Scenarios directory not found.[/yellow]")
        else:
            print("[red][bold]Installation encountered errors. Please check the logs above.[/bold][/red]")

    # Add New Generated Data
    elif n == 2:
        # Check if database.ini exists
        if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "database", "database.ini")):
            print("[yellow]Database configuration not found. Please provide database information.[/yellow]")
            config_data = setup_database_config()
            if config_data is None:
                print("[red]Setup cancelled.[/red]")
                exit(1)
                
            # Create the database
            if not create_database_if_not_exists(config_data):
                print("[red]Failed to create database. Setup cancelled.[/red]")
                exit(1)
        
        if generate_and_populate_data():
            print("[bold green]Additional data added successfully.[/bold green]")
        else:
            print("[red][bold]Failed to add data. Please check the logs above.[/bold][/red]")
        
    # Load a predefined scenario
    elif n == 3:
        # First, ask about database connection if needed
        if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "database", "database.ini")):
            print("[yellow]Database configuration not found. Please provide database information.[/yellow]")
            config_data = setup_database_config()
            if config_data is None:
                print("[red]Setup cancelled.[/red]")
                exit(1)
                
            # Create the database
            if not create_database_if_not_exists(config_data):
                print("[red]Failed to create database. Setup cancelled.[/red]")
                exit(1)
        
        print("[yellow]Loading a predefined scenario will clear existing data in the database.[/yellow]")
        confirm = Prompt.ask("[yellow]Do you want to continue?[/yellow]", choices=["y", "n"], default="y")
        
        if confirm.lower() == "y":
            # Create tables first
            print("[yellow]Creating database tables...[/yellow]")
            try:
                create_tables()
                print("[green]Database tables created successfully.[/green]")
                
                # Add missing columns to case_mh_treatment_plans if needed
                print("[yellow]Checking for missing columns in case_mh_treatment_plans...[/yellow]")
                add_treatment_plan_columns()
            
                # Try to load Base_Setup as default scenario
                cwd = os.path.dirname(os.path.abspath(__file__))
                scenarios_dir = os.path.join(cwd, "scenarios")
                default_scenario = "Base_Setup"
                scenario_path = os.path.join(scenarios_dir, default_scenario)
                
                scenario_name = None
                if os.path.exists(scenario_path) and os.path.isdir(scenario_path):
                    print(f"[yellow]Found default scenario: '{default_scenario}'[/yellow]")
                    load_default = Prompt.ask(
                        f"[yellow]Load default scenario '{default_scenario}'?[/yellow]", 
                        choices=["y", "n", "choose"], 
                        default="y"
                    )
                    
                    if load_default.lower() == "y":
                        scenario_name = default_scenario
                    elif load_default.lower() == "choose":
                        scenario_name = list_scenarios()
                else:
                    # If Base_Setup doesn't exist, list all scenarios
                    print(f"[yellow]Default scenario '{default_scenario}' not found.[/yellow]")
                    scenario_name = list_scenarios()
                
                if scenario_name:
                    if load_scenario(scenario_name):
                        print(f"[bold green]Scenario '{scenario_name}' has been loaded successfully.[/bold green]")
                    else:
                        print(f"[bold red]Failed to load scenario '{scenario_name}'.[/bold red]")
            except Exception as e:
                print(f"[red]Error creating tables: {e}[/red]")
                
    # Save current data as scenario
    elif n == 4:
        # Check if csvs directory exists (indicating data has been generated)
        generator_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generator", "csvs")
        if not os.path.exists(generator_dir) or not os.listdir(generator_dir):
            print("[red]No generated data found. Please generate data first using option 2.[/red]")
        else:
            save_scenario_from_generator()