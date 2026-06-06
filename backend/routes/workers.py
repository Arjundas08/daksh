"""
Workers Router for DAKSH
Handles worker registration (text + voice), listing, and profiles.
"""

import os
import json
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

import database as db
from services.bhashini import speech_to_text

router = APIRouter(prefix="/api/workers", tags=["Workers"])

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


# ─── Request Models ──────────────────────────────────────────────────────────

class WorkerRegisterRequest(BaseModel):
    name: str
    email: str = ""
    password: str = ""
    skill: str
    location: str = ""
    phone: str = ""
    experience: str = ""
    photo: str = ""

class LoginRequest(BaseModel):
    phone: str
    password: str

class CheckPhoneRequest(BaseModel):
    phone: str


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/check-phone")
async def check_phone(req: CheckPhoneRequest):
    """Safely check if a worker phone exists in DB."""
    conn = db.get_db()
    row = conn.execute("SELECT 1 FROM workers WHERE phone = ?", (req.phone,)).fetchone()
    conn.close()
    if row:
        return {"status": "existing"}
    return {"status": "new"}

@router.post("/login")
async def login_worker(req: LoginRequest):
    """Check if worker exists by phone and verify password."""
    conn = db.get_db()
    row = conn.execute("SELECT * FROM workers WHERE phone = ?", (req.phone,)).fetchone()
    conn.close()
    
    if row:
        worker = dict(row)
        if worker.get("password") == req.password:
            return {"status": "existing", "worker": worker}
        else:
            raise HTTPException(status_code=401, detail="Invalid password")
    return {"status": "new"}

@router.post("/register", status_code=201)
async def register_worker(req: WorkerRegisterRequest):
    """Register a new worker with text-based input."""
    worker = db.create_worker(
        name=req.name,
        email=req.email,
        password=req.password,
        skill=req.skill,
        location=req.location,
        phone=req.phone,
        experience=req.experience,
        photo=req.photo,
    )
    return {"success": True, "worker": worker}


@router.get("")
async def list_workers():
    """List all registered workers."""
    workers = db.list_workers()
    return {"success": True, "count": len(workers), "workers": workers}


@router.get("/{worker_id}")
async def get_worker(worker_id: str):
    """Get a single worker profile with job history."""
    worker = db.get_worker(worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    job_history = db.get_worker_job_history(worker_id)
    return {
        "success": True,
        "worker": worker,
        "job_history": job_history,
    }


@router.post("/voice-register", status_code=201)
async def voice_register(
    audio: UploadFile = File(...),
    language: str = Form("hi"),
    phone: str = Form(None),
    email: str = Form(None),
    password: str = Form(None),
    photo: str = Form(None),
):
    """
    Register a worker via voice input.
    1. Transcribes audio using Bhashini ASR.
    2. Extracts structured data using Gemini.
    3. Saves worker to DB.
    """
    audio_bytes = await audio.read()

    # Step 1: Transcribe audio
    transcribed_text, detected_lang = speech_to_text(audio_bytes, language)
    if not transcribed_text or transcribed_text.startswith("ASR error"):
        raise HTTPException(status_code=422, detail=f"Transcription failed: {transcribed_text}")

    # Step 2: Extract structured data using Gemini
    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = f"""Extract worker registration details from this speech transcript.
Transcript: \"{transcribed_text}\"

Extract and return ONLY this JSON:
{{
    "name": "worker's name",
    "skill": "one of: Mason, Carpenter, Helper, Electrician, Plumber, Painter, Supervisor, Welder, Fitter",
    "location": "location mentioned",
    "experience": "years of experience mentioned, e.g. '5 years'",
    "phone": "phone number if mentioned, else empty string"
}}

If any field is not mentioned, make a reasonable guess or leave empty."""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        extracted = json.loads(text)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to extract info from transcript: {str(e)}. Transcript was: {transcribed_text}",
        )

    # Override extracted phone with verified phone if provided
    final_phone = phone if phone else extracted.get("phone", "")

    # Step 3: Save worker to DB
    worker = db.create_worker(
        name=extracted.get("name", "Unknown"),
        email=email or "",
        password=password or "",
        skill=extracted.get("skill", "Helper"),
        location=extracted.get("location", ""),
        phone=final_phone,
        experience=extracted.get("experience", "0"),
        photo=photo or "",
    )

    return {
        "success": True,
        "transcribed_text": transcribed_text,
        "detected_language": detected_lang,
        "extracted_info": extracted,
        "worker": worker,
    }
