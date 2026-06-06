"""
Jobs Router for DAKSH
Handles job postings, listing, matching workers, and wage suggestions.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

import database as db

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

# Suggested wage mapping per skill (INR per day)
WAGE_MAP = {
    "Mason": 950,
    "Carpenter": 880,
    "Helper": 600,
    "Electrician": 1000,
    "Plumber": 900,
    "Painter": 800,
    "Supervisor": 1200,
    "Welder": 1100,
    "Fitter": 950,
}


# ─── Request Models ──────────────────────────────────────────────────────────

class JobCreateRequest(BaseModel):
    contractor_name: str
    contractor_phone: str = ""
    title: str
    skill_needed: str
    location: str
    workers_needed: int = 1
    duration_days: int = 1
    wage_per_day: float

class JobApplyRequest(BaseModel):
    worker_id: str


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_job(req: JobCreateRequest):
    """Create a new job posting."""
    job = db.create_job(
        contractor_name=req.contractor_name,
        contractor_phone=req.contractor_phone,
        title=req.title,
        skill_needed=req.skill_needed,
        location=req.location,
        workers_needed=req.workers_needed,
        duration_days=req.duration_days,
        wage_per_day=req.wage_per_day,
    )
    return {"success": True, "job": job}


@router.get("/suggest-wage")
async def suggest_wage(skill: str = Query(..., description="Skill to get wage suggestion for")):
    """Get suggested daily wage for a skill."""
    # Case-insensitive lookup
    wage = None
    for k, v in WAGE_MAP.items():
        if k.lower() == skill.lower():
            wage = v
            break

    if wage is None:
        return {
            "success": True,
            "skill": skill,
            "suggested_wage": 700,
            "note": "Default wage — skill not found in standard mapping",
        }

    return {"success": True, "skill": skill, "suggested_wage": wage}


@router.get("")
async def list_jobs(status: Optional[str] = Query(None)):
    """List jobs. Optionally filter by status (open, closed, etc)."""
    jobs = db.list_jobs(status=status or "open")
    return {"success": True, "count": len(jobs), "jobs": jobs}


@router.get("/{job_id}")
async def get_job(job_id: str):
    """Get a single job by ID."""
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"success": True, "job": job}


@router.get("/{job_id}/matches")
async def find_matching_workers(job_id: str):
    """Find workers whose skill matches this job's skill_needed, sorted by rating desc."""
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    matched_workers = db.find_workers_by_skill(job["skill_needed"])
    return {
        "success": True,
        "job_id": job_id,
        "skill_needed": job["skill_needed"],
        "matches_count": len(matched_workers),
        "workers": matched_workers,
    }


@router.post("/{job_id}/apply")
async def apply_for_job(job_id: str, req: JobApplyRequest):
    """Worker applies for a job."""
    import uuid
    conn = db.get_db()
    
    # Check if already applied
    existing = conn.execute(
        "SELECT id FROM job_applications WHERE job_id = ? AND worker_id = ?",
        (job_id, req.worker_id)
    ).fetchone()
    
    if existing:
        conn.close()
        return {"success": True, "message": "Already applied"}
        
    app_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO job_applications (id, job_id, worker_id, status) VALUES (?, ?, ?, 'accepted')",
        (app_id, job_id, req.worker_id)
    )
    conn.commit()
    conn.close()
    
    return {"success": True, "application_id": app_id}

@router.get("/worker/{worker_id}/applications")
async def get_worker_applications(worker_id: str):
    """Get all jobs a worker has applied for/accepted."""
    conn = db.get_db()
    rows = conn.execute(
        """SELECT j.*, a.status as application_status, a.applied_at 
           FROM job_applications a
           JOIN jobs j ON a.job_id = j.id
           WHERE a.worker_id = ?
           ORDER BY a.applied_at DESC""",
        (worker_id,)
    ).fetchall()
    conn.close()
    
    return {"success": True, "applications": [dict(r) for r in rows]}
