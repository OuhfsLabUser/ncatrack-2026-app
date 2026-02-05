import psycopg2
from psycopg2 import sql
import sys
import os
from rich import print
from .config import load_config

def execute_command(command, params=None):
    """Execute a SQL command with optional parameters"""
    try:
        config = load_config()
        with psycopg2.connect(**config) as conn:
            conn.autocommit = True  # Important for dropping/creating tables
            with conn.cursor() as cur:
                if params:
                    cur.execute(command, params)
                else:
                    cur.execute(command)
                return cur.fetchall() if cur.description else None
    except (psycopg2.DatabaseError, Exception) as error:
        print(f"[red]Error executing command: {error}")
        return None

def drop_picklist_tables():
    """Drop pick list tables if they exist"""
    print("[yellow]Dropping existing pick list tables...")
    
    drop_commands = [
        "DROP TABLE IF EXISTS pick_list_item CASCADE;",
        "DROP TABLE IF EXISTS pick_list CASCADE;",
        "DROP TABLE IF EXISTS pick_list_category CASCADE;"
    ]
    
    for command in drop_commands:
        execute_command(command)
    
    print("[green]Pick list tables dropped successfully")

def create_picklist_tables():
    """Create the pick list tables"""
    print("[yellow]Creating pick list tables...")
    
    create_commands = [
        """
        CREATE TABLE IF NOT EXISTS pick_list_category (
            category_id SERIAL PRIMARY KEY,
            category_name VARCHAR(100) NOT NULL
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS pick_list (
            list_id SERIAL PRIMARY KEY,
            category_id INTEGER NOT NULL,
            list_name VARCHAR(100) NOT NULL,
            FOREIGN KEY (category_id) REFERENCES pick_list_category (category_id)
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS pick_list_item (
            item_id SERIAL PRIMARY KEY,
            list_id INTEGER NOT NULL,
            value VARCHAR(255) NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (list_id) REFERENCES pick_list (list_id)
        );
        """
    ]
    
    for command in create_commands:
        execute_command(command)
    
    print("[green]Pick list tables created successfully")

def get_or_create_category(category_name):
    """Get or create a pick list category and return its ID"""
    # Try to find existing category
    query = "SELECT category_id FROM pick_list_category WHERE category_name = %s"
    result = execute_command(query, (category_name,))
    
    if result and result[0]:
        category_id = result[0][0]
        print(f"[yellow]Found existing category '{category_name}' with ID {category_id}")
        return category_id
    
    # Create new category
    query = "INSERT INTO pick_list_category (category_name) VALUES (%s) RETURNING category_id"
    result = execute_command(query, (category_name,))
    
    if result and result[0]:
        category_id = result[0][0]
        print(f"[green]Created new category '{category_name}' with ID {category_id}")
        return category_id
    
    print(f"[red]Failed to create category '{category_name}'")
    return None

def get_or_create_picklist(category_id, list_name):
    """Get or create a pick list and return its ID"""
    # Try to find existing pick list
    query = "SELECT list_id FROM pick_list WHERE category_id = %s AND list_name = %s"
    result = execute_command(query, (category_id, list_name))
    
    if result and result[0]:
        list_id = result[0][0]
        print(f"[yellow]Found existing pick list '{list_name}' with ID {list_id}")
        return list_id
    
    # Create new pick list
    query = "INSERT INTO pick_list (category_id, list_name) VALUES (%s, %s) RETURNING list_id"
    result = execute_command(query, (category_id, list_name))
    
    if result and result[0]:
        list_id = result[0][0]
        print(f"[green]Created new pick list '{list_name}' with ID {list_id}")
        return list_id
    
    print(f"[red]Failed to create pick list '{list_name}'")
    return None

def add_picklist_items(list_id, items):
    """Add items to a pick list"""
    # Get existing items
    query = "SELECT value FROM pick_list_item WHERE list_id = %s"
    result = execute_command(query, (list_id,))
    existing_values = [row[0] for row in result] if result else []
    
    # Add new items
    added_count = 0
    for i, item in enumerate(items):
        if item not in existing_values:
            query = """
            INSERT INTO pick_list_item (list_id, value, display_order) 
            VALUES (%s, %s, %s)
            """
            execute_command(query, (list_id, item, i))
            added_count += 1
    
    if added_count > 0:
        print(f"[green]Added {added_count} new items to pick list ID {list_id}")
    else:
        print(f"[yellow]No new items added to pick list ID {list_id}")

def populate_picklists():
    """Populate the database with pick lists"""
    print("[yellow]Populating pick lists...")
    
    # People Tab pick lists
    people_category_id = get_or_create_category("People Tab")
    
    # Race pick list
    race_list_id = get_or_create_picklist(people_category_id, "Race")
    race_items = [
        'American Indian/Alaska Native',
        'Asian',
        'Black/African American',
        'Hispanic/Latino',
        'Native Hawaiian/Pacific Islander',
        'White',
        'Multiple races',
        'Other',
        'Unknown'
    ]
    add_picklist_items(race_list_id, race_items)
    
    # Religion pick list
    religion_list_id = get_or_create_picklist(people_category_id, "Religion")
    religion_items = [
        'Agnostic', 
        'Atheist', 
        'Buddhist', 
        'Christian', 
        'Hindu', 
        'Jewish', 
        'Muslim', 
        'Other', 
        'Unknown'
    ]
    add_picklist_items(religion_list_id, religion_items)
    
    # Language pick list
    language_list_id = get_or_create_picklist(people_category_id, "Language")
    language_items = [
        'English', 
        'Spanish', 
        'French', 
        'Chinese', 
        'Arabic', 
        'Other', 
        'Unknown'
    ]
    add_picklist_items(language_list_id, language_items)
    
    # Education Level pick list
    education_list_id = get_or_create_picklist(people_category_id, "Education Level")
    education_items = [
        'Pre-School', 
        'Elementary', 
        'Middle School', 
        'High School', 
        'Some College', 
        'Associate Degree', 
        'Bachelor\'s Degree', 
        'Graduate Degree'
    ]
    add_picklist_items(education_list_id, education_items)
    
    # Marital Status pick list
    marital_list_id = get_or_create_picklist(people_category_id, "Marital Status")
    marital_items = [
        'Single', 
        'Married', 
        'Separated', 
        'Divorced', 
        'Widowed', 
        'Unknown'
    ]
    add_picklist_items(marital_list_id, marital_items)
    
    # General Tab pick lists
    general_category_id = get_or_create_category("General Tab")
    
    # Case Status pick list
    case_status_list_id = get_or_create_picklist(general_category_id, "Case Status")
    case_status_items = ['Open', 'Pending', 'Closed', 'Archived']
    add_picklist_items(case_status_list_id, case_status_items)
    
    # Mental Health Tab pick lists
    mh_category_id = get_or_create_category("Mental Health Tab")
    
    # MH Treatment Models pick list
    mh_models_list_id = get_or_create_picklist(mh_category_id, "MH Treatment Models")
    mh_models_items = ['TF-CBT', 'EMDR', 'Play Therapy', 'ARC']
    add_picklist_items(mh_models_list_id, mh_models_items)
    
    print("[green]Pick lists populated successfully!")

def main():
    """Main function to run the pick list population process"""
    # First drop existing tables
    drop_picklist_tables()
    
    # Then create new tables
    create_picklist_tables()
    
    # Finally populate with data
    populate_picklists()
    
    print("[green]Pick list setup completed successfully!")

if __name__ == "__main__":
    main()