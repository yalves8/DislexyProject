from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: str = Field(default="user")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StudentSettings(SQLModel, table=True):
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    font_preference: str = Field(default="OpenDyslexic")
    font_size: int = Field(default=18)
    overlay_color: str = Field(default="#FFF3CD")
    ruler_enabled: bool = Field(default=True)
