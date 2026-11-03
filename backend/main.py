from pathlib import Path
from dotenv import load_dotenv

_ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
_AI_ENV = Path(__file__).resolve().parent.parent / "ai_llm" / ".env"
load_dotenv(_ROOT_ENV, override=False)
load_dotenv(_AI_ENV, override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import extract, text, youtube, summarize, content, inputs, schedules, publishing, export
from backend.database import engine, Base
import backend.models  # Ensure models are registered

# Ensure all database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PRISM Backend", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Legacy compatibility routes
app.include_router(extract.router)
app.include_router(text.router)
app.include_router(youtube.router)
app.include_router(summarize.router)

# Unified PRISM routes
app.include_router(inputs.router)
app.include_router(content.router)
app.include_router(schedules.router)
app.include_router(publishing.router)
app.include_router(export.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "PRISM Backend"}

