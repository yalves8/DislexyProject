from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class PDFDocument(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    filename: str
    original_text: str = Field(default="")
    adapted_text: str = Field(default="")
    page_count: int = Field(default=0)
    start_page: Optional[int] = Field(default=None)
    end_page: Optional[int] = Field(default=None)
    adaptation_json: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
