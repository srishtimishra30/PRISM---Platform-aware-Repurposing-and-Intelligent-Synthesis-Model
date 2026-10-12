import io
import re
import socket
import urllib.parse
import urllib.request
from typing import Optional
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session
import pymupdf
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

from backend.database import get_db
from backend.models import ContentInput

router = APIRouter(prefix="/api/inputs", tags=["Unified Inputs"])


class TextPayload(BaseModel):
    text: str
    title: Optional[str] = None


class UrlPayload(BaseModel):
    url: str


class YoutubePayload(BaseModel):
    url: str


def _validate_safe_url(url_str: str) -> str:
    """Validate URL and prevent SSRF by blocking localhost and private IP addresses."""
    parsed = urllib.parse.urlparse(url_str)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol. Only HTTP and HTTPS are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid host specified in URL.")

    # Block local loopback names
    if hostname.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        raise HTTPException(status_code=400, detail="Access to local loopback addresses is prohibited.")

    try:
        ip = socket.gethostbyname(hostname)
        parts = [int(p) for p in ip.split(".")]
        # Block RFC1918 private ranges & loopback
        if parts[0] == 10:
            raise HTTPException(status_code=400, detail="Access to private networks (10.x.x.x) is blocked.")
        if parts[0] == 172 and 16 <= parts[1] <= 31:
            raise HTTPException(status_code=400, detail="Access to private networks (172.16-31.x.x) is blocked.")
        if parts[0] == 192 and parts[1] == 168:
            raise HTTPException(status_code=400, detail="Access to private networks (192.168.x.x) is blocked.")
        if parts[0] == 127:
            raise HTTPException(status_code=400, detail="Access to loopback IP addresses is blocked.")
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Domain could not be resolved.")

    return url_str


# 1. TEXT INPUT
@router.post("/text")
def extract_text_input(payload: TextPayload, db: Session = Depends(get_db)):
    clean_text = payload.text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text content cannot be empty.")

    item = ContentInput(
        type="text",
        raw_text=clean_text,
        source_url=payload.title,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "source_type": "text",
        "content_id": str(item.id),
        "title": payload.title or "Raw Text Note",
        "source_url": None,
        "extracted_text": clean_text,
    }


# 2. ARTICLE / BLOG URL INPUT
@router.post("/url")
def extract_article_url(payload: UrlPayload, db: Session = Depends(get_db)):
    safe_url = _validate_safe_url(payload.url.strip())

    try:
        req = urllib.request.Request(
            safe_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PRISM-Bot/1.0",
                "Accept": "text/html,application/xhtml+xml",
            },
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            html = response.read().decode("utf-8", errors="ignore")

        soup = BeautifulSoup(html, "html.parser")

        # Extract title
        title = "Article"
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find("h1"):
            title = soup.find("h1").get_text(strip=True)

        # Remove boilerplates
        for tag in soup(["script", "style", "nav", "header", "footer", "aside", "noscript", "svg", "form"]):
            tag.decompose()

        # Extract main article or paragraph texts
        article_el = soup.find("article") or soup.find("main") or soup.body
        if not article_el:
            raise HTTPException(status_code=422, detail="Could not locate content body in URL.")

        paragraphs = [p.get_text(strip=True) for p in article_el.find_all(["p", "h2", "h3"])]
        extracted_text = "\n\n".join([p for p in paragraphs if len(p) > 20])

        if not extracted_text:
            extracted_text = article_el.get_text(separator="\n", strip=True)

        if not extracted_text or len(extracted_text) < 50:
            raise HTTPException(status_code=422, detail="Insufficient readable article text found on page.")

        item = ContentInput(
            type="url",
            raw_text=extracted_text,
            source_url=safe_url,
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        return {
            "source_type": "url",
            "content_id": str(item.id),
            "title": title,
            "source_url": safe_url,
            "extracted_text": extracted_text,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch or parse article URL: {str(e)}")


# 3. YOUTUBE TRANSCRIPT INPUT
@router.post("/youtube")
def extract_youtube_transcript(payload: YoutubePayload, db: Session = Depends(get_db)):
    from backend.services.youtube_extractor import extract_youtube_content_pipeline

    clean_text, title, video_id = extract_youtube_content_pipeline(payload.url)

    item = ContentInput(
        type="youtube",
        raw_text=clean_text,
        source_url=payload.url.strip(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "id": str(item.id),
        "source_type": "youtube",
        "content_id": str(item.id),
        "title": title,
        "source_url": payload.url.strip(),
        "extracted_text": clean_text,
        "raw_text": clean_text,
    }



# 4. PDF INPUT
@router.post("/pdf")
async def extract_pdf_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF documents are allowed.")

    try:
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")

        doc = pymupdf.open(stream=data, filetype="pdf")
        pages_text = []
        for page in doc:
            p_text = page.get_text()
            if p_text.strip():
                pages_text.append(p_text.strip())
        doc.close()

        full_text = "\n\n".join(pages_text).strip()
        if not full_text:
            raise HTTPException(status_code=422, detail="No extractable text found (Scanned PDFs without OCR are not supported).")

        item = ContentInput(
            type="pdf",
            raw_text=full_text,
            source_url=file.filename,
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        return {
            "source_type": "pdf",
            "content_id": str(item.id),
            "title": file.filename,
            "source_url": file.filename,
            "extracted_text": full_text,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction error: {str(e)}")


# 5. AUDIO / PODCAST INPUT (Whisper STT fallback / handler)
@router.post("/audio")
async def extract_audio_podcast(file: UploadFile = File(...), db: Session = Depends(get_db)):
    allowed_extensions = (".mp3", ".wav", ".m4a", ".ogg")
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Supported: {', '.join(allowed_extensions)}",
        )

    # Audio transcription via Whisper requires local whisper or OpenAI whisper API key
    try:
        import os
        groq_api_key = os.getenv("GROQ_API_KEY")

        if groq_api_key:
            from groq import Groq
            client = Groq(api_key=groq_api_key)
            audio_bytes = await file.read()
            audio_file = (file.filename, audio_bytes)
            # Use Groq Whisper model
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3",
                response_format="text"
            )
            extracted_text = str(transcription).strip()

            item = ContentInput(
                type="audio",
                raw_text=extracted_text,
                source_url=file.filename,
            )
            db.add(item)
            db.commit()
            db.refresh(item)

            return {
                "source_type": "audio",
                "content_id": str(item.id),
                "title": file.filename,
                "source_url": file.filename,
                "extracted_text": extracted_text,
            }
        else:
            raise HTTPException(
                status_code=503,
                detail="Speech-to-text is unconfigured: GROQ_API_KEY or OpenAI Whisper key required.",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Audio transcription error: {str(e)}")
