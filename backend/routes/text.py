from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import ContentInput

router = APIRouter()

class TextInput(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Text content cannot be empty.")
        return v.strip()

@router.post("/extract/text")
def extract_text(payload: TextInput, db: Session = Depends(get_db)):
    if not payload.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    new_input = ContentInput(
        type="text",
        raw_text=payload.text,
        source_url=None
    )
    db.add(new_input)
    db.commit()
    db.refresh(new_input)
    return {"id": str(new_input.id), "raw_text": new_input.raw_text}

