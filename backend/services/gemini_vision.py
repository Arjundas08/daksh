"""
Gemini Vision Service for DAKSH
Analyzes construction site images for safety compliance using Google Gemini.
"""

import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def analyze_safety_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Analyze a construction site image for safety compliance.
    Returns dict with items checked and overall score.
    """
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = """You are a construction site safety inspector AI. Analyze this image carefully.

Check for the following safety items on workers visible in the image:
1. Helmet/Hardhat
2. Safety Harness
3. Safety Boots/Shoes
4. High-Visibility Vest
5. Barricades/Safety Barriers
6. Gloves

For each item, determine if it is PRESENT, MISSING, or NOT_APPLICABLE (if the item wouldn't be relevant).

Also give an overall safety score from 0 to 100.

IMPORTANT: Respond ONLY in this exact JSON format, nothing else:
{
    "items": [
        {"name": "Helmet", "name_hi": "हेलमेट", "status": "PRESENT|MISSING|NOT_APPLICABLE"},
        {"name": "Safety Harness", "name_hi": "सेफ्टी हार्नेस", "status": "PRESENT|MISSING|NOT_APPLICABLE"},
        {"name": "Safety Boots", "name_hi": "सेफ्टी जूते", "status": "PRESENT|MISSING|NOT_APPLICABLE"},
        {"name": "Hi-Vis Vest", "name_hi": "चमकीली जैकेट", "status": "PRESENT|MISSING|NOT_APPLICABLE"},
        {"name": "Barricades", "name_hi": "बैरिकेड", "status": "PRESENT|MISSING|NOT_APPLICABLE"},
        {"name": "Gloves", "name_hi": "दस्ताने", "status": "PRESENT|MISSING|NOT_APPLICABLE"}
    ],
    "safety_score": 75,
    "summary": "Brief one-line summary of safety status",
    "summary_hi": "Hindi mein ek line ka summary"
}"""

    image_part = {"mime_type": mime_type, "data": image_bytes}

    try:
        response = model.generate_content([prompt, image_part])
        text = response.text.strip()
        # Clean markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        print(f"[Gemini Vision] Error: {e}")
        return {
            "items": [],
            "safety_score": 0,
            "summary": f"Analysis failed: {str(e)}",
            "summary_hi": "Analysis fail ho gaya",
        }
