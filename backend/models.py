from sqlalchemy import Column, String, Text, TIMESTAMP, ForeignKey, Integer, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base


def _gen_uuid():
    return str(uuid.uuid4())


class ContentInput(Base):
    __tablename__ = "content_inputs"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    type = Column(String(50))  # text, pdf, youtube
    raw_text = Column(Text)
    source_url = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    dna = relationship("ContentDNA", back_populates="content_input", cascade="all, delete-orphan", uselist=False)
    outputs = relationship("PlatformOutput", back_populates="content_input", cascade="all, delete-orphan")


class ContentDNA(Base):
    __tablename__ = "content_dna"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    input_id = Column(String(36), ForeignKey("content_inputs.id", ondelete="CASCADE"), nullable=False)
    top_insights = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    content_input = relationship("ContentInput", back_populates="dna")


class PlatformOutput(Base):
    __tablename__ = "platform_outputs"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    input_id = Column(String(36), ForeignKey("content_inputs.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)  # summary, linkedin, twitter, instagram, youtube, email, blog
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    content_input = relationship("ContentInput", back_populates="outputs")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    input_id = Column(String(36), ForeignKey("content_inputs.id", ondelete="CASCADE"), nullable=True)
    platform = Column(String(50), nullable=False)  # twitter, linkedin, etc.
    content = Column(Text, nullable=False)
    scheduled_time = Column(String(50), nullable=False)  # ISO string or timestamp
    timezone = Column(String(50), default="UTC")
    status = Column(String(30), default="scheduled")  # scheduled, published, cancelled
    created_at = Column(TIMESTAMP, server_default=func.now())


class ContentMetadata(Base):
    __tablename__ = "content_metadata"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    input_id = Column(String(36), ForeignKey("content_inputs.id", ondelete="CASCADE"), nullable=False)
    meta_key = Column(String(50), nullable=False)  # seo, image_prompt, quality_score, translation
    meta_value = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id = Column(String(36), primary_key=True, default=_gen_uuid)  # job_id
    input_id = Column(String(36), ForeignKey("content_inputs.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), default="Pending")  # Pending, Processing, Partially Completed, Completed, Failed
    progress = Column(Integer, default=0)
    total_channels = Column(Integer, default=7)
    completed_channels = Column(Integer, default=0)
    tone = Column(String(50), default="Professional")
    target_audience = Column(String(100), nullable=True)
    language = Column(String(50), default="English")
    error = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    completed_at = Column(TIMESTAMP, nullable=True)

    channel_results = relationship("JobChannelResult", back_populates="job", cascade="all, delete-orphan", lazy="joined")


class JobChannelResult(Base):
    __tablename__ = "job_channel_results"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    job_id = Column(String(36), ForeignKey("generation_jobs.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)
    generated_content = Column(Text, nullable=True)
    status = Column(String(30), default="Pending")  # Pending, Processing, Completed, Failed
    response_time = Column(Float, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    job = relationship("GenerationJob", back_populates="channel_results")
