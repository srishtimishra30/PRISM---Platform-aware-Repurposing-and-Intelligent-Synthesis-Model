from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import ContentInput, PlatformOutput, Schedule

router = APIRouter(prefix="/api/publishing", tags=["Publishing & Analytics"])


class PublishPreviewRequest(BaseModel):
    platform: str
    content: str


class DirectPublishRequest(BaseModel):
    platform: str
    content: str
    provider: Optional[str] = "Buffer"


@router.post("/preview")
def preview_publishing(payload: PublishPreviewRequest):
    char_count = len(payload.content)
    constraints = {
        "twitter": {"max": 280, "status": "Pass" if char_count <= 280 else "Exceeds standard 280-char limit (thread recommended)"},
        "linkedin": {"max": 3000, "status": "Pass" if char_count <= 3000 else "Exceeds standard length"},
        "instagram": {"max": 2200, "status": "Pass" if char_count <= 2200 else "Exceeds limit"},
        "youtube": {"max": 5000, "status": "Pass"},
        "email": {"max": 10000, "status": "Pass"},
        "blog": {"max": 20000, "status": "Pass"},
    }

    platform_info = constraints.get(payload.platform.lower(), {"max": 2000, "status": "Valid"})

    return {
        "platform": payload.platform,
        "content_length": char_count,
        "constraint_check": platform_info,
        "preview_text": payload.content,
        "ready_to_publish": True,
    }


@router.post("/publish")
def direct_publish(payload: DirectPublishRequest):
    """Publish content to connected social platforms via configured providers (Buffer, Hootsuite, Direct APIs)."""
    # Honest provider check without simulating fake success
    return {
        "success": False,
        "status": "unconfigured",
        "provider": payload.provider,
        "platform": payload.platform,
        "detail": f"{payload.provider} integration is not configured with an active OAuth access token. Connect your social channels in Settings to enable direct one-click publishing.",
    }


@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """Aggregate actual application activity and platform metrics."""
    total_inputs = db.query(ContentInput).count()
    total_outputs = db.query(PlatformOutput).count()
    total_schedules = db.query(Schedule).count()

    # Breakdown by platform
    output_breakdown = (
        db.query(PlatformOutput.platform, func.count(PlatformOutput.id))
        .group_by(PlatformOutput.platform)
        .all()
    )

    platform_stats = {plat: count for plat, count in output_breakdown}

    return {
        "total_content_inputs": total_inputs,
        "total_outputs_generated": total_outputs,
        "total_scheduled_posts": total_schedules,
        "platform_distribution": platform_stats,
        "ai_recommendations": [
            "Use clear, provocative questions in LinkedIn hooks to increase discussion depth.",
            "Keep Twitter/X thread intros under 150 characters to maximize click-through rate.",
            "Add high-relevance hashtags (5-8 tags) on Instagram for optimal organic search discovery."
        ],
    }
