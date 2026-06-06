"""
DAKSH Agent Orchestrator
Autonomous background agents that run continuously, observe the database, and take action.

Agents:
1. ThekedaarAgent - Matches workers to open jobs based on skill + trust score
2. ShramAgent - Monitors worker profiles for completeness
"""

import asyncio
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "daksh.db")

# ─── Agent Activity Log (in-memory for Command Center) ─────────────────────
agent_logs: List[Dict[str, Any]] = []

def log_agent(agent_name: str, action: str, details: str = ""):
    """Log an agent action for the Command Center UI."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "agent": agent_name,
        "action": action,
        "details": details,
    }
    agent_logs.append(entry)
    # Keep only last 100 logs
    if len(agent_logs) > 100:
        agent_logs.pop(0)
    print(f"[{agent_name}] {action} -- {details}")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ═══════════════════════════════════════════════════
# THEKEDAAR AGENT — The Autonomous Matchmaker
# ═══════════════════════════════════════════════════

class ThekedaarAgent:
    """
    Runs every 15 seconds.
    OBSERVE: Scans 'jobs' table for status='open'.
    THINK: For each open job, finds workers with matching skill, sorted by trust_score DESC.
    ACT: Creates a match record in 'matches' table. High-trust workers get matched first.
    """

    async def run(self):
        """Main loop — runs forever."""
        log_agent("ThekedaarAgent", "BOOT", "Agent initialized and running.")
        while True:
            try:
                self._scan_and_match()
            except Exception as e:
                log_agent("ThekedaarAgent", "ERROR", str(e))
            await asyncio.sleep(15)

    def _scan_and_match(self):
        conn = get_db()

        # 1. OBSERVE: Get all open jobs
        open_jobs = conn.execute("SELECT * FROM jobs WHERE status = 'open'").fetchall()

        if not open_jobs:
            log_agent("ThekedaarAgent", "SCAN", "No open jobs found. Sleeping...")
            conn.close()
            return

        log_agent("ThekedaarAgent", "SCAN", f"Found {len(open_jobs)} open job(s). Analyzing...")

        for job in open_jobs:
            job_id = job["id"]
            skill = job["skill_needed"]
            workers_needed = job["workers_needed"]

            # Check how many workers are already matched to this job
            already_matched = conn.execute(
                "SELECT COUNT(*) as cnt FROM matches WHERE job_id = ? AND status != 'rejected'",
                (job_id,)
            ).fetchone()["cnt"]

            remaining = workers_needed - already_matched
            if remaining <= 0:
                continue  # Job is fully matched

            # 2. THINK: Find matching workers sorted by trust_score DESC
            candidates = conn.execute(
                """SELECT * FROM workers 
                   WHERE LOWER(skill) = LOWER(?) 
                   AND id NOT IN (SELECT worker_id FROM matches WHERE job_id = ?)
                   ORDER BY trust_score DESC
                   LIMIT ?""",
                (skill, job_id, remaining)
            ).fetchall()

            if not candidates:
                log_agent("ThekedaarAgent", "THINK", f"Job '{job['title']}': No available {skill} workers found.")
                continue

            # 3. ACT: Create match records
            for worker in candidates:
                match_score = min(99, 70 + (worker["trust_score"] // 5))
                conn.execute(
                    """INSERT INTO matches (job_id, worker_id, match_score, status, created_at)
                       VALUES (?, ?, ?, 'pending', ?)""",
                    (job_id, worker["id"], match_score, datetime.now().isoformat())
                )
                log_agent(
                    "ThekedaarAgent", "MATCH",
                    f"Matched worker '{worker['name']}' (Trust: {worker['trust_score']}) -> Job '{job['title']}' (Score: {match_score}%)"
                )

        conn.commit()
        conn.close()


# ═══════════════════════════════════════════════════
# Initialize the matches table
# ═══════════════════════════════════════════════════

def init_matches_table():
    """Create the matches table if it doesn't exist."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL,
            worker_id TEXT NOT NULL,
            match_score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES jobs(id),
            FOREIGN KEY (worker_id) REFERENCES workers(id)
        )
    """)
    conn.commit()
    conn.close()
    print("[Agents] Matches table initialized.")


# ═══════════════════════════════════════════════════
# Startup function to launch all agents
# ═══════════════════════════════════════════════════

async def start_agents():
    """Initialize tables and launch all background agents."""
    init_matches_table()
    
    thekedaar = ThekedaarAgent()
    
    log_agent("Orchestrator", "STARTUP", "All agents are now running autonomously.")
    
    # Launch all agents as concurrent tasks
    await asyncio.gather(
        thekedaar.run(),
    )
