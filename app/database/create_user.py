import psycopg2
from psycopg2 import sql
import os
from rich import print

def create_user(data):
    """
    Create a database user and grant necessary permissions
    data is [host, database, username, password]
    """
    curr_host = data[0]
    new_database = data[1]
    new_user = data[2]
    new_pass = data[3]
    
    # Get superuser credentials from environment
    super_user = os.getenv("PG_SUPERUSER", "postgres")
    super_pass = os.getenv("PGPASSWORD")
    port = os.getenv("PG_PORT", "5432")
    
    if not super_pass:
        print("[red]ERROR: PGPASSWORD environment variable not set.[/red]")
        return
    
    print(f"[yellow]Creating/updating user {new_user} and granting permissions...[/yellow]")
    
    # Connection for user creation (connect as superuser to postgres database)
    try:
        # First connect to postgres database to create/update user
        connection_postgres = psycopg2.connect(
            dbname="postgres",  
            user=super_user,  
            password=super_pass,  
            host=curr_host,
            port=port
        )
        connection_postgres.autocommit = True
        cursor_postgres = connection_postgres.cursor()

        # Check if user already exists
        cursor_postgres.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", [new_user])
        user_exists = cursor_postgres.fetchone()
        
        if not user_exists:
            print(f"[yellow]Creating user {new_user}...[/yellow]")
            # Create the new user
            create_user_query = sql.SQL("CREATE USER {} WITH PASSWORD %s").format(sql.Identifier(new_user))
            cursor_postgres.execute(create_user_query, [new_pass])
            print(f"[green]User {new_user} created successfully[/green]")
        else:
            print(f"[yellow]User {new_user} already exists, updating password...[/yellow]")
            # Update password
            alter_pass_query = sql.SQL("ALTER USER {} WITH PASSWORD %s").format(sql.Identifier(new_user))
            cursor_postgres.execute(alter_pass_query, [new_pass])
            print(f"[green]Password updated for {new_user}[/green]")

        # Grant createdb privilege to the user
        alter_role_query = sql.SQL("ALTER ROLE {} CREATEDB").format(sql.Identifier(new_user))
        cursor_postgres.execute(alter_role_query)
        print(f"[green]CREATEDB privilege granted to {new_user}[/green]")
        
        # Grant connection privileges to the database
        cursor_postgres.execute(
            sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                sql.Identifier(new_database),
                sql.Identifier(new_user)
            )
        )
        print(f"[green]Connection privileges to {new_database} granted to {new_user}[/green]")
        
        # Close connection to postgres database
        cursor_postgres.close()
        connection_postgres.close()
        
        # Now connect to the specific database to grant table privileges
        connection = psycopg2.connect(
            dbname=new_database,  
            user=super_user,  
            password=super_pass,  
            host=curr_host,
            port=port
        )
        connection.autocommit = True
        cursor = connection.cursor()
        
        # Grant schema usage
        cursor.execute(
            sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print("[green]Schema usage privileges granted[/green]")
        
        # Grant privileges on all tables
        cursor.execute(
            sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print("[green]Table privileges granted[/green]")
        
        # Grant privileges on all sequences
        cursor.execute(
            sql.SQL("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print("[green]Sequence privileges granted[/green]")
        
        # Set default privileges for future tables
        cursor.execute(
            sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print("[green]Default privileges set for future tables[/green]")
        
        # Set default privileges for future sequences
        cursor.execute(
            sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print("[green]Default privileges set for future sequences[/green]")
        
        print(f"[green]All necessary permissions have been granted to user {new_user}[/green]")
        
    except Exception as e:
        print(f"[red]Error: {e}[/red]")
    finally:
        # Close the connections
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'connection' in locals() and connection:
            connection.close()
        if 'cursor_postgres' in locals() and cursor_postgres:
            cursor_postgres.close()
        if 'connection_postgres' in locals() and connection_postgres:
            connection_postgres.close()

# Run the function to create the user and grant permissions
def main(data):
    create_user(data)

if __name__ == "__main__":
    # For manual testing
    import sys
    if len(sys.argv) < 5:
        print("Usage: python create_user.py <host> <database> <user> <password>")
        sys.exit(1)
    
    data = sys.argv[1:5]
    create_user(data)