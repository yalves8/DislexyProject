from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class Activity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="user.id", index=True)
    original_text: str
    adapted_text: str
    image_path: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
