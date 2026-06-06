# 🚀 DAKSH
**Hunar ko Samman, Kaam ko Zimmedari.**

DAKSH is a decentralized, AI-powered platform designed to revolutionize the unorganized daily-wage labor sector in India. It connects contractors with skilled daily-wage workers instantly, eliminating middlemen and completely stopping wage theft.

## ⚠️ The Problem
1. **Wage Theft:** Workers often do back-breaking labor but contractors vanish without paying them.
2. **Inefficiency:** Contractors waste hours or days standing at labor chowks trying to find the right workers.
3. **Language Barriers:** Migrant workers struggle to use modern apps due to language differences.

## 💡 The Solution (Key Features)

* 🤖 **Autonomous AI Matching (The Thekedaar):** Contractors simply post a job. Our background AI instantly scans the database, finds the perfect workers based on verified Trust Scores and location, and auto-matches them. No phone calls needed.
* 🔒 **Smart Escrow Wallets:** Before work begins, the contractor's money is locked in a digital Escrow Wallet. The worker is 100% guaranteed to get paid upon completion. Wage theft is eliminated.
* 🗣️ **Ustaad AI (Financial Mentor):** A built-in AI voice assistant powered by **Gemini 2.5 Flash** and the **Bhashini Native TTS**. Workers can ask financial questions in their native language and receive realistic, spoken advice based on their live earnings.
* 👷 **Safety Audit AI (Chowkidaar):** Contractors can upload site photos. The AI uses computer vision to detect missing safety gear (like helmets) to ensure a safe working environment.
* 🌍 **Multi-Lingual:** One-click instant translation into English, Hindi, and Telugu.

## 🛠️ Tech Stack
* **Frontend:** React, Vite, TailwindCSS
* **Backend:** Python, FastAPI, SQLite
* **AI Models:** Google Gemini 2.5 Flash
* **Voice Engine:** Bhashini Native Neural TTS

## 🚀 How to Run Locally

### 1. Setup the Backend (Python)
```bash
cd backend
pip install -r requirements.txt
# Create a .env file and add GEMINI_API_KEY and BHASHINI keys
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Setup the Frontend (React)
Open a new terminal in the root folder:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser!

---
*Built with ❤️ for India's workforce.*
