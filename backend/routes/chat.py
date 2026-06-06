import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv
from database import get_db

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

router = APIRouter(prefix="/api/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    message: str
    role: str = "worker"
    skill: str = "Helper"
    worker_id: Optional[str] = None
    earnings: float = 0
    jobs_completed: int = 0
    trust_score: int = 50
    active_jobs: int = 0

@router.post("/ustaad")
async def chat_with_ustaad(req: ChatRequest):
    """
    Ustaad AI: A friendly master tradesman chatbot.
    Knows real financial data of the worker to give accurate advice.
    Replies in easy-to-understand Hinglish.
    """
    model = genai.GenerativeModel("gemini-2.0-flash")

    # Build real financial context
    financial_context = f"""
--- WORKER KA REAL DATA (Yeh sab REAL hai, isko use karo advice dene ke liye) ---
Name/ID: {req.worker_id or 'Unknown'}
Skill: {req.skill}
Role: {req.role}
Total Earnings (so far): ₹{req.earnings}
Jobs Completed: {req.jobs_completed}
Trust Score: {req.trust_score}/100
Currently Active Jobs: {req.active_jobs}
Monthly Target: ₹25,000
Remaining to hit target: ₹{max(0, 25000 - req.earnings)}
---
"""

    system_prompt = f"""You are 'Ustaad AI', a highly experienced, friendly, and wise master tradesman AND financial advisor in India.
Your job is to mentor a {req.skill} ({req.role}).
They will ask you questions about their work, skills, finances, or how to get more jobs.

{financial_context}

Rules:
1. ALWAYS reply in easy-to-understand 'Hinglish' (Hindi written in English alphabet, e.g., 'Arre bhai, cement mix karte waqt...').
2. Keep your answers short, practical, and very encouraging. Maximum 4-5 sentences.
3. Act like a mentor/elder brother (Ustaad). Start with a friendly greeting like 'Bhai', 'Chote', or 'Dost'.
4. Do not use complex English words. Keep it relatable to a blue-collar worker in India.
5. When they ask about money, earnings, targets, savings — USE THE REAL DATA above to give specific, personalized advice.
   For example: "Bhai, tune abhi ₹8000 kamaye hain. Target ₹25000 hai. Bas 21 din aur kaam kar ₹800/day pe, target hit ho jayega!"
6. You are also a FINANCIAL AGENT (Munshi). If they ask about budgeting, saving, or financial planning, give practical tips based on their real earnings.
7. If their trust score is high (>80), mention they are eligible for micro-loans and equipment upgrades.
"""

    try:
        chat = model.start_chat(history=[
            {"role": "user", "parts": [system_prompt]}
        ])
        response = chat.send_message(req.message)
        return {"success": True, "reply": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
