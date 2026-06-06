import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

router = APIRouter(prefix="/api/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    message: str
    role: str = "worker"
    skill: str = "Helper"

@router.post("/ustaad")
async def chat_with_ustaad(req: ChatRequest):
    """
    Ustaad AI: A friendly master tradesman chatbot.
    Replies in easy-to-understand Hinglish.
    """
    model = genai.GenerativeModel("gemini-2.0-flash")
    
    system_prompt = f"""You are 'Ustaad AI', a highly experienced, friendly, and wise master tradesman in India.
Your job is to mentor a {req.skill} ({req.role}).
They will ask you questions about their work, skills, or how to get more jobs.

Rules:
1. ALWAYS reply in easy-to-understand 'Hinglish' (Hindi written in English alphabet, e.g., 'Arre bhai, cement mix karte waqt...').
2. Keep your answers short, practical, and very encouraging. Maximum 3-4 sentences.
3. Act like a mentor/elder brother (Ustaad). Start with a friendly greeting like 'Bhai', 'Chote', or 'Dost'.
4. Do not use complex English words. Keep it relatable to a blue-collar worker in India.
"""

    try:
        chat = model.start_chat(history=[
            {"role": "user", "parts": [system_prompt]}
        ])
        response = chat.send_message(req.message)
        return {"success": True, "reply": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
