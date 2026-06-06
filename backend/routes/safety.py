import os
import json
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv

import database as db

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

router = APIRouter(prefix="/api/safety", tags=["Safety"])

@router.post("/analyze", status_code=201)
async def analyze_safety(
    image: UploadFile = File(...),
    contractor_id: str = Form(...)
):
    """
    Analyze an uploaded image for safety compliance using Gemini Vision.
    """
    # 1. Read image data
    image_bytes = await image.read()
    
    # Optional: Save image locally if we want a URL, for now just store an empty URL or generate a mock one
    # If we wanted to store it, we'd write it to a /uploads folder.
    image_filename = f"{uuid.uuid4()}_{image.filename}"
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    image_path = os.path.join(upload_dir, image_filename)
    
    with open(image_path, "wb") as f:
        f.write(image_bytes)
        
    image_url = f"/uploads/{image_filename}" # We would need to mount this dir in main.py to serve statically

    # 2. Call Gemini
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        prompt = """
        You are an OSHA-certified construction safety inspector. Analyze the provided image of a construction site or workers.
        Identify missing PPE (helmets, vests, boots), scaffolding risks, and environmental hazards.
        
        Return a strict JSON object containing ONLY:
        {
            "safety_score": <integer from 0 to 100, 100 being perfectly safe>,
            "hazards": ["list", "of", "hazards", "found"],
            "recommendations": ["list", "of", "actionable", "recommendations"]
        }
        """
        
        # Prepare the image part for Gemini
        image_part = {
            "mime_type": image.content_type,
            "data": image_bytes
        }
        
        response = model.generate_content([prompt, image_part])
        text = response.text.strip()
        
        # Clean markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
            
        analysis = json.loads(text)
        
    except Exception as e:
        print("Gemini Analysis Error:", e)
        raise HTTPException(
            status_code=422,
            detail=f"Failed to analyze image with AI: {str(e)}"
        )

    # 3. Save to DB
    try:
        hazards_str = json.dumps(analysis.get("hazards", []))
        recommendations_str = json.dumps(analysis.get("recommendations", []))
        
        report = db.create_safety_report(
            contractor_id=contractor_id,
            safety_score=analysis.get("safety_score", 50),
            hazards=hazards_str,
            recommendations=recommendations_str,
            image_url=image_url
        )
        
        # Also return the parsed JSON lists to the frontend
        report["hazards_list"] = analysis.get("hazards", [])
        report["recommendations_list"] = analysis.get("recommendations", [])
        
        return {"success": True, "report": report}
        
    except Exception as e:
        print("DB Save Error:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save report: {str(e)}"
        )

@router.get("/reports/{contractor_id}")
async def get_reports(contractor_id: str):
    """Get all safety reports for a contractor."""
    conn = db.get_db()
    rows = conn.execute("SELECT * FROM safety_reports WHERE contractor_id = ? ORDER BY created_at DESC", (contractor_id,)).fetchall()
    conn.close()
    
    reports = []
    for r in rows:
        r_dict = dict(r)
        r_dict["hazards_list"] = json.loads(r_dict["hazards"])
        r_dict["recommendations_list"] = json.loads(r_dict["recommendations"])
        reports.append(r_dict)
        
    return {"success": True, "reports": reports}
