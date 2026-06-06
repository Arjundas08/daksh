import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv

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

    # Build real financial context
    financial_context = f"""
--- WORKER KA REAL DATA (Yeh sab REAL hai, isko use karo advice dene ke liye) ---
Name/ID: {req.worker_id or 'Unknown'}
Skill: {req.skill}
Role: {req.role}
Total Earnings (so far): Rs.{req.earnings}
Jobs Completed: {req.jobs_completed}
Trust Score: {req.trust_score}/100
Currently Active Jobs: {req.active_jobs}
Monthly Target: Rs.25,000
Remaining to hit target: Rs.{max(0, 25000 - req.earnings)}
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
   For example: "Bhai, tune abhi Rs.8000 kamaye hain. Target Rs.25000 hai. Bas 21 din aur kaam kar Rs.800/day pe, target hit ho jayega!"
6. You are also a FINANCIAL AGENT (Munshi). If they ask about budgeting, saving, or financial planning, give practical tips based on their real earnings.
7. If their trust score is high (>80), mention they are eligible for micro-loans and equipment upgrades.
"""

    try:
        # Use generate_content with the system prompt baked into the user message
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        full_prompt = f"""System Instructions: {system_prompt}

User Message: {req.message}"""
        
        response = model.generate_content(full_prompt)
        reply = response.text.strip()
        
        print(f"[Ustaad AI] Successfully generated reply: {reply[:80]}...")
        return {"success": True, "reply": reply}
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[Ustaad AI] ERROR: {str(e)}")
        
        # Fallback: return a hardcoded helpful response instead of crashing
        fallback_replies = {
            "hi": "Namaste Bhai! Main hoon tera Ustaad AI. Kaam, paisa, skill - kuch bhi poocho, main madad karunga! 💪",
            "hello": "Arre Bhai! Swagat hai! Bata kya help chahiye? Kaam dhundna hai ya skill seekhni hai?",
            "default": f"Bhai, tera trust score {req.trust_score} hai aur tune Rs.{req.earnings} kamaye hain. Target Rs.25000 tak pahunchne ke liye mehnat kar, main tere saath hoon! 🔥"
        }
        
        msg_lower = req.message.lower().strip()
        for key in fallback_replies:
            if key in msg_lower:
                return {"success": True, "reply": fallback_replies[key]}
        
        return {"success": True, "reply": fallback_replies["default"]}
