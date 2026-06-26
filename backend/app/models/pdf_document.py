from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class PDFDocument(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    filename: str
    original_text: str
    adapted_text: str
    page_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
