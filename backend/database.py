"""
DAKSH Database Module
SQLite database setup with CRUD helpers for workers, jobs, contracts, and safety reports.
"""

import sqlite3
import os
from uuid import uuid4
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "daksh.db")


def get_db() -> sqlite3.Connection:
    """Get a database connection with row_factory set to sqlite3.Row."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize database and create tables if they don't exist."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            password TEXT DEFAULT '',
            skill TEXT NOT NULL,
            location TEXT DEFAULT '',
            experience TEXT DEFAULT '',
            trust_score INTEGER DEFAULT 50,
            earnings REAL DEFAULT 0.0,
            jobs_completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            contractor_name TEXT NOT NULL,
            contractor_phone TEXT DEFAULT '',
            title TEXT NOT NULL,
            skill_needed TEXT NOT NULL,
            location TEXT NOT NULL,
            workers_needed INTEGER DEFAULT 1,
            duration_days INTEGER DEFAULT 1,
            wage_per_day REAL NOT NULL,
            status TEXT DEFAULT 'open',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contractors (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT DEFAULT '',
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            company_name TEXT DEFAULT '',
            trust_score INTEGER DEFAULT 50,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contracts (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            total_amount REAL DEFAULT 0.0,
            status TEXT DEFAULT 'pending',
            signed_at TEXT,
            completed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (worker_id) REFERENCES workers(id),
            FOREIGN KEY (job_id) REFERENCES jobs(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS job_applications (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            worker_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(job_id) REFERENCES jobs(id),
            FOREIGN KEY(worker_id) REFERENCES workers(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS safety_reports (
            id TEXT PRIMARY KEY,
            contractor_id TEXT NOT NULL,
            safety_score INTEGER NOT NULL,
            hazards TEXT NOT NULL,
            recommendations TEXT NOT NULL,
            image_url TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print(f"[Database] Initialized at {DB_PATH}")


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert a sqlite3.Row to a dictionary."""
    if row is None:
        return None
    return dict(row)


def _rows_to_list(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    """Convert a list of sqlite3.Row to a list of dicts."""
    return [dict(r) for r in rows]


# ─── Workers CRUD ────────────────────────────────────────────────────────────

def create_worker(
    name: str,
    skill: str,
    location: str = "",
    phone: str = "",
    email: str = "",
    password: str = "",
    experience: str = "",
    trust_score: int = 50,
    earnings: float = 0.0,
) -> Dict[str, Any]:
    """Create a new worker and return the created record."""
    worker_id = str(uuid4())
    conn = get_db()
    conn.execute(
        """INSERT INTO workers (id, name, email, phone, password, skill, location, experience, trust_score, earnings)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (worker_id, name, email, phone, password, skill, location, experience, trust_score, earnings),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM workers WHERE id = ?", (worker_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def get_worker(worker_id: str) -> Optional[Dict[str, Any]]:
    """Get a single worker by ID."""
    conn = get_db()
    row = conn.execute("SELECT * FROM workers WHERE id = ?", (worker_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def list_workers() -> List[Dict[str, Any]]:
    """List all workers."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM workers ORDER BY created_at DESC").fetchall()
    conn.close()
    return _rows_to_list(rows)


def find_workers_by_skill(skill: str) -> List[Dict[str, Any]]:
    """Find workers whose skill matches (case-insensitive), sorted by trust_score desc."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM workers WHERE LOWER(skill) = LOWER(?) ORDER BY trust_score DESC",
        (skill,),
    ).fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_worker(worker_id: str, **kwargs) -> Optional[Dict[str, Any]]:
    """Update worker fields. Pass field=value keyword args."""
    if not kwargs:
        return get_worker(worker_id)
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [worker_id]
    conn = get_db()
    conn.execute(f"UPDATE workers SET {sets} WHERE id = ?", vals)
    conn.commit()
    row = conn.execute("SELECT * FROM workers WHERE id = ?", (worker_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


# ─── Jobs CRUD ───────────────────────────────────────────────────────────────

def create_job(
    contractor_name: str,
    title: str,
    skill_needed: str,
    location: str,
    wage_per_day: float,
    contractor_phone: str = "",
    workers_needed: int = 1,
    duration_days: int = 1,
) -> Dict[str, Any]:
    """Create a new job posting."""
    job_id = str(uuid4())
    conn = get_db()
    conn.execute(
        """INSERT INTO jobs (id, contractor_name, contractor_phone, title, skill_needed,
           location, workers_needed, duration_days, wage_per_day)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (job_id, contractor_name, contractor_phone, title, skill_needed,
         location, workers_needed, duration_days, wage_per_day),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Get a single job by ID."""
    conn = get_db()
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def list_jobs(status: str = "open") -> List[Dict[str, Any]]:
    """List jobs, optionally filtering by status."""
    conn = get_db()
    if status:
        rows = conn.execute(
            "SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC", (status,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC").fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_job(job_id: str, **kwargs) -> Optional[Dict[str, Any]]:
    """Update job fields."""
    if not kwargs:
        return get_job(job_id)
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    vals = list(kwargs.values()) + [job_id]
    conn = get_db()
    conn.execute(f"UPDATE jobs SET {sets} WHERE id = ?", vals)
    conn.commit()
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


# ─── Contractors CRUD ────────────────────────────────────────────────────────
def create_contractor(
    name: str,
    phone: str,
    password: str,
    email: str = "",
    company_name: str = "",
) -> Dict[str, Any]:
    """Create a new contractor."""
    contractor_id = str(uuid4())
    conn = get_db()
    conn.execute(
        """INSERT INTO contractors (id, name, email, phone, password, company_name)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (contractor_id, name, email, phone, password, company_name),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM contractors WHERE id = ?", (contractor_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)

def get_contractor_by_phone(phone: str) -> Optional[Dict[str, Any]]:
    """Get a contractor by phone number."""
    conn = get_db()
    row = conn.execute("SELECT * FROM contractors WHERE phone = ?", (phone,)).fetchone()
    conn.close()
    return _row_to_dict(row)

# ─── Contracts CRUD ──────────────────────────────────────────────────────────

def create_contract(
    worker_id: str,
    job_id: str,
    total_amount: float = 0.0,
) -> Dict[str, Any]:
    """Create a new contract."""
    contract_id = str(uuid4())
    conn = get_db()
    conn.execute(
        """INSERT INTO contracts (id, worker_id, job_id, total_amount)
           VALUES (?, ?, ?, ?)""",
        (contract_id, worker_id, job_id, total_amount),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def get_contract(contract_id: str) -> Optional[Dict[str, Any]]:
    """Get a single contract by ID."""
    conn = get_db()
    row = conn.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def get_contract_full(contract_id: str) -> Optional[Dict[str, Any]]:
    """Get a contract with worker and job details joined."""
    conn = get_db()
    row = conn.execute(
        """SELECT c.*, 
                  w.name as worker_name, w.skill as worker_skill, w.phone as worker_phone,
                  j.title as job_title, j.location as job_location, j.wage_per_day,
                  j.duration_days, j.contractor_name
           FROM contracts c
           JOIN workers w ON c.worker_id = w.id
           JOIN jobs j ON c.job_id = j.id
           WHERE c.id = ?""",
        (contract_id,),
    ).fetchone()
    conn.close()
    return _row_to_dict(row)


def list_contracts() -> List[Dict[str, Any]]:
    """List all contracts."""
    conn = get_db()
    rows = conn.execute(
        """SELECT c.*, 
                  w.name as worker_name, w.skill as worker_skill,
                  j.title as job_title, j.location as job_location
           FROM contracts c
           LEFT JOIN workers w ON c.worker_id = w.id
           LEFT JOIN jobs j ON c.job_id = j.id
           ORDER BY c.created_at DESC"""
    ).fetchall()
    conn.close()
    return _rows_to_list(rows)


def sign_contract(contract_id: str) -> Optional[Dict[str, Any]]:
    """Mark a contract as signed."""
    now = datetime.utcnow().isoformat()
    conn = get_db()
    conn.execute(
        "UPDATE contracts SET status = 'signed', signed_at = ? WHERE id = ?",
        (now, contract_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def complete_contract(contract_id: str) -> Optional[Dict[str, Any]]:
    """Mark contract as completed and bump worker stats."""
    now = datetime.utcnow().isoformat()
    conn = get_db()

    # Get contract to find worker_id
    contract = conn.execute(
        "SELECT * FROM contracts WHERE id = ?", (contract_id,)
    ).fetchone()
    if contract is None:
        conn.close()
        return None

    # Update contract
    conn.execute(
        "UPDATE contracts SET status = 'completed', completed_at = ? WHERE id = ?",
        (now, contract_id),
    )

    # Increment worker's jobs_completed and bump rating slightly
    worker_id = contract["worker_id"]
    conn.execute(
        """UPDATE workers 
           SET jobs_completed = jobs_completed + 1,
               earnings = earnings + ?,
               trust_score = MIN(100, trust_score + 2)
           WHERE id = ?""",
        (contract["total_amount"], worker_id,),
    )

    conn.commit()
    row = conn.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


# ─── Safety Reports CRUD ─────────────────────────────────────────────────────

def create_safety_report(
    contractor_id: str,
    safety_score: int,
    hazards: str,
    recommendations: str,
    image_url: str = ""
) -> Dict[str, Any]:
    """Create a new safety report."""
    report_id = str(uuid4())
    conn = get_db()
    conn.execute(
        """INSERT INTO safety_reports (id, contractor_id, safety_score, hazards, recommendations, image_url)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (report_id, contractor_id, safety_score, hazards, recommendations, image_url),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM safety_reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def list_safety_reports() -> List[Dict[str, Any]]:
    """List all safety reports."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM safety_reports ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return _rows_to_list(rows)


def get_safety_report(report_id: str) -> Optional[Dict[str, Any]]:
    """Get a single safety report."""
    conn = get_db()
    row = conn.execute("SELECT * FROM safety_reports WHERE id = ?", (report_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


# ─── Worker Job History ──────────────────────────────────────────────────────

def get_worker_job_history(worker_id: str) -> List[Dict[str, Any]]:
    """Get all contracts/jobs for a specific worker."""
    conn = get_db()
    rows = conn.execute(
        """SELECT c.*, j.title as job_title, j.location as job_location,
                  j.wage_per_day, j.duration_days, j.contractor_name
           FROM contracts c
           JOIN jobs j ON c.job_id = j.id
           WHERE c.worker_id = ?
           ORDER BY c.created_at DESC""",
        (worker_id,),
    ).fetchall()
    conn.close()
    return _rows_to_list(rows)
