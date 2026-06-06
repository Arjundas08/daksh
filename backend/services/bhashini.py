"""
Bhashini Voice Service for DAKSH
Handles ASR (Speech-to-Text), TTS (Text-to-Speech via edge-tts), and NMT (Translation).
Adapted from the proven Nyaya-Setu pattern.
"""

import os
import base64
import requests
import asyncio
import re
import tempfile
from typing import Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID", "")
BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY", "")
BHASHINI_INFERENCE_KEY = os.getenv("BHASHINI_INFERENCE_KEY", "")

PIPELINE_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
INFERENCE_URL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

LANG_CODES = {
    "Hindi": "hi",
    "Telugu": "te",
    "Tamil": "ta",
    "Kannada": "kn",
    "English": "en",
    "Bengali": "bn",
    "Marathi": "mr",
    "Gujarati": "gu",
    "Malayalam": "ml",
    "Auto-Detect": "auto",
}

CODE_TO_LANG = {v: k for k, v in LANG_CODES.items()}

# Unicode range based language detection fallback
UNICODE_LANG_MAP = [
    (r'[\u0900-\u097F]', 'hi'),  # Devanagari -> Hindi
    (r'[\u0C00-\u0C7F]', 'te'),  # Telugu
    (r'[\u0B80-\u0BFF]', 'ta'),  # Tamil
    (r'[\u0C80-\u0CFF]', 'kn'),  # Kannada
    (r'[\u0980-\u09FF]', 'bn'),  # Bengali
    (r'[\u0A80-\u0AFF]', 'gu'),  # Gujarati
    (r'[\u0D00-\u0D7F]', 'ml'),  # Malayalam
    (r'[\u0900-\u097F]', 'mr'),  # Marathi (also Devanagari)
]


def is_bhashini_configured() -> bool:
    """Check if Bhashini credentials are properly set."""
    return bool(BHASHINI_USER_ID and BHASHINI_API_KEY and BHASHINI_INFERENCE_KEY)


def _get_headers(for_inference: bool = False) -> dict:
    """Get appropriate headers for Bhashini API calls."""
    if for_inference:
        return {
            "Content-Type": "application/json",
            "Authorization": BHASHINI_INFERENCE_KEY,
        }
    else:
        return {
            "Content-Type": "application/json",
            "userID": BHASHINI_USER_ID,
            "ulcaApiKey": BHASHINI_API_KEY,
        }


def _get_pipeline_config(
    task_type: str,
    source_lang: str,
    target_lang: str = None,
) -> Optional[dict]:
    """
    Get pipeline configuration from ULCA for a given task.
    task_type: 'asr', 'tts', 'translation'
    """
    payload = {
        "pipelineTasks": [{"taskType": task_type, "config": {"language": {"sourceLanguage": source_lang}}}],
        "pipelineRequestConfig": {"pipelineId": "64392f96daac500b55c543cd"},
    }

    if target_lang and task_type == "translation":
        payload["pipelineTasks"][0]["config"]["language"]["targetLanguage"] = target_lang

    try:
        resp = requests.post(
            PIPELINE_CONFIG_URL,
            json=payload,
            headers=_get_headers(for_inference=False),
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        pipeline_config = data.get("pipelineResponseConfig", [{}])[0].get("config", [{}])
        if not pipeline_config:
            print(f"[Bhashini] No pipeline config returned for {task_type}")
            return None

        config = pipeline_config[0] if isinstance(pipeline_config, list) else pipeline_config
        service_id = config.get("serviceId", "")
        callback_url = data.get("pipelineInferenceAPIEndPoint", {}).get("callbackUrl", INFERENCE_URL)

        return {
            "serviceId": service_id,
            "callbackUrl": callback_url,
            "config": config,
        }
    except Exception as e:
        print(f"[Bhashini] Pipeline config error: {e}")
        return None


def speech_to_text(audio_bytes: bytes, language: str = "hi") -> Tuple[str, str]:
    """
    Transcribe audio using Bhashini ASR.
    Returns (transcribed_text, detected_language_code).
    """
    if not is_bhashini_configured():
        return ("Bhashini not configured", language)

    # Get pipeline config
    source_lang = language if language != "auto" else "hi"
    config = _get_pipeline_config("asr", source_lang)
    if not config:
        return ("Pipeline config failed", language)

    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    payload = {
        "pipelineTasks": [
            {
                "taskType": "asr",
                "config": {
                    "language": {"sourceLanguage": source_lang},
                    "serviceId": config["serviceId"],
                    "audioFormat": "wav",
                    "samplingRate": 16000,
                },
            }
        ],
        "inputData": {
            "audio": [{"audioContent": audio_b64}]
        },
    }

    try:
        resp = requests.post(
            config.get("callbackUrl", INFERENCE_URL),
            json=payload,
            headers=_get_headers(for_inference=True),
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()

        output = data.get("pipelineResponse", [{}])[0].get("output", [{}])
        if output:
            text = output[0].get("source", "")
            detected = output[0].get("langPrediction", [])
            lang_code = source_lang
            if detected:
                lang_code = detected[0].get("langCode", source_lang)
            return (text, lang_code)
        return ("No transcription output", language)
    except Exception as e:
        print(f"[Bhashini ASR] Error: {e}")
        return (f"ASR error: {str(e)}", language)


async def text_to_speech(
    text: str,
    language: str = "hi",
    gender: str = "female",
) -> Optional[bytes]:
    """
    Convert text to speech using edge-tts (more reliable than Bhashini TTS).
    Returns audio bytes (MP3).
    """
    import edge_tts

    # Voice map for Indian languages using edge-tts Neural voices
    voice_map = {
        "hi": {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
        "te": {"female": "te-IN-ShrutiNeural", "male": "te-IN-MohanNeural"},
        "ta": {"female": "ta-IN-PallaviNeural", "male": "ta-IN-ValluvarNeural"},
        "kn": {"female": "kn-IN-SapnaNeural", "male": "kn-IN-GaganNeural"},
        "en": {"female": "en-IN-NeerjaNeural", "male": "en-IN-PrabhatNeural"},
        "bn": {"female": "bn-IN-TanishaaNeural", "male": "bn-IN-BashkarNeural"},
        "mr": {"female": "mr-IN-AarohiNeural", "male": "mr-IN-ManoharNeural"},
        "gu": {"female": "gu-IN-DhwaniNeural", "male": "gu-IN-NiranjanNeural"},
        "ml": {"female": "ml-IN-SobhanaNeural", "male": "ml-IN-MidhunNeural"},
    }

    gender_key = "female" if gender.lower() in ("female", "f") else "male"
    voice = voice_map.get(language, voice_map["hi"]).get(gender_key, voice_map["hi"]["female"])

    try:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        return audio_data if audio_data else None
    except Exception as e:
        print(f"[Edge-TTS] Error: {e}")
        return None


def translate_text(
    text: str,
    source_lang: str,
    target_lang: str,
) -> str:
    """Translate text using Bhashini NMT pipeline."""
    if not is_bhashini_configured():
        return text
    if source_lang == target_lang:
        return text

    config = _get_pipeline_config("translation", source_lang, target_lang)
    if not config:
        return text

    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang,
                    },
                    "serviceId": config["serviceId"],
                },
            }
        ],
        "inputData": {
            "input": [{"source": text}]
        },
    }

    try:
        resp = requests.post(
            config.get("callbackUrl", INFERENCE_URL),
            json=payload,
            headers=_get_headers(for_inference=True),
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()

        output = data.get("pipelineResponse", [{}])[0].get("output", [{}])
        if output:
            return output[0].get("target", text)
        return text
    except Exception as e:
        print(f"[Bhashini NMT] Error: {e}")
        return text


def detect_language(text: str) -> str:
    """
    Detect language of text using Bhashini TLD service.
    Falls back to Unicode range detection.
    """
    if not text or not text.strip():
        return "en"

    # Try Bhashini TLD first
    if is_bhashini_configured():
        try:
            config = _get_pipeline_config("tld", "en")
            if config:
                payload = {
                    "pipelineTasks": [
                        {
                            "taskType": "tld",
                            "config": {
                                "serviceId": config["serviceId"],
                            },
                        }
                    ],
                    "inputData": {
                        "input": [{"source": text}]
                    },
                }
                resp = requests.post(
                    config.get("callbackUrl", INFERENCE_URL),
                    json=payload,
                    headers=_get_headers(for_inference=True),
                    timeout=30,
                )
                resp.raise_for_status()
                data = resp.json()
                output = data.get("pipelineResponse", [{}])[0].get("output", [{}])
                if output:
                    detected = output[0].get("langPrediction", [])
                    if detected:
                        return detected[0].get("langCode", "en")
        except Exception as e:
            print(f"[Bhashini TLD] Error, falling back to Unicode: {e}")

    # Unicode fallback
    for pattern, lang_code in UNICODE_LANG_MAP:
        if re.search(pattern, text):
            return lang_code

    return "en"


def get_language_name(code: str) -> str:
    """Get language display name from code. e.g. 'hi' -> 'Hindi'."""
    return CODE_TO_LANG.get(code, "Unknown")


def get_language_code(name: str) -> str:
    """Get language code from name. e.g. 'Hindi' -> 'hi'."""
    return LANG_CODES.get(name, "en")
