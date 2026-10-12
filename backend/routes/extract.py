from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

import pymupdf
from backend.database import get_db
from backend.models import ContentInput

router = APIRouter()

@router.post("/extract/pdf")
async def extract_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are supported.")

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

        doc = pymupdf.open(stream=contents, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()

        text = text.strip()
        if not text:
            raise HTTPException(status_code=422, detail="No extractable text found in this PDF (it may contain only scanned images).")

        new_input = ContentInput(
            type="pdf",
            raw_text=text,
            source_url=file.filename
        )
        db.add(new_input)
        db.commit()
        db.refresh(new_input)

        return {
            "id": str(new_input.id),
            "filename": file.filename,
            "extracted_text": text
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read or parse PDF: {str(e)}")