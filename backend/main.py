"""
DAKSH 2.0 Backend — Main Application
FastAPI server with worker management, job matching, contracts, safety analysis, and voice services.
"""

import sys
import os

# Ensure imports work from the backend directory
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import asyncio
from database import init_db
from agents import start_agents, agent_logs, init_matches_table
from routes.workers import router as workers_router
from routes.jobs import router as jobs_router
from routes.contracts import router as contracts_router
from routes.safety import router as safety_router
from routes.voice import router as voice_router
from routes.contractors import router as contractors_router
from routes.chat import router as chat_router

# ─── Create App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="DAKSH 2.0",
    description="AI-powered platform for Indian construction workers — job matching, safety, voice services",
    version="2.0.0",
)

# ─── CORS Middleware ─────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup ─────────────────────────────────────────────────────────────────

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")


@app.on_event("startup")
async def startup():
    """Initialize database, matches table, uploads dir, and launch autonomous agents."""
    init_db()
    init_matches_table()
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    print(f"[DAKSH] Uploads directory: {UPLOADS_DIR}")
    print("[DAKSH] Server started successfully")
    
    # Launch autonomous agents in the background
    asyncio.create_task(start_agents())
    print("[DAKSH] Autonomous agents launched!")


# ─── Static Files (uploaded images) ─────────────────────────────────────────

os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ─── Include Routers ─────────────────────────────────────────────────────────

app.include_router(workers_router)
app.include_router(jobs_router)
app.include_router(contracts_router)
app.include_router(contractors_router)
app.include_router(safety_router)
app.include_router(voice_router)
app.include_router(chat_router)


# ─── Root & Health Endpoints ─────────────────────────────────────────────────

@app.get("/")
async def root():
    """Root endpoint — app info."""
    return {
        "status": "ok",
        "app": "DAKSH 2.0",
        "agents": [
            "ThekedaarAgent",
            "MunshiAgent",
            "ResearchAgent",
            "ComplianceAgent",
            "SurakshaAgent",
        ],
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": "DAKSH 2.0",
        "database": "sqlite",
        "services": {
            "bhashini": "configured",
            "gemini_vision": "configured",
            "tts": "edge-tts",
        },
    }


@app.get("/api/agents/logs")
async def get_agent_logs():
    """Get recent autonomous agent activity logs for the Command Center."""
    return {"success": True, "count": len(agent_logs), "logs": agent_logs[-50:]}


# ─── Run directly ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
