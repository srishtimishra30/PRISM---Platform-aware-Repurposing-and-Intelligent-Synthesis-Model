from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text as sql
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import ContentInput, ContentDNA
from ai_llm.llm_service import generate_content

router = APIRouter()

@router.post("/summarize/{content_id}")
def summarize(content_id: str, db: Session = Depends(get_db)):
    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    result = generate_content(
        f"Summarize this in 3-5 key points: {content.raw_text}"
    )
    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])

    existing_dna = db.query(ContentDNA).filter(ContentDNA.input_id == content.id).first()
    if existing_dna:
        existing_dna.top_insights = result["response"]
    else:
        new_dna = ContentDNA(input_id=content.id, top_insights=result["response"])
        db.add(new_dna)
    db.commit()
    return {"id": content_id, "summary": result["response"]}