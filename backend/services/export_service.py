import io
import os
import re
import zipfile
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# ReportLab for PDF
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    KeepTogether,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# python-docx for DOCX
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

# python-pptx for PPTX
from pptx import Presentation
from pptx.util import Inches as PptxInches, Pt as PptxPt
from pptx.dml.color import RGBColor as PptxRGBColor

# Pillow for PNG
from PIL import Image, ImageDraw, ImageFont


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PLATFORM & TIMING METADATA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLATFORM_NAMES = {
    "summary": "Executive Summary",
    "linkedin_post": "LinkedIn Post",
    "twitter_thread": "Twitter / X Thread",
    "instagram_caption": "Instagram Caption",
    "youtube_content": "YouTube Metadata & Script",
    "email_newsletter": "Email Newsletter",
    "blog_post": "Blog Rewrite",
}

BEST_TIME_RECOMMENDATIONS = {
    "summary": {
        "day": "Monday",
        "time": "09:00 AM",
        "window": "8:30 AM – 10:00 AM",
        "reason": "Executive kickoff alignment and weekly briefing peak."
    },
    "linkedin_post": {
        "day": "Tuesday",
        "time": "09:00 AM",
        "window": "8:30 AM – 10:30 AM",
        "reason": "B2B professionals check feeds upon desk arrival before meetings."
    },
    "twitter_thread": {
        "day": "Wednesday",
        "time": "12:30 PM",
        "window": "12:00 PM – 02:00 PM",
        "reason": "Midday lunch break browsing yields highest quote-tweets and bookmarks."
    },
    "instagram_caption": {
        "day": "Thursday",
        "time": "08:00 PM",
        "window": "07:00 PM – 09:30 PM",
        "reason": "Post-work evening hours maximize visual reach, likes, and comments."
    },
    "youtube_content": {
        "day": "Friday",
        "time": "03:00 PM",
        "window": "02:00 PM – 05:00 PM",
        "reason": "Gives the recommendation algorithm time to index video before weekend viewership."
    },
    "email_newsletter": {
        "day": "Tuesday",
        "time": "10:00 AM",
        "window": "09:30 AM – 11:30 AM",
        "reason": "Avoids Monday inbox triage; yields highest open and click-through rates."
    },
    "blog_post": {
        "day": "Monday",
        "time": "10:30 AM",
        "window": "09:00 AM – 12:00 PM",
        "reason": "Early-week readers consume in-depth thought leadership and guides."
    },
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNICODE FONT REGISTRATION FOR REPORTLAB
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PDF_FONT_REGULAR = "NotoSans"
PDF_FONT_BOLD = "NotoSans-Bold"

_FONTS_REGISTERED = False

def _register_pdf_fonts():
    global _FONTS_REGISTERED, PDF_FONT_REGULAR, PDF_FONT_BOLD
    if _FONTS_REGISTERED:
        return

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    local_fonts_dir = os.path.join(base_dir, "assets", "fonts")
    noto_reg = os.path.join(local_fonts_dir, "NotoSans-Regular.ttf")
    noto_bold = os.path.join(local_fonts_dir, "NotoSans-Bold.ttf")

    if os.path.exists(noto_reg) and os.path.exists(noto_bold):
        try:
            pdfmetrics.registerFont(TTFont("NotoSans", noto_reg))
            pdfmetrics.registerFont(TTFont("NotoSans-Bold", noto_bold))
            PDF_FONT_REGULAR = "NotoSans"
            PDF_FONT_BOLD = "NotoSans-Bold"
            _FONTS_REGISTERED = True
            return
        except Exception:
            pass

    # Windows fallback
    win_arial = r"C:\Windows\Fonts\arial.ttf"
    win_arial_bd = r"C:\Windows\Fonts\arialbd.ttf"
    if os.path.exists(win_arial) and os.path.exists(win_arial_bd):
        try:
            pdfmetrics.registerFont(TTFont("ArialUnicode", win_arial))
            pdfmetrics.registerFont(TTFont("ArialUnicode-Bold", win_arial_bd))
            PDF_FONT_REGULAR = "ArialUnicode"
            PDF_FONT_BOLD = "ArialUnicode-Bold"
            _FONTS_REGISTERED = True
            return
        except Exception:
            pass

    # Standard fallback
    PDF_FONT_REGULAR = "Helvetica"
    PDF_FONT_BOLD = "Helvetica-Bold"
    _FONTS_REGISTERED = True

_register_pdf_fonts()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EMOJI & SPECIAL CHARACTER SANITIZATION (Precludes Black Squares ■■■■)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMOJI_FALLBACKS = {
    '🚀': '[Launch]',
    '💡': '[Tip]',
    '✨': '*',
    '🔥': '!',
    '🧵': '[Thread]',
    '👉': '>',
    '⚡': '[Update]',
    '🔄': '[Retweet]',
    '📈': '[Growth]',
    '🎯': '[Target]',
    '📊': '[Analytics]',
    '💬': '[Discussion]',
    '🔔': '[Alert]',
    '⭐': '*',
    '🌟': '*',
    '📌': '*',
    '🔗': '[Link]',
    '📅': '[Date]',
    '⏰': '[Time]',
    '🏆': '[Award]',
    '✅': '[✓]',
    '✔️': '[✓]',
    '✓': '[✓]',
    '❌': '[x]',
    '❓': '?',
    '❗': '!',
    '❤️': '<3>',
    '👏': '[Applause]',
    '🎉': '[Celebration]',
    '🤖': '[AI]',
    '💻': '[Tech]',
    '📱': '[Mobile]',
    '🌐': '[Web]',
    '✉️': '[Email]',
    '📧': '[Email]',
    '📝': '[Note]',
    '📄': '[Doc]',
    '💼': '[Business]',
    '🎓': '[Education]',
}

def sanitize_pdf_text(text: str) -> str:
    """Sanitizes text for ReportLab PDF generation.
    Replaces unsupported emojis with clean readable descriptors.
    Prevents missing-glyph null bytes that render as solid black squares (■).
    Preserves line breaks, numbers, hashtags, bullets, and punctuation.
    """
    if not text:
        return ""

    # 1. Replace known social & UI emojis with clean text equivalents
    for em, replacement in EMOJI_FALLBACKS.items():
        text = text.replace(em, replacement)

    # 2. Convert common punctuation & symbols to font-safe characters
    char_replacements = {
        '—': '-',
        '–': '-',
        '…': '...',
        '•': '•',
        '“': '"',
        '”': '"',
        '‘': "'",
        '’': "'",
        '™': '(TM)',
        '©': '(C)',
        '®': '(R)',
        '✓': '[✓]',
        '✔': '[✓]',
        '→': '->',
        '➔': '->',
        '←': '<-',
    }
    for old_c, new_c in char_replacements.items():
        text = text.replace(old_c, new_c)

    # 3. Strip any remaining unsupported high surrogate emojis (U+1F000 - U+1FFFF, etc.)
    result = []
    for ch in text:
        cp = ord(ch)
        if cp in (0x200B, 0x200C, 0x200D, 0xFEFF):  # zero-width spaces
            continue
        elif cp > 0xFFFF:  # Supplementary / Emoji plane not supported by TTF outline
            result.append(" ")
        else:
            result.append(ch)

    cleaned = "".join(result)
    cleaned = re.sub(r' {2,}', ' ', cleaned)
    return cleaned.strip()


def _format_paragraphs_for_reportlab(raw_text: str) -> List[str]:
    """Splits text into paragraphs and encodes HTML entities for ReportLab Paragraph."""
    cleaned = sanitize_pdf_text(raw_text)
    paragraphs = cleaned.split("\n\n")
    formatted = []
    for p in paragraphs:
        if not p.strip():
            continue
        # Convert single newlines inside paragraph to <br/>
        p_html = p.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        p_html = p_html.replace("\n", "<br/>")
        formatted.append(p_html)
    return formatted


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. PDF EXPORT (ReportLab with Embedded TrueType Font)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def _get_pdf_styles():
    _register_pdf_fonts()
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "PRISM_Title",
        fontName=PDF_FONT_BOLD,
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#15161A"),
        spaceAfter=3,
    )
    subtitle_style = ParagraphStyle(
        "PRISM_Subtitle",
        fontName=PDF_FONT_REGULAR,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#6C5CE7"),
        spaceAfter=10,
    )
    ch_heading_style = ParagraphStyle(
        "PRISM_ChHeading",
        fontName=PDF_FONT_BOLD,
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#6C5CE7"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "PRISM_Body",
        fontName=PDF_FONT_REGULAR,
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#2D3436"),
        spaceAfter=6,
    )
    timing_style = ParagraphStyle(
        "PRISM_Timing",
        fontName=PDF_FONT_BOLD,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0D9488"),
        spaceBefore=4,
        spaceAfter=6,
    )
    footer_style = ParagraphStyle(
        "PRISM_Footer",
        fontName=PDF_FONT_REGULAR,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#94A3B8"),
        spaceAfter=4,
    )
    return {
        "title": title_style,
        "subtitle": subtitle_style,
        "ch_heading": ch_heading_style,
        "body": body_style,
        "timing": timing_style,
        "footer": footer_style,
    }


def generate_pdf(platform: str, content: str, title: str = "PRISM Content Synthesis") -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45,
    )

    st = _get_pdf_styles()
    plat_name = PLATFORM_NAMES.get(platform, platform.replace("_", " ").title())
    timing = BEST_TIME_RECOMMENDATIONS.get(platform)

    story = []
    # Header
    story.append(Paragraph("PRISM — AI Content Repurposing", st["title"]))
    story.append(Paragraph(f"Channel: <b>{plat_name}</b> • Exported on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", st["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#6C5CE7"), spaceAfter=12))

    # Channel Title
    story.append(Paragraph(f"Platform Output: {plat_name}", st["ch_heading"]))

    # Content paragraphs
    paras = _format_paragraphs_for_reportlab(content)
    for p_html in paras:
        story.append(Paragraph(p_html, st["body"]))
        story.append(Spacer(1, 3))

    # Best Time to Post Recommendation
    if timing:
        story.append(Spacer(1, 6))
        timing_text = f"<b>Recommended Best Time to Post:</b> {timing['day']} at {timing['time']} ({timing['window']}) — <i>{timing['reason']}</i>"
        story.append(Paragraph(timing_text, st["timing"]))

    # Footer note
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=6))
    story.append(Paragraph("Synthesized with PRISM (Platform-aware Repurposing and Intelligent Synthesis Model)", st["footer"]))

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_all_pdf(channels: Dict[str, str], title: str = "PRISM Multi-Channel Synthesis") -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45,
    )

    st = _get_pdf_styles()
    story = []

    # Main Portfolio Header
    story.append(Paragraph("PRISM — Complete Multi-Channel Content Portfolio", st["title"]))
    story.append(Paragraph(f"Synthesized on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} • One source, seven channels.", st["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#6C5CE7"), spaceAfter=14))

    for key, text in channels.items():
        if not text or not text.strip():
            continue

        plat_name = PLATFORM_NAMES.get(key, key.replace("_", " ").title())
        timing = BEST_TIME_RECOMMENDATIONS.get(key)

        channel_elements = []
        channel_elements.append(Paragraph(f"{plat_name}", st["ch_heading"]))

        for p_html in _format_paragraphs_for_reportlab(text):
            channel_elements.append(Paragraph(p_html, st["body"]))
            channel_elements.append(Spacer(1, 2))

        if timing:
            timing_text = f"<b>Best Time to Post:</b> {timing['day']} at {timing['time']} ({timing['window']}) — {timing['reason']}"
            channel_elements.append(Paragraph(timing_text, st["timing"]))

        channel_elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceBefore=8, spaceAfter=8))
        story.append(KeepTogether(channel_elements))

    story.append(Spacer(1, 8))
    story.append(Paragraph("PRISM AI Repurposing Engine • Complete 7-Channel Portfolio", st["footer"]))

    doc.build(story)
    buffer.seek(0)
    return buffer


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. DOCX EXPORT (python-docx with Unicode support)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def generate_docx(platform: str, content: str, title: str = "PRISM Content Synthesis") -> io.BytesIO:
    doc = Document()
    p_name = PLATFORM_NAMES.get(platform, platform.replace("_", " ").title())
    timing = BEST_TIME_RECOMMENDATIONS.get(platform)

    title_p = doc.add_paragraph()
    t_run = title_p.add_run("PRISM — AI Content Repurposing")
    t_run.font.name = "Calibri"
    t_run.font.size = Pt(22)
    t_run.font.bold = True
    t_run.font.color.rgb = RGBColor(0x15, 0x16, 0x1A)

    sub_p = doc.add_paragraph()
    s_run = sub_p.add_run(f"Platform: {p_name} | Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}")
    s_run.font.name = "Calibri"
    s_run.font.size = Pt(10)
    s_run.font.color.rgb = RGBColor(0x6C, 0x5C, 0xE7)

    h = doc.add_heading(p_name, level=1)
    h.style.font.name = "Calibri"
    h.style.font.color.rgb = RGBColor(0x6C, 0x5C, 0xE7)

    for para in content.strip().split("\n\n"):
        p = doc.add_paragraph(para.strip())
        p.style.font.name = "Calibri"
        p.style.font.size = Pt(11)

    if timing:
        tp = doc.add_paragraph()
        tr = tp.add_run(f"Recommended Best Time to Post: {timing['day']} at {timing['time']} ({timing['window']}) — {timing['reason']}")
        tr.font.name = "Calibri"
        tr.font.size = Pt(10)
        tr.font.bold = True
        tr.font.color.rgb = RGBColor(0x0D, 0x94, 0x88)

    footer = doc.sections[0].footer
    footer_p = footer.paragraphs[0]
    footer_p.text = "PRISM — Platform-aware Repurposing and Intelligent Synthesis Model"
    footer_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


def generate_all_docx(channels: Dict[str, str], title: str = "PRISM Multi-Channel Synthesis") -> io.BytesIO:
    doc = Document()

    title_p = doc.add_paragraph()
    t_run = title_p.add_run("PRISM — Complete Multi-Channel Portfolio")
    t_run.font.name = "Calibri"
    t_run.font.size = Pt(24)
    t_run.font.bold = True
    t_run.font.color.rgb = RGBColor(0x15, 0x16, 0x1A)

    sub_p = doc.add_paragraph()
    s_run = sub_p.add_run(f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} • One source, seven channels.")
    s_run.font.name = "Calibri"
    s_run.font.size = Pt(10)
    s_run.font.color.rgb = RGBColor(0x6C, 0x5C, 0xE7)

    for key, text in channels.items():
        if not text or not text.strip():
            continue
        p_name = PLATFORM_NAMES.get(key, key.replace("_", " ").title())
        timing = BEST_TIME_RECOMMENDATIONS.get(key)

        h = doc.add_heading(p_name, level=1)
        h.style.font.name = "Calibri"
        h.style.font.color.rgb = RGBColor(0x6C, 0x5C, 0xE7)

        for para in text.strip().split("\n\n"):
            p = doc.add_paragraph(para.strip())
            p.style.font.name = "Calibri"
            p.style.font.size = Pt(11)

        if timing:
            tp = doc.add_paragraph()
            tr = tp.add_run(f"Best Time to Post: {timing['day']} at {timing['time']} ({timing['window']}) — {timing['reason']}")
            tr.font.name = "Calibri"
            tr.font.size = Pt(10)
            tr.font.bold = True
            tr.font.color.rgb = RGBColor(0x0D, 0x94, 0x88)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. TXT EXPORT (UTF-8 Plain Text)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def generate_txt(platform: str, content: str) -> io.BytesIO:
    p_name = PLATFORM_NAMES.get(platform, platform.replace("_", " ").title())
    timing = BEST_TIME_RECOMMENDATIONS.get(platform)
    divider = "=" * 65

    lines = [
        divider,
        f"PRISM — {p_name.upper()}",
        f"Exported: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        divider,
        "",
        content.strip(),
        "",
    ]
    if timing:
        lines.append("-" * 65)
        lines.append(f"RECOMMENDED BEST TIME TO POST: {timing['day']} at {timing['time']} ({timing['window']})")
        lines.append(f"Reason: {timing['reason']}")
        lines.append("-" * 65)

    lines.append(divider)
    lines.append("PRISM AI Content Repurposing Engine")
    lines.append(divider)

    buffer = io.BytesIO("\n".join(lines).encode("utf-8"))
    buffer.seek(0)
    return buffer


def generate_all_txt(channels: Dict[str, str]) -> io.BytesIO:
    divider = "=" * 70
    subdivider = "-" * 70
    out = [
        divider,
        "PRISM — COMPLETE 7-CHANNEL CONTENT SYNTHESIS",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "One source, seven channels.",
        divider,
        "",
    ]
    for key, text in channels.items():
        if not text or not text.strip():
            continue
        p_name = PLATFORM_NAMES.get(key, key.replace("_", " ").title())
        timing = BEST_TIME_RECOMMENDATIONS.get(key)

        out.append(f"\n{subdivider}")
        out.append(f"CHANNEL: {p_name.upper()}")
        out.append(subdivider)
        out.append(text.strip())
        out.append("")

        if timing:
            out.append(f"Best Time to Post: {timing['day']} at {timing['time']} ({timing['window']})")
            out.append(f"Strategy: {timing['reason']}")
            out.append("")

    out.append(divider)
    out.append("End of PRISM Portfolio")
    out.append(divider)

    buffer = io.BytesIO("\n".join(out).encode("utf-8"))
    buffer.seek(0)
    return buffer


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. PNG GRAPHIC CARD EXPORT (Pillow)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def generate_png_card(platform: str, content: str) -> io.BytesIO:
    p_name = PLATFORM_NAMES.get(platform, platform.replace("_", " ").title())
    timing = BEST_TIME_RECOMMENDATIONS.get(platform)
    width, height = 1200, 675

    img = Image.new("RGB", (width, height), color=(17, 24, 39))  # Dark sleek background
    draw = ImageDraw.Draw(img)

    # Accent top border
    draw.rectangle([(0, 0), (width, 8)], fill=(108, 92, 231))

    try:
        title_font = ImageFont.truetype("arialbd.ttf", 30)
        platform_font = ImageFont.truetype("arialbd.ttf", 20)
        body_font = ImageFont.truetype("arial.ttf", 19)
        timing_font = ImageFont.truetype("arialbd.ttf", 15)
        footer_font = ImageFont.truetype("arial.ttf", 13)
    except Exception:
        title_font = ImageFont.load_default()
        platform_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        timing_font = ImageFont.load_default()
        footer_font = ImageFont.load_default()

    # Header Brand & Channel Badge
    draw.text((60, 40), "PRISM", font=title_font, fill=(108, 92, 231))
    draw.text((180, 48), f"•  {p_name}", font=platform_font, fill=(243, 244, 246))

    # Wrap body text lines
    max_chars_per_line = 76
    lines = []
    paragraphs = content.strip().split("\n")
    for p in paragraphs:
        if not p.strip():
            lines.append("")
            continue
        words = p.split()
        cur_line = []
        for w in words:
            if len(" ".join(cur_line + [w])) <= max_chars_per_line:
                cur_line.append(w)
            else:
                lines.append(" ".join(cur_line))
                cur_line = [w]
        if cur_line:
            lines.append(" ".join(cur_line))

    # Render up to ~14 body lines
    y = 105
    for line in lines[:14]:
        draw.text((60, y), line, font=body_font, fill=(229, 231, 235))
        y += 26

    if len(lines) > 14:
        draw.text((60, y), "... [view full text in document download]", font=footer_font, fill=(148, 163, 184))

    # Best Time to Post Pill
    if timing:
        draw.rectangle([(60, height - 85), (width - 60, height - 52)], fill=(30, 41, 59), outline=(51, 65, 85))
        timing_str = f"Best Time to Post: {timing['day']} @ {timing['time']} ({timing['window']}) • {timing['reason']}"
        draw.text((75, height - 73), timing_str[:110], font=timing_font, fill=(45, 212, 191))

    # Footer
    draw.rectangle([(0, height - 42), (width, height)], fill=(15, 23, 42))
    draw.text((60, height - 30), "Synthesized via PRISM AI • One source, seven channels.", font=footer_font, fill=(148, 163, 184))
    draw.text((width - 220, height - 30), datetime.now().strftime("%Y-%m-%d"), font=footer_font, fill=(148, 163, 184))

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def generate_png_zip(channels: Dict[str, str]) -> io.BytesIO:
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for key, text in channels.items():
            if not text or not text.strip():
                continue
            card_buf = generate_png_card(key, text)
            p_name = key.replace("_", "-")
            zf.writestr(f"PRISM-{p_name}.png", card_buf.getvalue())

    zip_buffer.seek(0)
    return zip_buffer


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. PPTX PRESENTATION EXPORT (python-pptx)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def generate_pptx(platform: str, content: str) -> io.BytesIO:
    prs = Presentation()
    prs.slide_width = PptxInches(13.333)  # 16:9 widescreen
    prs.slide_height = PptxInches(7.5)

    p_name = PLATFORM_NAMES.get(platform, platform.replace("_", " ").title())
    timing = BEST_TIME_RECOMMENDATIONS.get(platform)
    blank_layout = prs.slide_layouts[6]

    # Title Slide
    title_slide = prs.slides.add_slide(blank_layout)
    tb = title_slide.shapes.add_textbox(PptxInches(1.0), PptxInches(2.2), PptxInches(11.3), PptxInches(2.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "PRISM Content Synthesis"
    p.font.name = "Calibri"
    p.font.size = PptxPt(44)
    p.font.bold = True
    p.font.color.rgb = PptxRGBColor(0x6C, 0x5C, 0xE7)

    p2 = tf.add_paragraph()
    p2.text = f"Channel: {p_name} • Generated on {datetime.now().strftime('%B %d, %Y')}"
    p2.font.size = PptxPt(20)
    p2.font.color.rgb = PptxRGBColor(0x64, 0x74, 0x8B)

    # Content Slide
    content_slide = prs.slides.add_slide(blank_layout)

    # Header
    h_box = content_slide.shapes.add_textbox(PptxInches(1.0), PptxInches(0.6), PptxInches(11.3), PptxInches(0.9))
    hp = h_box.text_frame.paragraphs[0]
    hp.text = p_name
    hp.font.bold = True
    hp.font.size = PptxPt(28)
    hp.font.color.rgb = PptxRGBColor(0x15, 0x16, 0x1A)

    # Body
    b_box = content_slide.shapes.add_textbox(PptxInches(1.0), PptxInches(1.6), PptxInches(11.3), PptxInches(4.6))
    btf = b_box.text_frame
    btf.word_wrap = True

    paras = content.strip().split("\n\n")
    for i, para in enumerate(paras[:6]):
        bp = btf.paragraphs[0] if i == 0 else btf.add_paragraph()
        bp.text = para.strip()
        bp.font.size = PptxPt(15)
        bp.space_after = PptxPt(8)
        bp.font.color.rgb = PptxRGBColor(0x33, 0x41, 0x55)

    # Timing Recommendation Footer
    if timing:
        t_box = content_slide.shapes.add_textbox(PptxInches(1.0), PptxInches(6.3), PptxInches(11.3), PptxInches(0.8))
        tp = t_box.text_frame.paragraphs[0]
        tp.text = f"Best Time to Post: {timing['day']} @ {timing['time']} ({timing['window']}) — {timing['reason']}"
        tp.font.size = PptxPt(12)
        tp.font.bold = True
        tp.font.color.rgb = PptxRGBColor(0x0D, 0x94, 0x88)

    buffer = io.BytesIO()
    prs.save(buffer)
    buffer.seek(0)
    return buffer


def generate_all_pptx(channels: Dict[str, str]) -> io.BytesIO:
    prs = Presentation()
    prs.slide_width = PptxInches(13.333)
    prs.slide_height = PptxInches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Title Slide
    title_slide = prs.slides.add_slide(blank_layout)
    tb = title_slide.shapes.add_textbox(PptxInches(1.0), PptxInches(2.2), PptxInches(11.3), PptxInches(2.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "PRISM — Multi-Channel Content Deck"
    p.font.name = "Calibri"
    p.font.size = PptxPt(42)
    p.font.bold = True
    p.font.color.rgb = PptxRGBColor(0x6C, 0x5C, 0xE7)

    p2 = tf.add_paragraph()
    p2.text = f"One source, seven channels • {datetime.now().strftime('%B %d, %Y')}"
    p2.font.size = PptxPt(18)
    p2.font.color.rgb = PptxRGBColor(0x64, 0x74, 0x8B)

    # Channel Slides
    for key, text in channels.items():
        if not text or not text.strip():
            continue
        p_name = PLATFORM_NAMES.get(key, key.replace("_", " ").title())
        timing = BEST_TIME_RECOMMENDATIONS.get(key)

        slide = prs.slides.add_slide(blank_layout)

        h_box = slide.shapes.add_textbox(PptxInches(1.0), PptxInches(0.6), PptxInches(11.3), PptxInches(0.9))
        hp = h_box.text_frame.paragraphs[0]
        hp.text = p_name
        hp.font.bold = True
        hp.font.size = PptxPt(26)
        hp.font.color.rgb = PptxRGBColor(0x6C, 0x5C, 0xE7)

        b_box = slide.shapes.add_textbox(PptxInches(1.0), PptxInches(1.6), PptxInches(11.3), PptxInches(4.6))
        btf = b_box.text_frame
        btf.word_wrap = True

        paras = text.strip().split("\n\n")
        for i, para in enumerate(paras[:6]):
            bp = btf.paragraphs[0] if i == 0 else btf.add_paragraph()
            bp.text = para.strip()
            bp.font.size = PptxPt(14)
            bp.space_after = PptxPt(8)
            bp.font.color.rgb = PptxRGBColor(0x33, 0x41, 0x55)

        if timing:
            t_box = slide.shapes.add_textbox(PptxInches(1.0), PptxInches(6.3), PptxInches(11.3), PptxInches(0.8))
            tp = t_box.text_frame.paragraphs[0]
            tp.text = f"Best Time to Post: {timing['day']} @ {timing['time']} ({timing['window']}) — {timing['reason']}"
            tp.font.size = PptxPt(12)
            tp.font.bold = True
            tp.font.color.rgb = PptxRGBColor(0x0D, 0x94, 0x88)

    buffer = io.BytesIO()
    prs.save(buffer)
    buffer.seek(0)
    return buffer


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DISPATCHERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def export_single_channel_file(platform: str, content: str, export_format: str) -> Tuple[io.BytesIO, str, str]:
    fmt = export_format.lower().strip()
    p_clean = PLATFORM_NAMES.get(platform, platform).replace(" ", "_").replace("/", "_")

    if fmt == "pdf":
        buf = generate_pdf(platform, content)
        return buf, f"PRISM_{p_clean}.pdf", "application/pdf"
    elif fmt == "docx":
        buf = generate_docx(platform, content)
        return buf, f"PRISM_{p_clean}.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif fmt == "txt":
        buf = generate_txt(platform, content)
        return buf, f"PRISM_{p_clean}.txt", "text/plain; charset=utf-8"
    elif fmt == "png":
        buf = generate_png_card(platform, content)
        return buf, f"PRISM_{p_clean}.png", "image/png"
    elif fmt == "pptx":
        buf = generate_pptx(platform, content)
        return buf, f"PRISM_{p_clean}.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    else:
        raise ValueError(f"Unsupported export format: {export_format}")


def export_all_channels_file(channels: Dict[str, str], export_format: str) -> Tuple[io.BytesIO, str, str]:
    fmt = export_format.lower().strip()

    if fmt == "pdf":
        buf = generate_all_pdf(channels)
        return buf, "PRISM_All_Channels.pdf", "application/pdf"
    elif fmt == "docx":
        buf = generate_all_docx(channels)
        return buf, "PRISM_All_Channels.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif fmt == "txt":
        buf = generate_all_txt(channels)
        return buf, "PRISM_All_Channels.txt", "text/plain; charset=utf-8"
    elif fmt == "png":
        buf = generate_png_zip(channels)
        return buf, "PRISM_All_Channels_Images.zip", "application/zip"
    elif fmt == "pptx":
        buf = generate_all_pptx(channels)
        return buf, "PRISM_All_Channels.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    else:
        raise ValueError(f"Unsupported export format: {export_format}")
