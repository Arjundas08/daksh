import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "daksh.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE workers ADD COLUMN email TEXT DEFAULT ''")
        print("Added email column.")
    except Exception as e:
        print(f"Email column error: {e}")
        
    try:
        cursor.execute("ALTER TABLE workers ADD COLUMN password TEXT DEFAULT ''")
        print("Added password column.")
    except Exception as e:
        print(f"Password column error: {e}")
        
    # Update seeded users with default password 123456
    cursor.execute("UPDATE workers SET password = '123456' WHERE password = '' OR password IS NULL")
    print(f"Updated {cursor.rowcount} users with default password.")
    
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
