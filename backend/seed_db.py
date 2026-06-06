import os
import sqlite3
from database import DB_PATH, init_db, create_worker, create_job, create_contract

def seed():
    print(f"Seeding database at {DB_PATH}...")
    
    # 1. Clear existing database to start fresh
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("Removed existing database.")
    
    # 2. Re-initialize tables
    init_db()
    
    # 3. Create Experienced Workers (High Trust Score, High Earnings)
    print("Creating experienced workers...")
    create_worker(
        name="Ramesh Singh",
        skill="Mason",
        location="Hyderabad",
        phone="9999999991",
        experience="10 years",
        trust_score=98,
        earnings=85000.0,
    )
    create_worker(
        name="Abdul Khan",
        skill="Plumber",
        location="Hyderabad",
        phone="9999999992",
        experience="8 years",
        trust_score=92,
        earnings=64000.0,
    )
    create_worker(
        name="Suresh Kumar",
        skill="Electrician",
        location="Hyderabad",
        phone="9999999993",
        experience="5 years",
        trust_score=88,
        earnings=42000.0,
    )
    
    # 4. Create "Bad" Workers (Low Trust Score)
    print("Creating low-trust workers...")
    create_worker(
        name="Vikas Reddy",
        skill="Mason",
        location="Hyderabad",
        phone="9999999994",
        experience="2 years",
        trust_score=45,
        earnings=5000.0,
    )
    
    # 5. Create Active Open Jobs (Waiting for ThekedaarAgent to match)
    print("Creating open jobs...")
    create_job(
        contractor_name="Sharma Constructions",
        contractor_phone="8888888881",
        title="High-Rise Brick Laying",
        skill_needed="Mason",
        location="Hyderabad",
        wage_per_day=950.0,
        workers_needed=2,
        duration_days=15,
    )
    create_job(
        contractor_name="Metro Rail Project",
        contractor_phone="8888888882",
        title="Pillar Wiring",
        skill_needed="Electrician",
        location="Hyderabad",
        wage_per_day=1100.0,
        workers_needed=1,
        duration_days=5,
    )
    create_job(
        contractor_name="L&T Residential",
        contractor_phone="8888888883",
        title="Bathroom Fitting",
        skill_needed="Plumber",
        location="Hyderabad",
        wage_per_day=800.0,
        workers_needed=3,
        duration_days=20,
    )
    
    print("Seeding complete! Database is primed with real historical data.")

if __name__ == "__main__":
    seed()
