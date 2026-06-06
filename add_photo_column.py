import sqlite3

def add_columns():
    conn = sqlite3.connect('backend/daksh.db')
    try:
        conn.execute("ALTER TABLE workers ADD COLUMN photo TEXT DEFAULT ''")
        print("Added photo to workers")
    except Exception as e:
        print(f"Workers error: {e}")

    try:
        conn.execute("ALTER TABLE contractors ADD COLUMN photo TEXT DEFAULT ''")
        print("Added photo to contractors")
    except Exception as e:
        print(f"Contractors error: {e}")
    conn.close()

if __name__ == '__main__':
    add_columns()
