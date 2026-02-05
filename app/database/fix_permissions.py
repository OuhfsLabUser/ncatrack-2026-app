import psycopg2
import sys
import os

def fix_permissions():
    """
    Fix permissions for the PostgreSQL superuser to properly access the database
    through Prisma by granting the necessary permissions on the public schema.
    """
    try:
        # Get database connection info from environment or use defaults
        host = os.environ.get("PG_HOST", "localhost")
        port = os.environ.get("PG_PORT", "5432")
        database = os.environ.get("PG_DATABASE", "ncatrak")
        user = os.environ.get("PG_SUPERUSER", "postgres")
        password = os.environ.get("PGPASSWORD", "")

        # Connect to the database
        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=database,
            user=user,
            password=password
        )
        conn.autocommit = True
        cursor = conn.cursor()

        print(f"Connected to database {database} as {user}")
        
        # Grant privileges on schema
        cursor.execute("GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;")
        print("Granted ALL PRIVILEGES ON SCHEMA public TO postgres")
        
        # Grant privileges on all tables
        cursor.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;")
        print("Granted ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres")
        
        # Grant privileges on all sequences
        cursor.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;")
        print("Granted ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres")
        
        # Set default privileges for future tables and sequences
        cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO postgres;")
        print("Altered DEFAULT PRIVILEGES for future tables")
        
        cursor.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO postgres;")
        print("Altered DEFAULT PRIVILEGES for future sequences")
        
        # Make postgres the owner of the public schema
        cursor.execute("ALTER SCHEMA public OWNER TO postgres;")
        print("Changed OWNER of public schema to postgres")

        cursor.close()
        conn.close()
        
        print("Database permissions have been fixed successfully!")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    fix_permissions()