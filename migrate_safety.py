import sqlite3
import os
import sys

# Add backend directory to Python path so we can import database
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from backend.database import get_db, init_db

def migrate():
    try:
        conn = get_db()
        conn.execute("DROP TABLE IF EXISTS safety_reports")
        conn.commit()
        conn.close()
        
        init_db()
        print("Safety reports table migration complete.")
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
