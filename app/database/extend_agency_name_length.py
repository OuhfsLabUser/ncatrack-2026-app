"""
Script to extend agency_name field length from VARCHAR(50) to VARCHAR(100)
to support longer agency names like "Oklahoma Department of Human Services (Oklahoma city)"
"""
import psycopg2
from .config import load_config
from rich import print

def extend_agency_name_length():
    """
    Extend agency_name field length from VARCHAR(50) to VARCHAR(100)
    """
    try:
        config = load_config()
        with psycopg2.connect(**config) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Check current column type
                cur.execute("""
                    SELECT data_type, character_maximum_length 
                    FROM information_schema.columns 
                    WHERE table_name = 'cac_agency' AND column_name = 'agency_name'
                """)
                result = cur.fetchone()
                
                if result:
                    current_type = result[0]
                    current_length = result[1]
                    print(f"[yellow]Current agency_name type: {current_type}({current_length})[/yellow]")
                    
                    if current_length and current_length < 100:
                        print("[yellow]Extending agency_name field from VARCHAR(50) to VARCHAR(100)...[/yellow]")
                        cur.execute("""
                            ALTER TABLE cac_agency 
                            ALTER COLUMN agency_name TYPE VARCHAR(100)
                        """)
                        print("[green]Successfully extended agency_name field to VARCHAR(100)[/green]")
                        return True
                    else:
                        print(f"[yellow]agency_name field is already VARCHAR({current_length}) or larger. No changes needed.[/yellow]")
                        return True
                else:
                    print("[red]Could not find agency_name column in cac_agency table.[/red]")
                    return False
                    
    except Exception as e:
        print(f"[red]Error extending agency_name field: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("[yellow]Extending agency_name field length...[/yellow]")
    if extend_agency_name_length():
        print("[green]Migration completed successfully![/green]")
    else:
        print("[red]Migration failed.[/red]")
        return False
    return True

if __name__ == "__main__":
    main()

