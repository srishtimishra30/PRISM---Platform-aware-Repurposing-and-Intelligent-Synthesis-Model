import io
from typing import Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PlatformOutput
from backend.services.export_service import (
    export_single_channel_file,
    export_all_channels_file,
)

router = APIRouter(prefix="/api/export", tags=["Export"])


class SingleExportRequest(BaseModel):
    platform: str
    content: str
    format: str  # pdf, docx, txt, png, pptx


class AllExportRequest(BaseModel):
    content_id: Optional[str] = None
    channels: Optional[Dict[str, str]] = None
    format: str  # pdf, docx, txt, png, pptx


@router.post("/single")
def export_single_channel(payload: SingleExportRequest):
    """Export a single generated channel output into PDF, DOCX, TXT, PNG, or PPTX."""
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Cannot export empty content.")

    try:
        buf, filename, media_type = export_single_channel_file(
            platform=payload.platform,
            content=payload.content,
            export_format=payload.format,
        )
        return Response(
            content=buf.getvalue(),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/all")
def export_all_channels(payload: AllExportRequest, db: Session = Depends(get_db)):
    """Export all completed channels consolidated into PDF, DOCX, TXT, PNG ZIP, or PPTX."""
    channels = payload.channels or {}

    # If content_id provided and channels empty, load from database
    if payload.content_id and not any(channels.values()):
        records = db.query(PlatformOutput).filter(PlatformOutput.input_id == payload.content_id).all()
        for r in records:
            if r.content and r.content.strip():
                channels[r.platform] = r.content

    # Filter out empty channels
    valid_channels = {k: v for k, v in channels.items() if v and v.strip()}
    if not valid_channels:
        raise HTTPException(status_code=400, detail="No completed channel content found to export.")

    try:
        buf, filename, media_type = export_all_channels_file(
            channels=valid_channels,
            export_format=payload.format,
        )
        return Response(
            content=buf.getvalue(),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Consolidated export failed: {str(e)}")
import io
from typing import Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import PlatformOutput
from backend.services.export_service import (
    export_single_channel_file,
    export_all_channels_file,
)

router = APIRouter(prefix="/api/export", tags=["Export"])


class SingleExportRequest(BaseModel):
    platform: str
    content: str
    format: str  # pdf, docx, txt, png, pptx


class AllExportRequest(BaseModel):
    content_id: Optional[str] = None
    channels: Optional[Dict[str, str]] = None
    format: str  # pdf, docx, txt, png, pptx


@router.post("/single")
def export_single_channel(payload: SingleExportRequest):
    """Export a single generated channel output into PDF, DOCX, TXT, PNG, or PPTX."""
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Cannot export empty content.")

    try:
        buf, filename, media_type = export_single_channel_file(
            platform=payload.platform,
            content=payload.content,
            export_format=payload.format,
        )
        return Response(
            content=buf.getvalue(),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/all")
def export_all_channels(payload: AllExportRequest, db: Session = Depends(get_db)):
    """Export all completed channels consolidated into PDF, DOCX, TXT, PNG ZIP, or PPTX."""
    channels = payload.channels or {}

    # If content_id provided and channels empty, load from database
    if payload.content_id and not any(channels.values()):
        records = db.query(PlatformOutput).filter(PlatformOutput.input_id == payload.content_id).all()
        for r in records:
            if r.content and r.content.strip():
                channels[r.platform] = r.content

    # Filter out empty channels
    valid_channels = {k: v for k, v in channels.items() if v and v.strip()}
    if not valid_channels:
        raise HTTPException(status_code=400, detail="No completed channel content found to export.")

    try:
        buf, filename, media_type = export_all_channels_file(
            channels=valid_channels,
            export_format=payload.format,
        )
        return Response(
            content=buf.getvalue(),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Consolidated export failed: {str(e)}")

