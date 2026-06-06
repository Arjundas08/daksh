import sqlite3
import os
import sys

# Add backend directory to Python path so we can import database
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from backend.database import init_db

def migrate():
    try:
        init_db()
        print("Contractors table migration complete (init_db ran).")
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
