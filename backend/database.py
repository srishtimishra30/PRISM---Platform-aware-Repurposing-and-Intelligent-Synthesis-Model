from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables: check root .env first, then ai_llm/.env
_ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
_AI_ENV = Path(__file__).resolve().parent.parent / "ai_llm" / ".env"
load_dotenv(_ROOT_ENV, override=False)
load_dotenv(_AI_ENV, override=False)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Safe default fallback for local development when PostgreSQL is not configured
    sqlite_db_path = Path(__file__).resolve().parent.parent / "prism_dev.db"
    DATABASE_URL = f"sqlite:///{sqlite_db_path}"
    print(f"DATABASE_URL not set in .env. Using local SQLite development fallback: {sqlite_db_path}")
else:
    print("Connecting to:", DATABASE_URL.split("@")[-1] if DATABASE_URL else None)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()