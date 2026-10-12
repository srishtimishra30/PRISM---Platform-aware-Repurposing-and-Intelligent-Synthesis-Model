from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database import get_db
from backend.models import Schedule, ContentInput

router = APIRouter(prefix="/api/schedules", tags=["Content Scheduler"])


class CreateScheduleRequest(BaseModel):
    input_id: Optional[str] = None
    platform: str
    content: str
    scheduled_time: str
    timezone: Optional[str] = "UTC"


class UpdateScheduleRequest(BaseModel):
    scheduled_time: Optional[str] = None
    status: Optional[str] = None  # scheduled, published, cancelled


@router.post("")
def create_schedule(payload: CreateScheduleRequest, db: Session = Depends(get_db)):
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=400, detail="Cannot schedule empty content.")
    if not payload.scheduled_time:
        raise HTTPException(status_code=400, detail="Scheduled time is required.")

    item = Schedule(
        input_id=payload.input_id,
        platform=payload.platform.lower(),
        content=payload.content.strip(),
        scheduled_time=payload.scheduled_time,
        timezone=payload.timezone or "UTC",
        status="scheduled"
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "id": str(item.id),
        "platform": item.platform,
        "scheduled_time": item.scheduled_time,
        "timezone": item.timezone,
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.get("")
def list_schedules(db: Session = Depends(get_db)):
    items = db.query(Schedule).order_by(desc(Schedule.created_at)).all()
    return [
        {
            "id": str(s.id),
            "input_id": s.input_id,
            "platform": s.platform,
            "content": s.content,
            "scheduled_time": s.scheduled_time,
            "timezone": s.timezone,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in items
    ]


@router.put("/{schedule_id}")
def update_schedule(schedule_id: str, payload: UpdateScheduleRequest, db: Session = Depends(get_db)):
    item = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Scheduled post not found")

    if payload.scheduled_time:
        item.scheduled_time = payload.scheduled_time
    if payload.status:
        item.status = payload.status

    db.commit()
    return {"status": "updated", "id": schedule_id, "post_status": item.status}


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: str, db: Session = Depends(get_db)):
    item = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Scheduled post not found")

    db.delete(item)
    db.commit()
    return {"status": "deleted", "id": schedule_id}
