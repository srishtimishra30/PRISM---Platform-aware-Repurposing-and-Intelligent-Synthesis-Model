from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
import pymupdf
from app.database import get_db
from app.models import ContentInput

router = APIRouter()

@router.post("/extract/pdf")
async def extract_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    doc = pymupdf.open(stream=contents, filetype="pdf")

    text = ""
    for page in doc:
        text += page.get_text()

    doc.close()

    # Save to database
    new_input = ContentInput(
        type="pdf",
        raw_text=text,
        source_url=None
    )
    db.add(new_input)
    db.commit()
    db.refresh(new_input)

    return {
        "id": str(new_input.id),
        "filename": file.filename,
        "extracted_text": text
    }