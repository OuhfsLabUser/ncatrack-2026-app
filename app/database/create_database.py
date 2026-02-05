import sys
import os
import psycopg2
from psycopg2 import sql, OperationalError, errors
from rich import print

def create(data):
    """
    data is [ host, database, user, password ]
    Expects superuser password in PGPASSWORD env var.
    """

    host, new_db, new_user, new_pass = data

    # Superuser creds (pg should pick up PGPASSWORD)
    superuser = "postgres"
    superpass = new_pass

    port = os.getenv("PG_PORT", "5432")  # Default to 5432 if not specified

    # Phase 1: CREATE DATABASE if it doesn't exist - must be done outside a transaction block
    try:
        # First connect with autocommit=True
        conn_params = {
            "host": host,
            "port": port,
            "dbname": "postgres",
            "user": superuser,
            "password": superpass
        }
        
        conn = psycopg2.connect(**conn_params)
        conn.autocommit = True  # THIS IS CRITICAL for CREATE DATABASE
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (new_db,)
        )
        if cur.fetchone():
            print(f"[yellow]• Database '{new_db}' already exists, skipping creation.[/yellow]")
        else:
            try:
                # Create the database
                cur.execute(
                    sql.SQL("CREATE DATABASE {}").format(
                        sql.Identifier(new_db)
                    )
                )
                print(f"[green]✔ Created database '{new_db}'[/green]")
            except Exception as e:
                print(f"[red]ERROR creating database: {e}[/red]")
                sys.exit(1)

        # Check if user already exists
        cur.execute(
            "SELECT 1 FROM pg_roles WHERE rolname = %s",
            (new_user,)
        )
        if cur.fetchone():
            print(f"[yellow]• User '{new_user}' already exists, updating password.[/yellow]")
            # Update password for existing user
            cur.execute(
                sql.SQL("ALTER USER {} WITH PASSWORD %s").format(
                    sql.Identifier(new_user)
                ),
                (new_pass,)
            )
        else:
            # Create new user with password
            cur.execute(
                sql.SQL("CREATE USER {} WITH PASSWORD %s").format(
                    sql.Identifier(new_user)
                ),
                (new_pass,)
            )
            print(f"[green]✔ Created user '{new_user}'[/green]")

        # Grant createdb privilege to the user
        cur.execute(
            sql.SQL("ALTER ROLE {} CREATEDB").format(
                sql.Identifier(new_user)
            )
        )
        print(f"[green]✔ Granted CREATEDB privilege to {new_user}[/green]")

        # Grant privileges on database
        cur.execute(
            sql.SQL("GRANT ALL PRIVILEGES ON DATABASE {} TO {}").format(
                sql.Identifier(new_db),
                sql.Identifier(new_user)
            )
        )
        print(f"[green]✔ Granted database privileges to {new_user}[/green]")
        
        # Close this connection
        cur.close()
        conn.close()

    except OperationalError as e:
        print(f"[red]ERROR: could not connect as superuser: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        print(f"[red]ERROR during database setup: {e}[/red]")
        sys.exit(1)

    # Phase 2: Connect to the new database and set up privileges
    try:
        conn_params = {
            "host": host,
            "port": port,
            "dbname": new_db,
            "user": superuser,
            "password": superpass
        }
        
        conn = psycopg2.connect(**conn_params)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Grant schema usage
        cur.execute(
            sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print(f"[green]✔ Granted schema usage to {new_user}[/green]")
        
        # Grant privileges on all tables
        cur.execute(
            sql.SQL("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print(f"[green]✔ Granted table privileges to {new_user}[/green]")
        
        # Grant privileges on all sequences
        cur.execute(
            sql.SQL("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print(f"[green]✔ Granted sequence privileges to {new_user}[/green]")
        
        # Set default privileges for future tables
        cur.execute(
            sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print(f"[green]✔ Set default privileges for future tables for {new_user}[/green]")
        
        # Set default privileges for future sequences
        cur.execute(
            sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {}").format(
                sql.Identifier(new_user)
            )
        )
        print(f"[green]✔ Set default privileges for future sequences for {new_user}[/green]")

        # Basic schema setup (example table)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS example (
                id   SERIAL PRIMARY KEY,
                name TEXT NOT NULL
            );
        """)
        print(f"[green]✔ Schema initialized in '{new_db}'[/green]")
        
        # Close this connection
        cur.close()
        conn.close()
                
    except OperationalError as e:
        print(f"[red]ERROR: could not connect to '{new_db}' as superuser: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        print(f"[red]ERROR during schema setup: {e}[/red]")
        sys.exit(1)

    # Phase 3: Test connection as the new user
    try:
        conn_params = {
            "host": host,
            "port": port,
            "dbname": new_db,
            "user": new_user,
            "password": new_pass
        }
        
        conn = psycopg2.connect(**conn_params)
        conn.close()
        print(f"[green]✔ Successfully tested connection as '{new_user}'[/green]")
    except Exception as e:
        print(f"[red]WARNING: Could not connect as '{new_user}': {e}[/red]")
        print("[yellow]You may need to adjust pg_hba.conf settings or restart PostgreSQL.[/yellow]")

def main(data):
    create(data)

if __name__ == "__main__":
    # For manual testing
    if len(sys.argv) < 5:
        print("Usage: python create_database.py <host> <database> <user> <password>")
        sys.exit(1)
    
    data = sys.argv[1:5]
    create(data)