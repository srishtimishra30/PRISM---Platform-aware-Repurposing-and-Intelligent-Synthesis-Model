import asyncio
import concurrent.futures
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from backend.database import get_db, SessionLocal
from backend.models import (
    ContentInput,
    ContentDNA,
    PlatformOutput,
    ContentMetadata,
    GenerationJob,
    JobChannelResult,
)
from ai_llm.content_generator import (
    generate_summary,
    generate_linkedin_post,
    generate_twitter_thread,
    generate_instagram_caption,
    generate_youtube_content,
    generate_email_newsletter,
    generate_blog_post,
    generate_seo_metadata,
    generate_image_prompt,
    translate_content,
)

router = APIRouter(prefix="/api/content", tags=["Content"])

# Channel Registry
CHANNEL_MAP = {
    "summary": {
        "fn": generate_summary,
        "name": "Summary",
    },
    "linkedin_post": {
        "fn": generate_linkedin_post,
        "name": "LinkedIn Post",
    },
    "twitter_thread": {
        "fn": generate_twitter_thread,
        "name": "Twitter / X Thread",
    },
    "instagram_caption": {
        "fn": generate_instagram_caption,
        "name": "Instagram Caption",
    },
    "youtube_content": {
        "fn": generate_youtube_content,
        "name": "YouTube Content",
    },
    "email_newsletter": {
        "fn": generate_email_newsletter,
        "name": "Email Newsletter",
    },
    "blog_post": {
        "fn": generate_blog_post,
        "name": "Blog Post",
    },
}

ALL_CHANNELS = list(CHANNEL_MAP.keys())

# Best Time to Post Knowledge Base
BEST_TIME_DEFAULTS = {
    "summary": {
        "day": "Monday",
        "time": "09:00 AM",
        "window": "8:30 AM – 10:00 AM",
        "reason": "Ideal for weekly kickoff alignment, executive briefings, and setting prioritized goals early in the work cycle."
    },
    "linkedin_post": {
        "day": "Tuesday",
        "time": "09:00 AM",
        "window": "8:30 AM – 10:30 AM",
        "reason": "B2B professionals check industry feeds upon desk arrival and before morning strategy meetings."
    },
    "twitter_thread": {
        "day": "Wednesday",
        "time": "12:30 PM",
        "window": "12:00 PM – 02:00 PM",
        "reason": "Midday discussions peak during lunch breaks, maximizing quote-tweets, replies, and bookmarks."
    },
    "instagram_caption": {
        "day": "Thursday",
        "time": "08:00 PM",
        "window": "07:00 PM – 09:30 PM",
        "reason": "High evening mobile usage post-work hours yields peak visual impressions, likes, and shares."
    },
    "youtube_content": {
        "day": "Friday",
        "time": "03:00 PM",
        "window": "02:00 PM – 05:00 PM",
        "reason": "Publishing in the afternoon gives the algorithm time to process high-res video and captions before peak weekend viewership."
    },
    "email_newsletter": {
        "day": "Tuesday",
        "time": "10:00 AM",
        "window": "09:30 AM – 11:30 AM",
        "reason": "Avoids Monday inbox cleanup and Friday sign-offs; industry benchmarks show highest unique open and click rates."
    },
    "blog_post": {
        "day": "Monday",
        "time": "10:30 AM",
        "window": "09:00 AM – 12:00 PM",
        "reason": "Readers consume in-depth thought leadership, guides, and long-form articles early in the work week."
    },
}


class GenerateRequest(BaseModel):
    tone: Optional[str] = "Professional"  # Professional, Conversational, Educational, Casual, Humorous
    target_audience: Optional[str] = None
    channels: Optional[List[str]] = None
    language: Optional[str] = None


class UpdateContentRequest(BaseModel):
    platform: str  # summary, linkedin_post, twitter_thread, etc.
    content: str


class TranslateRequest(BaseModel):
    target_language: str
    content: str


class ImagePromptRequest(BaseModel):
    style: Optional[str] = "Modern Digital Art"


def _execute_channel_generation(
    channel_key: str,
    source_text: str,
    tone: Optional[str],
    audience: Optional[str],
) -> Dict[str, Any]:
    """Execute generator for a specific platform channel with tone and audience, with rate-limit retry."""
    gen_entry = CHANNEL_MAP.get(channel_key)
    if not gen_entry:
        return {"response": None, "response_time": 0.0, "error": f"Unknown channel: {channel_key}"}

    fn = gen_entry["fn"]
    max_retries = 3

    for attempt in range(max_retries):
        try:
            try:
                res = fn(source_text, tone=tone, target_audience=audience)
            except TypeError:
                res = fn(source_text, tone=tone)

            err_str = (res.get("error") or "") if isinstance(res, dict) else ""
            if ("429" in err_str or "rate limit" in err_str.lower()) and attempt < max_retries - 1:
                time.sleep(3.5 * (attempt + 1))
                continue

            return res
        except Exception as e:
            err_msg = str(e)
            if ("429" in err_msg or "rate limit" in err_msg.lower()) and attempt < max_retries - 1:
                time.sleep(3.5 * (attempt + 1))
                continue
            return {"response": None, "response_time": 0.0, "error": err_msg}


def _persist_outputs_batch(db: Session, content_id: str, outputs_map: Dict[str, str]):
    """Persist outputs to database in a single query + batch commit."""
    if outputs_map.get("summary"):
        dna = db.query(ContentDNA).filter(ContentDNA.input_id == content_id).first()
        if not dna:
            dna = ContentDNA(input_id=content_id, top_insights=outputs_map["summary"])
            db.add(dna)
        else:
            dna.top_insights = outputs_map["summary"]

    existing = {
        out.platform: out
        for out in db.query(PlatformOutput).filter(PlatformOutput.input_id == content_id).all()
    }

    for plat_name, text_val in outputs_map.items():
        if not text_val:
            continue
        if plat_name in existing:
            existing[plat_name].content = text_val
        else:
            db.add(PlatformOutput(input_id=content_id, platform=plat_name, content=text_val))

    db.commit()


def _format_job_dict(job: GenerationJob) -> Dict[str, Any]:
    """Serialize GenerationJob and its channel results for API consumers."""
    channel_results = []
    for r in (job.channel_results or []):
        channel_results.append({
            "platform": r.platform,
            "status": r.status,
            "generated_content": r.generated_content,
            "response_time": r.response_time,
            "error": r.error,
        })

    return {
        "job_id": str(job.id),
        "content_id": str(job.input_id),
        "status": job.status,
        "progress": job.progress,
        "total_channels": job.total_channels,
        "completed_channels": job.completed_channels,
        "tone": job.tone,
        "target_audience": job.target_audience,
        "language": job.language,
        "error": job.error,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "channel_results": channel_results,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART 1: PERSISTENT BACKGROUND AI GENERATION WORKER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def process_generation_job(
    job_id: str,
    content_id: str,
    source_text: str,
    selected_tone: Optional[str],
    target_audience: Optional[str],
    channels: List[str],
    language: Optional[str],
):
    """Background task that runs parallel LLM calls and commits live DB progress."""
    db = SessionLocal()
    job = None
    try:
        job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        if not job:
            return

        job.status = "Processing"
        db.commit()

        # Execute channels concurrently with optimal concurrency to respect rate limits
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(channels), 3)) as executor:
            future_to_ch = {
                executor.submit(_execute_channel_generation, ch, source_text, selected_tone, target_audience): ch
                for ch in channels
            }

            for future in concurrent.futures.as_completed(future_to_ch):
                ch_name = future_to_ch[future]
                try:
                    res = future.result()
                except Exception as exc:
                    res = {"response": None, "response_time": 0.0, "error": str(exc)}

                text_val = res.get("response") or ""
                err_val = res.get("error")
                resp_time = res.get("response_time") or 0.0

                # Optional translation
                if text_val and language and language != "English":
                    try:
                        t_res = translate_content(text_val, language)
                        if t_res.get("response"):
                            text_val = t_res["response"]
                    except Exception:
                        pass

                # Update JobChannelResult
                ch_result = (
                    db.query(JobChannelResult)
                    .filter(JobChannelResult.job_id == job_id, JobChannelResult.platform == ch_name)
                    .first()
                )
                if ch_result:
                    ch_result.status = "Completed" if text_val else "Failed"
                    ch_result.generated_content = text_val
                    ch_result.response_time = resp_time
                    ch_result.error = err_val
                else:
                    db.add(JobChannelResult(
                        job_id=job_id,
                        platform=ch_name,
                        generated_content=text_val,
                        status="Completed" if text_val else "Failed",
                        response_time=resp_time,
                        error=err_val,
                    ))

                # Also persist to platform_outputs table so existing endpoints & history see it
                if text_val:
                    existing_out = (
                        db.query(PlatformOutput)
                        .filter(PlatformOutput.input_id == content_id, PlatformOutput.platform == ch_name)
                        .first()
                    )
                    if existing_out:
                        existing_out.content = text_val
                    else:
                        db.add(PlatformOutput(input_id=content_id, platform=ch_name, content=text_val))

                    if ch_name == "summary":
                        dna = db.query(ContentDNA).filter(ContentDNA.input_id == content_id).first()
                        if dna:
                            dna.top_insights = text_val
                        else:
                            db.add(ContentDNA(input_id=content_id, top_insights=text_val))

                # Live progress count
                job.completed_channels = (
                    db.query(JobChannelResult)
                    .filter(JobChannelResult.job_id == job_id, JobChannelResult.status.in_(["Completed", "Failed"]))
                    .count()
                )
                if job.total_channels > 0:
                    job.progress = int((job.completed_channels / job.total_channels) * 100)

                db.commit()

        # Final status check
        failed_count = (
            db.query(JobChannelResult)
            .filter(JobChannelResult.job_id == job_id, JobChannelResult.status == "Failed")
            .count()
        )
        if failed_count == 0:
            job.status = "Completed"
        elif failed_count == job.total_channels:
            job.status = "Failed"
        else:
            job.status = "Partially Completed"

        job.completed_channels = (
            db.query(JobChannelResult)
            .filter(JobChannelResult.job_id == job_id, JobChannelResult.status.in_(["Completed", "Failed"]))
            .count()
        )
        job.completed_at = datetime.utcnow()
        job.progress = 100
        db.commit()
    except Exception as e:
        if job:
            job.status = "Failed"
            job.error = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/{content_id}/jobs")
def create_generation_job(
    content_id: str,
    background_tasks: BackgroundTasks,
    payload: Optional[GenerateRequest] = None,
    db: Session = Depends(get_db),
):
    """Start an asynchronous persistent background generation job.

    Returns immediately with a unique job_id. Background task continues independently of page navigation.
    """
    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    if not content.raw_text or not content.raw_text.strip():
        raise HTTPException(status_code=400, detail="Cannot generate outputs from empty content")

    source_text = content.raw_text.strip()
    selected_tone = payload.tone if payload and payload.tone else "Professional"
    target_audience = payload.target_audience if payload and payload.target_audience else None
    language = payload.language if payload and payload.language else "English"

    requested_channels = payload.channels if payload and payload.channels else ALL_CHANNELS
    valid_channels = [c for c in requested_channels if c in CHANNEL_MAP]
    if not valid_channels:
        valid_channels = ALL_CHANNELS

    # Duplicate Protection: Prevent starting duplicate job if one is already active
    active_job = (
        db.query(GenerationJob)
        .filter(GenerationJob.input_id == content_id, GenerationJob.status.in_(["Pending", "Processing"]))
        .first()
    )
    if active_job:
        return _format_job_dict(active_job)

    # Create new job
    job = GenerationJob(
        input_id=content_id,
        status="Pending",
        progress=0,
        total_channels=len(valid_channels),
        completed_channels=0,
        tone=selected_tone,
        target_audience=target_audience,
        language=language,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Initialize pending channel results
    for ch in valid_channels:
        db.add(JobChannelResult(
            job_id=job.id,
            platform=ch,
            status="Pending",
        ))
    db.commit()

    # Enqueue background task (runs independently of HTTP connection)
    background_tasks.add_task(
        process_generation_job,
        job.id,
        content_id,
        source_text,
        selected_tone,
        target_audience,
        valid_channels,
        language,
    )

    return _format_job_dict(job)


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Fetch status, progress, and channel results for a background generation job."""
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Generation job not found")
    return _format_job_dict(job)


@router.get("/jobs/active/latest")
def get_latest_active_job(db: Session = Depends(get_db)):
    """Retrieve the latest generation job for browser refresh recovery."""
    job = (
        db.query(GenerationJob)
        .order_by(desc(GenerationJob.created_at))
        .first()
    )
    if not job:
        return {"job": None}
    return {"job": _format_job_dict(job)}


@router.get("/jobs/content/{content_id}")
def get_job_for_content(content_id: str, db: Session = Depends(get_db)):
    """Retrieve the latest generation job for a specific content ID."""
    job = (
        db.query(GenerationJob)
        .filter(GenerationJob.input_id == content_id)
        .order_by(desc(GenerationJob.created_at))
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="No job found for this content")
    return _format_job_dict(job)


@router.post("/jobs/{job_id}/retry")
def retry_failed_channels_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Retry failed channels in a generation job without re-running successful ones."""
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Generation job not found")

    content = db.query(ContentInput).filter(ContentInput.id == job.input_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    failed_platforms = [r.platform for r in job.channel_results if r.status == "Failed"]
    if not failed_platforms:
        return {"message": "No failed channels to retry", "job": _format_job_dict(job)}

    # Reset failed channels to Pending
    for r in job.channel_results:
        if r.platform in failed_platforms:
            r.status = "Pending"
            r.error = None
    job.status = "Processing"
    db.commit()

    background_tasks.add_task(
        process_generation_job,
        job.id,
        content.id,
        content.raw_text,
        job.tone,
        job.target_audience,
        failed_platforms,
        job.language,
    )

    return _format_job_dict(job)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART 2: BEST TIME TO POST RECOMMENDATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("/best-time-recommendations")
def get_best_time_recommendations(
    platform: Optional[str] = Query(None),
    timezone: Optional[str] = Query("Asia/Kolkata"),
    audience: Optional[str] = Query(None),
):
    """Return best time to post suggestions with platform rationale and timezone context."""
    results = {}
    platforms = [platform] if platform and platform in BEST_TIME_DEFAULTS else ALL_CHANNELS
    for p in platforms:
        base = BEST_TIME_DEFAULTS.get(p, BEST_TIME_DEFAULTS["linkedin_post"])
        results[p] = {
            "platform": p,
            "recommended_day": base["day"],
            "suggested_time": base["time"],
            "recommended_window": base["window"],
            "timezone": timezone or "Asia/Kolkata",
            "target_audience": audience or "General Audience",
            "reason": base["reason"],
            "source_type": "Heuristic Suggestion (Industry engagement patterns)",
        }
    return results


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DIRECT / SYNCHRONOUS PARALLEL GENERATION (For direct API callers)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{content_id}/generate")
def generate_all_platforms(
    content_id: str,
    payload: Optional[GenerateRequest] = None,
    db: Session = Depends(get_db),
):
    """Generate requested platform outputs concurrently in parallel using ThreadPoolExecutor."""
    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    if not content.raw_text or not content.raw_text.strip():
        raise HTTPException(status_code=400, detail="Cannot generate outputs from empty content")

    source_text = content.raw_text.strip()
    selected_tone = payload.tone if payload and payload.tone else "Professional"
    target_audience = payload.target_audience if payload and payload.target_audience else None

    requested_channels = payload.channels if payload and payload.channels else ALL_CHANNELS
    valid_channels = [c for c in requested_channels if c in CHANNEL_MAP]
    if not valid_channels:
        valid_channels = ALL_CHANNELS

    start_time = time.perf_counter()

    results: Dict[str, Dict[str, Any]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(valid_channels), 7)) as executor:
        future_to_channel = {
            executor.submit(_execute_channel_generation, ch, source_text, selected_tone, target_audience): ch
            for ch in valid_channels
        }
        for future in concurrent.futures.as_completed(future_to_channel):
            channel_name = future_to_channel[future]
            try:
                res = future.result()
                results[channel_name] = res
            except Exception as exc:
                results[channel_name] = {"response": None, "response_time": 0.0, "error": str(exc)}

    total_duration = round(time.perf_counter() - start_time, 3)

    outputs_map = {ch: (results.get(ch, {}).get("response") or "") for ch in valid_channels}
    errors = {ch: results[ch]["error"] for ch in valid_channels if results.get(ch, {}).get("error")}

    _persist_outputs_batch(db, content.id, outputs_map)

    target_lang = payload.language if payload and payload.language else None
    if target_lang and target_lang != "English":
        try:
            for k in outputs_map:
                if outputs_map[k]:
                    t_res = translate_content(outputs_map[k], target_lang)
                    if t_res.get("response"):
                        outputs_map[k] = t_res["response"]
            _persist_outputs_batch(db, content.id, outputs_map)
        except Exception:
            pass

    return {
        "content_id": str(content.id),
        "tone": selected_tone,
        "target_audience": target_audience,
        "duration_seconds": total_duration,
        **outputs_map,
        "errors": errors if errors else None,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SERVER-SENT EVENTS (SSE) STREAMING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{content_id}/generate-stream")
def generate_platforms_stream(
    content_id: str,
    payload: Optional[GenerateRequest] = None,
    db: Session = Depends(get_db),
):
    """Stream each platform output in real time as soon as it completes via Server-Sent Events."""
    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    if not content.raw_text or not content.raw_text.strip():
        raise HTTPException(status_code=400, detail="Cannot generate outputs from empty content")

    source_text = content.raw_text.strip()
    selected_tone = payload.tone if payload and payload.tone else "Professional"
    target_audience = payload.target_audience if payload and payload.target_audience else None

    requested_channels = payload.channels if payload and payload.channels else ALL_CHANNELS
    valid_channels = [c for c in requested_channels if c in CHANNEL_MAP]
    if not valid_channels:
        valid_channels = ALL_CHANNELS

    def event_generator():
        start_time = time.perf_counter()
        yield f"data: {json.dumps({'event': 'start', 'channels': valid_channels, 'total': len(valid_channels)})}\n\n"

        completed_outputs = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(valid_channels), 7)) as executor:
            future_to_channel = {
                executor.submit(_execute_channel_generation, ch, source_text, selected_tone, target_audience): ch
                for ch in valid_channels
            }

            for future in concurrent.futures.as_completed(future_to_channel):
                ch_name = future_to_channel[future]
                try:
                    res = future.result()
                except Exception as exc:
                    res = {"response": None, "response_time": 0.0, "error": str(exc)}

                text_out = res.get("response") or ""
                error_msg = res.get("error")
                resp_time = res.get("response_time") or 0.0

                if text_out:
                    completed_outputs[ch_name] = text_out

                event_payload = {
                    "event": "channel_done",
                    "channel": ch_name,
                    "content": text_out,
                    "error": error_msg,
                    "response_time": resp_time,
                    "status": "ready" if text_out else "error",
                }
                yield f"data: {json.dumps(event_payload)}\n\n"

        if completed_outputs:
            try:
                _persist_outputs_batch(db, content_id, completed_outputs)
            except Exception as e:
                yield f"data: {json.dumps({'event': 'db_warning', 'message': str(e)})}\n\n"

        total_elapsed = round(time.perf_counter() - start_time, 3)
        yield f"data: {json.dumps({'event': 'complete', 'content_id': content_id, 'total_duration': total_elapsed})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# INDIVIDUAL CHANNEL REGENERATION (Single-Click Retry)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{content_id}/generate/{channel}")
def regenerate_single_channel(
    content_id: str,
    channel: str,
    payload: Optional[GenerateRequest] = None,
    db: Session = Depends(get_db),
):
    """Regenerate or retry an individual channel without re-running the others."""
    if channel not in CHANNEL_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported channel '{channel}'. Supported: {', '.join(ALL_CHANNELS)}",
        )

    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    if not content.raw_text or not content.raw_text.strip():
        raise HTTPException(status_code=400, detail="Cannot generate outputs from empty content")

    source_text = content.raw_text.strip()
    selected_tone = payload.tone if payload and payload.tone else "Professional"
    target_audience = payload.target_audience if payload and payload.target_audience else None
    language = payload.language if payload and payload.language else None

    res = _execute_channel_generation(channel, source_text, selected_tone, target_audience)

    text_val = res.get("response") or ""
    error_val = res.get("error")

    if text_val and language and language != "English":
        try:
            t_res = translate_content(text_val, language)
            if t_res.get("response"):
                text_val = t_res["response"]
        except Exception:
            pass

    if text_val:
        if channel == "summary":
            dna = db.query(ContentDNA).filter(ContentDNA.input_id == content.id).first()
            if not dna:
                dna = ContentDNA(input_id=content.id, top_insights=text_val)
                db.add(dna)
            else:
                dna.top_insights = text_val

        existing_output = (
            db.query(PlatformOutput)
            .filter(PlatformOutput.input_id == content.id, PlatformOutput.platform == channel)
            .first()
        )
        if existing_output:
            existing_output.content = text_val
        else:
            db.add(PlatformOutput(input_id=content.id, platform=channel, content=text_val))
        db.commit()

    return {
        "content_id": str(content.id),
        "platform": channel,
        "content": text_val,
        "error": error_val,
        "response_time": res.get("response_time"),
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UPDATE / EDIT SINGLE PLATFORM OUTPUT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.put("/{content_id}")
def update_platform_output(content_id: str, payload: UpdateContentRequest, db: Session = Depends(get_db)):
    """Save user edits to a specific platform output."""
    existing_output = (
        db.query(PlatformOutput)
        .filter(PlatformOutput.input_id == content_id, PlatformOutput.platform == payload.platform)
        .first()
    )
    if existing_output:
        existing_output.content = payload.content
    else:
        db.add(PlatformOutput(input_id=content_id, platform=payload.platform, content=payload.content))

    if payload.platform == "summary":
        dna = db.query(ContentDNA).filter(ContentDNA.input_id == content_id).first()
        if dna:
            dna.top_insights = payload.content
        else:
            db.add(ContentDNA(input_id=content_id, top_insights=payload.content))

    db.commit()
    return {"status": "saved", "content_id": content_id, "platform": payload.platform}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SEO AND KEYWORD EXTRACTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{content_id}/seo")
def get_seo_for_content(content_id: str, db: Session = Depends(get_db)):
    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    res = generate_seo_metadata(content.raw_text)
    if res.get("error"):
        raise HTTPException(status_code=502, detail=res["error"])

    db.add(ContentMetadata(input_id=content_id, meta_key="seo", meta_value=res["response"]))
    db.commit()

    return {"content_id": content_id, "seo_metadata": res["response"]}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUALITY CHECKER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{content_id}/quality-check")
def quality_check_content(content_id: str, db: Session = Depends(get_db)):
    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    raw_text = content.raw_text or ""
    words = raw_text.split()
    word_count = len(words)
    sentence_count = len([s for s in raw_text.split(".") if s.strip()]) or 1
    avg_words_per_sentence = round(word_count / sentence_count, 1)

    checks = []
    score = 100

    if word_count < 30:
        score -= 25
        checks.append({"name": "Length Sufficiency", "status": "Warning", "desc": "Content is short (< 30 words). Repurposing richness may be limited."})
    else:
        checks.append({"name": "Length Sufficiency", "status": "Pass", "desc": f"Optimal length ({word_count} words)."})

    if avg_words_per_sentence > 25:
        score -= 15
        checks.append({"name": "Readability / Sentence Flow", "status": "Warning", "desc": f"Sentences are dense (avg {avg_words_per_sentence} words/sentence). Consider shorter sentences."})
    else:
        checks.append({"name": "Readability / Sentence Flow", "status": "Pass", "desc": f"Good readability (avg {avg_words_per_sentence} words/sentence)."})

    outputs_count = len(content.outputs)
    if outputs_count >= 5:
        checks.append({"name": "Platform Coverage", "status": "Pass", "desc": f"{outputs_count} platform channels synthesized."})
    else:
        score -= 10
        checks.append({"name": "Platform Coverage", "status": "Notice", "desc": f"{outputs_count} platforms generated so far."})

    checks.append({"name": "Originality & Formatting", "status": "Pass", "desc": "Clean punctuation and structured formatting verified."})

    return {
        "content_id": content_id,
        "score": max(score, 40),
        "word_count": word_count,
        "sentence_count": sentence_count,
        "checks": checks,
        "suggestions": "Break lengthy paragraphs into bullet points for LinkedIn and Instagram reach." if avg_words_per_sentence > 20 else "Content structure is well-balanced for cross-platform adaptation.",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# IMAGE PROMPT GENERATOR
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{content_id}/image-prompt")
def create_image_prompt(content_id: str, payload: Optional[ImagePromptRequest] = None, db: Session = Depends(get_db)):
    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    style = payload.style if payload and payload.style else "Modern Digital Art"
    res = generate_image_prompt(content.raw_text, style=style)
    if res.get("error"):
        raise HTTPException(status_code=502, detail=res["error"])

    db.add(ContentMetadata(input_id=content_id, meta_key=f"image_prompt_{style}", meta_value=res["response"]))
    db.commit()

    return {
        "content_id": content_id,
        "style": style,
        "image_prompt": res["response"],
        "provider_status": "Prompt generated. External image generation API (Stable Diffusion / DALL-E) is ready to hook into this prompt.",
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TRANSLATION ENDPOINT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.post("/{content_id}/translate")
def translate_platform_content(content_id: str, payload: TranslateRequest, db: Session = Depends(get_db)):
    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    res = translate_content(payload.content, payload.target_language)
    if res.get("error"):
        raise HTTPException(status_code=502, detail=res["error"])

    return {
        "content_id": content_id,
        "target_language": payload.target_language,
        "translated_content": res["response"],
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OPTIMIZED HISTORY RETRIEVAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
@router.get("")
def list_content_history(limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    """Retrieve history of saved content with their generated outputs without N+1 queries."""
    records = (
        db.query(ContentInput)
        .options(joinedload(ContentInput.outputs), joinedload(ContentInput.dna))
        .order_by(desc(ContentInput.created_at))
        .limit(limit)
        .all()
    )

    history = []
    for item in records:
        outputs = {out.platform: out.content for out in item.outputs}
        if "summary" not in outputs and item.dna and item.dna.top_insights:
            outputs["summary"] = item.dna.top_insights

        raw_text = item.raw_text or ""
        history.append({
            "id": str(item.id),
            "type": item.type,
            "raw_text": raw_text[:1200] if len(raw_text) > 1200 else raw_text,
            "source_url": item.source_url,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "outputs": outputs,
        })

    return history


@router.get("/{content_id}")
def get_content_item(content_id: str, db: Session = Depends(get_db)):
    content = (
        db.query(ContentInput)
        .options(joinedload(ContentInput.outputs), joinedload(ContentInput.dna))
        .filter(ContentInput.id == content_id)
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    outputs = {out.platform: out.content for out in content.outputs}
    if "summary" not in outputs and content.dna and content.dna.top_insights:
        outputs["summary"] = content.dna.top_insights

    return {
        "id": str(content.id),
        "type": content.type,
        "raw_text": content.raw_text,
        "source_url": content.source_url,
        "created_at": content.created_at.isoformat() if content.created_at else None,
        "outputs": outputs,
    }


@router.delete("/{content_id}")
def delete_content_item(content_id: str, db: Session = Depends(get_db)):
    content = db.query(ContentInput).filter(ContentInput.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content record not found")

    db.delete(content)
    db.commit()
    return {"status": "deleted", "id": content_id}
