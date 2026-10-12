import re
import os
import glob
import shutil
import tempfile
import urllib.request
import json
from typing import Optional, Tuple
from fastapi import HTTPException
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
)


def extract_video_id(url_or_id: str) -> str:
    """
    Extract YouTube 11-character video ID from varied URL formats:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/shorts/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://www.youtube.com/live/VIDEO_ID
    - https://m.youtube.com/watch?v=VIDEO_ID
    - Direct 11-char ID
    """
    if not url_or_id:
        return ""
    clean = url_or_id.strip()

    patterns = [
        r"(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/|\/e\/)([a-zA-Z0-9_-]{11})",
        r"[\?&]v=([a-zA-Z0-9_-]{11})",
        r"^([a-zA-Z0-9_-]{11})$",
    ]
    for pattern in patterns:
        match = re.search(pattern, clean)
        if match:
            return match.group(1)
    return ""


def fetch_video_title(video_id: str) -> Optional[str]:
    """Fetch video title using YouTube oEmbed without requiring an API key."""
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req = urllib.request.Request(
            oembed_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PRISM/2.0"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("title")
    except Exception:
        return None


def fetch_captions(video_id: str) -> Tuple[str, str]:
    """
    Attempt to fetch captions (manual or auto-generated) using the installed
    youtube-transcript-api (supports v1.2.x instance methods and class methods).
    Returns (cleaned_text, method_info).
    Raises TranscriptsDisabled, NoTranscriptFound, or Exception if unavailable.
    """
    try:
        ytt_api = YouTubeTranscriptApi()
    except Exception:
        ytt_api = None

    transcript_list = None
    if ytt_api and hasattr(ytt_api, "list"):
        try:
            transcript_list = ytt_api.list(video_id)
        except Exception as e:
            err_name = type(e).__name__
            err_str = str(e).lower()
            if "videounavailable" in err_name.lower() or "video is unavailable" in err_str:
                raise HTTPException(status_code=404, detail="YouTube video is unavailable, deleted, or private.")
            if "transcriptsdisabled" in err_name.lower() or "notranscriptfound" in err_name.lower():
                raise
    elif hasattr(YouTubeTranscriptApi, "list_transcripts"):
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        except Exception as e:
            err_name = type(e).__name__
            err_str = str(e).lower()
            if "videounavailable" in err_name.lower() or "video is unavailable" in err_str:
                raise HTTPException(status_code=404, detail="YouTube video is unavailable, deleted, or private.")
            if "transcriptsdisabled" in err_name.lower() or "notranscriptfound" in err_name.lower():
                raise

    snippets = None
    # 1. Try finding transcript from transcript_list (prioritizing English, then any available)
    if transcript_list:
        try:
            target_transcript = transcript_list.find_transcript(["en", "en-US", "en-GB"])
            snippets = target_transcript.fetch()
        except Exception:
            try:
                # Fall back to the first available transcript (auto-generated or other language)
                for tr in transcript_list:
                    snippets = tr.fetch()
                    break
            except Exception:
                pass

    # 2. Try direct fetch
    if not snippets:
        if ytt_api and hasattr(ytt_api, "fetch"):
            snippets = ytt_api.fetch(video_id)
        elif hasattr(YouTubeTranscriptApi, "get_transcript"):
            snippets = YouTubeTranscriptApi.get_transcript(video_id)

    if not snippets:
        raise NoTranscriptFound(video_id, [], "No transcript snippets could be retrieved")

    text_parts = []
    for item in snippets:
        if isinstance(item, dict):
            val = item.get("text", "")
        else:
            val = getattr(item, "text", str(item))
        if val:
            text_parts.append(val)

    clean_text = " ".join(text_parts).replace("\n", " ").replace("♪", "").strip()
    clean_text = re.sub(r"\s+", " ", clean_text)
    return clean_text, "official_captions"


def download_audio_and_transcribe_whisper(url: str, video_id: str) -> str:
    """
    Fallback mechanism when official subtitles/captions are unavailable:
    1. Checks for credentials first: GROQ_API_KEY or OPENAI_API_KEY.
    2. Downloads audio stream using yt-dlp.
    3. Transcribes audio via configured Whisper provider.
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")

    if not groq_api_key and not openai_api_key:
        raise HTTPException(
            status_code=422,
            detail=(
                "Subtitles/captions are disabled or unavailable for this YouTube video. "
                "Audio transcription fallback is unconfigured: GROQ_API_KEY or OPENAI_API_KEY is required in backend/.env."
            ),
        )

    try:
        import yt_dlp
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="yt-dlp is not installed on the backend server for fallback audio extraction.",
        )

    temp_dir = tempfile.mkdtemp(prefix="prism_yt_audio_")
    out_tmpl = os.path.join(temp_dir, f"{video_id}.%(ext)s")

    ydl_opts = {
        "format": "ba[ext=m4a]/ba/worst",
        "outtmpl": out_tmpl,
        "quiet": True,
        "no_warnings": True,
        "max_filesize": 25 * 1024 * 1024,
    }

    try:
        target_url = f"https://www.youtube.com/watch?v={video_id}"
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([target_url])

        downloaded_files = glob.glob(os.path.join(temp_dir, f"{video_id}.*"))
        if not downloaded_files:
            raise HTTPException(
                status_code=422,
                detail="Unable to extract audio stream from YouTube video for Whisper transcription.",
            )

        audio_path = downloaded_files[0]
        file_size = os.path.getsize(audio_path)
        if file_size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="YouTube audio exceeds maximum supported transcription file size (25MB).",
            )

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        # Whisper via Groq
        if groq_api_key:
            from groq import Groq

            client = Groq(api_key=groq_api_key)
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(audio_path), audio_bytes),
                model="whisper-large-v3",
                response_format="text",
            )
            extracted_text = str(transcription).strip()
        # Whisper via OpenAI
        elif openai_api_key:
            from openai import OpenAI

            client = OpenAI(api_key=openai_api_key)
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(audio_path), audio_bytes),
                model="whisper-1",
            )
            extracted_text = str(transcription.text).strip()
        else:
            raise HTTPException(
                status_code=422,
                detail="Missing Whisper credentials (GROQ_API_KEY or OPENAI_API_KEY required).",
            )

        if not extracted_text:
            raise HTTPException(
                status_code=422,
                detail="Whisper transcription produced empty text for this YouTube video.",
            )

        return extracted_text
    except HTTPException:
        raise
    except Exception as e:
        err_str = str(e)
        if "unavailable" in err_str.lower() or "private" in err_str.lower() or "not found" in err_str.lower():
            raise HTTPException(
                status_code=404,
                detail="This YouTube video is private, unavailable, or restricted.",
            )
        raise HTTPException(
            status_code=400,
            detail=f"Fallback Whisper transcription error: {err_str}",
        )
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def extract_youtube_content_pipeline(url: str) -> Tuple[str, str, str]:
    """
    Main extraction pipeline:
    1. Validates and extracts video ID from watch, youtu.be, shorts, and embed links.
    2. Fetches video title.
    3. Tries YouTube closed captions / transcripts first.
    4. If captions are disabled/unavailable, falls back to yt-dlp + Whisper.
    Returns (clean_text, video_title, video_id).
    """
    clean_url = url.strip() if url else ""
    if not clean_url:
        raise HTTPException(status_code=400, detail="YouTube URL is required.")

    video_id = extract_video_id(clean_url)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL. Please provide a valid YouTube watch link, youtu.be short link, or Shorts link.",
        )

    title = fetch_video_title(video_id) or f"YouTube Video ({video_id})"

    # 1. Attempt official captions first
    try:
        text, method = fetch_captions(video_id)
        if text:
            return text, title, video_id
    except HTTPException:
        raise
    except (TranscriptsDisabled, NoTranscriptFound):
        pass
    except Exception as e:
        err_msg = str(e).lower()
        if "videounavailable" in err_msg or "video is unavailable" in err_msg:
            raise HTTPException(
                status_code=404,
                detail="YouTube video is unavailable, deleted, or private.",
            )
        # Other caption errors continue to fallback
        pass

    # 2. Captions unavailable, try fallback to yt-dlp + Whisper
    try:
        whisper_text = download_audio_and_transcribe_whisper(clean_url, video_id)
        return whisper_text, title, video_id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Subtitles/captions are disabled or unavailable for this YouTube video. Fallback error: {str(e)}",
        )
