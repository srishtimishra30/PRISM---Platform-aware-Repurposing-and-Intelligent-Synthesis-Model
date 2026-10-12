from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import ContentInput
from backend.services.youtube_extractor import extract_youtube_content_pipeline

router = APIRouter()

class YoutubeInput(BaseModel):
    url: str

@router.post("/extract/youtube")
def extract_youtube(payload: YoutubeInput, db: Session = Depends(get_db)):
    if not payload.url or not payload.url.strip():
        raise HTTPException(status_code=400, detail="YouTube URL is required.")

    clean_text, title, video_id = extract_youtube_content_pipeline(payload.url.strip())

    new_input = ContentInput(
        type="youtube",
        raw_text=clean_text,
        source_url=payload.url.strip(),
    )
    db.add(new_input)
    db.commit()
    db.refresh(new_input)

    return {
        "id": str(new_input.id),
        "content_id": str(new_input.id),
        "title": title,
        "source_url": payload.url.strip(),
        "raw_text": clean_text,
        "extracted_text": clean_text,
    }