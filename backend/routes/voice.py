"""
Voice Router for DAKSH
Handles voice transcription, synthesis, translation, and status check.
"""

import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

from services.bhashini import (
    speech_to_text,
    text_to_speech,
    translate_text,
    is_bhashini_configured,
    get_language_name,
    LANG_CODES,
)

router = APIRouter(prefix="/api/voice", tags=["Voice"])


# ─── Request Models ──────────────────────────────────────────────────────────

class SynthesizeRequest(BaseModel):
    text: str
    language: str = "hi"
    gender: str = "female"


class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("hi"),
):
    """Transcribe an audio file using Bhashini ASR."""
    audio_bytes = await audio.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    text, detected_lang = speech_to_text(audio_bytes, language)

    if not text or text.startswith("ASR error:"):
        raise HTTPException(status_code=502, detail=text or "Bhashini API is temporarily down.")

    return {
        "success": True,
        "text": text,
        "detected_language": detected_lang,
        "language_name": get_language_name(detected_lang),
    }


@router.post("/synthesize")
async def synthesize_speech(req: SynthesizeRequest):
    """Convert text to speech using edge-tts."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    audio_bytes = await text_to_speech(req.text, req.language, req.gender)

    if audio_bytes is None:
        raise HTTPException(status_code=500, detail="TTS synthesis failed")

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "attachment; filename=speech.mp3"},
    )


@router.post("/translate")
async def translate(req: TranslateRequest):
    """Translate text between languages using Bhashini NMT."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    translated = translate_text(req.text, req.source_lang, req.target_lang)

    return {
        "success": True,
        "original_text": req.text,
        "translated_text": translated,
        "source_lang": req.source_lang,
        "target_lang": req.target_lang,
    }


@router.get("/status")
async def voice_status():
    """Check if Bhashini voice services are configured and available."""
    configured = is_bhashini_configured()
    return {
        "success": True,
        "bhashini_configured": configured,
        "supported_languages": list(LANG_CODES.keys()),
        "tts_engine": "edge-tts",
    }
