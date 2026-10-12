"""Platform Content Generators for PRISM.

Provides 5 platform-specific content generation functions powered by LLM.
"""

from typing import Any, Dict, Optional

try:
    from ai_llm.llm_service import generate_content
except ImportError:
    from llm_service import generate_content


def _validate_source_text(source_text: Optional[str]) -> Optional[Dict[str, Any]]:
    """Validate that source_text is non-empty.

    If empty or None, return an error dictionary without calling the LLM.
    """
    if not source_text or not str(source_text).strip():
        return {
            "response": "Source text is required.",
            "response_time": 0.0,
            "error": "Source text is required.",
        }
    return None


VALID_TONES = [
    "Professional",
    "Conversational",
    "Educational",
    "Casual",
    "Humorous",
]


def _format_tone_instruction(tone: Optional[str]) -> str:
    """Return explicit prompt instruction for the selected tone."""
    if not tone:
        return ""
    t_clean = tone.strip().capitalize()
    if t_clean == "Casual":
        return "Tone: Casual, relaxed, natural, and effortless (avoid overly formal or stiff phrasing)."
    elif t_clean == "Conversational":
        return "Tone: Conversational, friendly, accessible, and direct."
    elif t_clean == "Educational":
        return "Tone: Educational, informative, insightful, and clear."
    elif t_clean == "Humorous":
        return "Tone: Lighthearted, witty, playful, and humorous."
    elif t_clean == "Professional":
        return "Tone: Professional, polished, executive, and credible."
    return f"Tone: {tone}."


def generate_summary(source_text: str, tone: Optional[str] = None) -> Dict[str, Any]:
    """Generate a concise summary with 3-5 key points from the source text."""
    error_res = _validate_source_text(source_text)
    if error_res:
        return error_res

    tone_instruction = _format_tone_instruction(tone)
    tone_block = f"\n- {tone_instruction}" if tone_instruction else ""

    prompt = f"""You are a content summarizer. Summarize the following source text.

Requirements:
- Generate a concise summary.{tone_block}
- Return exactly 3 to 5 key points in a numbered list.
- Preserve the original meaning.
- Do not invent facts, statistics, names, dates, URLs, or claims.
- Do not add information that is not present in the source text.
- Use clear and simple language.
- Do not add any intro, outro, explanations, or disclaimers outside the requested format.

Required output format:

SUMMARY:
1. ...
2. ...
3. ...

Source Text:
{source_text}"""

    return generate_content(prompt)


def generate_linkedin_post(source_text: str, tone: Optional[str] = None) -> Dict[str, Any]:
    """Generate a LinkedIn post adapted to the selected tone based on the source text."""
    error_res = _validate_source_text(source_text)
    if error_res:
        return error_res

    tone_instruction = _format_tone_instruction(tone)
    tone_line = tone_instruction if tone_instruction else "Tone: Professional LinkedIn tone."

    prompt = f"""You are an expert social media strategist writing a LinkedIn post based ONLY on the source text below.

Requirements:
- {tone_line}
- Start with a strong hook under HOOK:.
- Use short readable paragraphs under POST:.
- Extract the important ideas from the source text.
- Make the post engaging but strictly factual.
- Include a natural call-to-action under CTA:.
- Add 3 to 5 relevant hashtags under HASHTAGS:.
- Do not invent statistics, facts, names, dates, URLs, or claims.
- Do not provide posting tips or extra commentary outside the requested structure.
- Return ONLY the final LinkedIn post structure.

Required structure:

HOOK:
...

POST:
...

CTA:
...

HASHTAGS:
#... #... #...

Source Text:
{source_text}"""

    return generate_content(prompt)


def generate_twitter_content(source_text: str, tone: Optional[str] = None) -> Dict[str, Any]:
    """Generate concise Twitter/X post or thread based on the source text."""
    error_res = _validate_source_text(source_text)
    if error_res:
        return error_res

    tone_instruction = _format_tone_instruction(tone)
    tone_block = f"\n- {tone_instruction}" if tone_instruction else ""

    prompt = f"""You are a social media copywriter creating a structured Twitter/X thread based ONLY on the source text below.

Requirements:
- Structured Twitter/X thread style (e.g. 1/, 2/, 3/ or Tweet 1, Tweet 2).{tone_block}
- Strong opening hook in the first tweet.
- Keep each tweet short, clear, and easy to scan.
- Preserve important information from the source text.
- Use a natural call-to-action in the concluding tweet.
- Use a maximum of 3 relevant hashtags under HASHTAGS:.
- Do not invent facts, statistics, names, dates, URLs, or claims.
- Do not add explanations or posting tips outside the requested format.

Required output structure:

TWITTER/X THREAD:
1/ ...
2/ ...
3/ ...

HASHTAGS:
#... #...

Source Text:
{source_text}"""

    return generate_content(prompt)


# Alias for compatibility with team naming expectations
generate_twitter_thread = generate_twitter_content



def generate_instagram_caption(source_text: str, tone: Optional[str] = None) -> Dict[str, Any]:
    """Generate an engaging Instagram caption based on the source text."""
    error_res = _validate_source_text(source_text)
    if error_res:
        return error_res

    tone_instruction = _format_tone_instruction(tone)
    tone_block = f"\n- {tone_instruction}" if tone_instruction else ""

    prompt = f"""You are an Instagram content creator writing a caption based ONLY on the source text below.

Requirements:
- Engaging Instagram style.{tone_block}
- Strong opening line.
- Short readable paragraphs under CAPTION:.
- Capture the main idea of the source text.
- Include a natural call-to-action under CTA:.
- Add 5 to 8 relevant hashtags under HASHTAGS:.
- Do not use irrelevant or excessive hashtags.
- Do not invent facts, statistics, names, dates, URLs, or claims.
- Do not add posting tips or explanations outside the requested structure.
- Return only the final caption structure.

Required output structure:

CAPTION:
...

CTA:
...

HASHTAGS:
#... #... #... #... #...

Source Text:
{source_text}"""

    return generate_content(prompt)


def generate_youtube_content(source_text: str, tone: Optional[str] = None) -> Dict[str, Any]:
    """Generate YouTube title, description, key points, and CTA based on source text."""
    error_res = _validate_source_text(source_text)
    if error_res:
        return error_res

    tone_instruction = _format_tone_instruction(tone)
    tone_block = f"\n- {tone_instruction}" if tone_instruction else ""

    prompt = f"""You are a YouTube video strategist creating video title and description content based ONLY on the source text below.

Requirements:
- Generate an SEO-friendly YouTube title relevant to the source text under TITLE:.
- Title must be clear and relevant to the source text.{tone_block}
- Generate a useful YouTube description under DESCRIPTION:.
- Include 3 concise key points under KEY POINTS:.
- Include a natural call-to-action under CTA:.
- Do not invent facts, statistics, names, dates, URLs, or claims.
- Do not add unrelated information.
- Do not add anything before TITLE: or after CTA:.

Required structure MUST be followed exactly:

TITLE:
...

DESCRIPTION:
...

KEY POINTS:
1. ...
2. ...
3. ...

CTA:
...

Source Text:
{source_text}"""

    return generate_content(prompt)


def generate_all_content(source_text: str, tone: Optional[str] = None) -> Dict[str, Any]:
    """Generate all 5 platform-specific outputs as a consistent dictionary.

    Returns:
        Dict with keys:
            - summary: str or dict (if error)
            - linkedin_post: str or dict (if error)
            - twitter_thread: str or dict (if error)
            - instagram_caption: str or dict (if error)
            - youtube_content: str or dict (if error)
            - errors: dict of any errors encountered per platform
    """
    error_res = _validate_source_text(source_text)
    if error_res:
        err_msg = error_res.get("error", "Source text is required.")
        return {
            "summary": None,
            "linkedin_post": None,
            "twitter_thread": None,
            "instagram_caption": None,
            "youtube_content": None,
            "errors": {"all": err_msg},
        }

    summary = generate_summary(source_text, tone=tone)
    linkedin = generate_linkedin_post(source_text, tone=tone)
    twitter = generate_twitter_thread(source_text, tone=tone)
    instagram = generate_instagram_caption(source_text, tone=tone)
    youtube = generate_youtube_content(source_text, tone=tone)

    errors = {}
    if summary.get("error"):
        errors["summary"] = summary["error"]
    if linkedin.get("error"):
        errors["linkedin_post"] = linkedin["error"]
    if twitter.get("error"):
        errors["twitter_thread"] = twitter["error"]
    if instagram.get("error"):
        errors["instagram_caption"] = instagram["error"]
    if youtube.get("error"):
        errors["youtube_content"] = youtube["error"]

    return {
        "summary": summary.get("response"),
        "linkedin_post": linkedin.get("response"),
        "twitter_thread": twitter.get("response"),
        "instagram_caption": instagram.get("response"),
        "youtube_content": youtube.get("response"),
        "errors": errors if errors else None,
    }


def generate_email_newsletter(source_text: str, tone: Optional[str] = None) -> Dict[str, Any]:
    """Generate an email newsletter draft with subject lines, preview text, and CTA."""
    error_res = _validate_source_text(source_text)
    if error_res:
        return error_res

    tone_instruction = f"Tone: {tone}." if tone else "Tone: Engaging, direct, and conversational."

    prompt = f"""You are an email marketing specialist creating an engaging email newsletter based ONLY on the source text below.

{tone_instruction}

Requirements:
- Propose 2-3 compelling subject lines under SUBJECT LINES:.
- Provide a punchy preview text (snippet) under PREVIEW TEXT:.
- Write the main newsletter body with short, readable paragraphs under NEWSLETTER BODY:.
- Include a clear call-to-action under CTA:.
- Strictly preserve facts from the source text. Do not invent claims, stats, or dates.

Required structure:
SUBJECT LINES:
1. ...
2. ...

PREVIEW TEXT:
...

NEWSLETTER BODY:
...

CTA:
...

Source Text:
{source_text}"""
    return generate_content(prompt)


def generate_blog_post(source_text: str, tone: Optional[str] = None) -> Dict[str, Any]:
    """Generate an SEO-optimized blog rewrite with structured headings and conclusion."""
    error_res = _validate_source_text(source_text)
    if error_res:
        return error_res

    tone_instruction = f"Tone: {tone}." if tone else "Tone: Educational, informative, and authoritative."

    prompt = f"""You are a content writer and SEO copywriter creating a complete structured blog post based ONLY on the source text below.

{tone_instruction}

Requirements:
- Provide an SEO-friendly blog title under TITLE:.
- Write a captivating introduction under INTRODUCTION:.
- Break key concepts into structured subheadings and content under BODY:.
- Conclude with actionable takeaways under CONCLUSION:.
- Provide meta description under META DESCRIPTION:.
- Strictly preserve facts from the source text without hallucinating information.

Required structure:
TITLE:
...

META DESCRIPTION:
...

INTRODUCTION:
...

BODY:
### ...
...

### ...
...

CONCLUSION:
...

Source Text:
{source_text}"""
    return generate_content(prompt)


def generate_seo_metadata(source_text: str) -> Dict[str, Any]:
    """Extract keywords, hashtags, and SEO meta recommendations using LLM."""
    error_res = _validate_source_text(source_text)
    if error_res:
        return error_res

    prompt = f"""You are an SEO specialist and NLP keyword extractor. Analyze the source text below and extract optimal SEO attributes.

Requirements:
- Extract 5-10 high-value primary and secondary keywords.
- Suggest 5-8 relevant hashtags.
- Suggest an SEO Title and Meta Description (under 160 characters).
- Identify key entities/phrases.

Required structure:
KEYWORDS: keyword1, keyword2, keyword3, keyword4, keyword5
HASHTAGS: #tag1 #tag2 #tag3 #tag4 #tag5
SEO TITLE: ...
META DESCRIPTION: ...

Source Text:
{source_text}"""
    return generate_content(prompt)


def generate_image_prompt(source_text: str, style: str = "Modern Digital Art") -> Dict[str, Any]:
    """Generate a descriptive image-generation visual prompt based on source content."""
    error_res = _validate_source_text(source_text)
    if error_res:
        return error_res

    prompt = f"""You are an art director and prompt engineer for AI image generators (DALL-E / Stable Diffusion).
Based ONLY on the core themes of the source text below, craft a detailed visual prompt.

Chosen Style: {style}

Requirements:
- Describe subject, composition, lighting, color palette, and mood.
- Keep the prompt under 100 words.
- Do not mention text overlays or words inside the picture.

Required output format:
VISUAL PROMPT: ...
NEGATIVE PROMPT: blurry, low quality, distorted, watermark, text

Source Text:
{source_text}"""
    return generate_content(prompt)


def translate_content(text_to_translate: str, target_language: str) -> Dict[str, Any]:
    """Translate repurposed content to target language using LLM translation."""
    if not text_to_translate or not text_to_translate.strip():
        return {"response": "Text to translate is required.", "response_time": 0.0, "error": "Empty text"}

    prompt = f"""You are an expert translator. Translate the following content accurately and naturally into {target_language}.
Preserve markdown formatting, line breaks, bullet points, and hashtags.
Do not add introductory remarks or explanatory commentary. Return ONLY the translated content.

Content to translate:
{text_to_translate}"""
    return generate_content(prompt)


