from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from .database import Base

class ContentInput(Base):
    __tablename__ = "content_inputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String)
    raw_text = Column(Text)
    source_url = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())