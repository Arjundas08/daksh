"""
Contracts Router for DAKSH
Handles contract creation, signing, completion, and listing.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import database as db

router = APIRouter(prefix="/api/contracts", tags=["Contracts"])


# ─── Request Models ──────────────────────────────────────────────────────────

class ContractCreateRequest(BaseModel):
    worker_id: str
    job_id: str


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_contract(req: ContractCreateRequest):
    """Create a contract between a worker and a job. Auto-calculates total_amount."""
    # Validate worker exists
    worker = db.get_worker(req.worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Validate job exists
    job = db.get_job(req.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Auto-calculate total amount
    total_amount = job["wage_per_day"] * job["duration_days"]

    contract = db.create_contract(
        worker_id=req.worker_id,
        job_id=req.job_id,
        total_amount=total_amount,
    )
    return {
        "success": True,
        "contract": contract,
        "calculated_total": total_amount,
    }


@router.get("")
async def list_contracts():
    """List all contracts with worker and job details."""
    contracts = db.list_contracts()
    return {"success": True, "count": len(contracts), "contracts": contracts}


@router.get("/{contract_id}")
async def get_contract(contract_id: str):
    """Get a single contract with full worker and job details."""
    contract = db.get_contract_full(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"success": True, "contract": contract}


@router.put("/{contract_id}/sign")
async def sign_contract(contract_id: str):
    """Mark a contract as signed and record the timestamp."""
    existing = db.get_contract(contract_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contract not found")

    if existing["status"] == "signed":
        raise HTTPException(status_code=400, detail="Contract is already signed")

    if existing["status"] == "completed":
        raise HTTPException(status_code=400, detail="Contract is already completed")

    contract = db.sign_contract(contract_id)
    return {"success": True, "message": "Contract signed", "contract": contract}


@router.put("/{contract_id}/complete")
async def complete_contract(contract_id: str):
    """
    Mark a contract as completed.
    Increments worker's jobs_completed count and bumps rating.
    """
    existing = db.get_contract(contract_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contract not found")

    if existing["status"] == "completed":
        raise HTTPException(status_code=400, detail="Contract is already completed")

    contract = db.complete_contract(contract_id)
    return {"success": True, "message": "Contract completed", "contract": contract}
