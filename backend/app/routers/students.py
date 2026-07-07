from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import get_session
from app.models.user import User, StudentSettings

router = APIRouter(prefix="/students", tags=["students"])


class SettingsBody(BaseModel):
    font_preference: str
    font_size: int
    overlay_color: str
    ruler_enabled: bool


@router.get("/me/settings")
def get_settings(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    s = session.get(StudentSettings, current_user.id)
    if not s:
        raise HTTPException(404, "Configuracoes nao encontradas")
    return s


@router.put("/me/settings")
def update_settings(
    body: SettingsBody,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    s = session.get(StudentSettings, current_user.id)
    if not s:
        s = StudentSettings(user_id=current_user.id)
        session.add(s)

    s.font_preference = body.font_preference
    s.font_size = body.font_size
    s.overlay_color = body.overlay_color
    s.ruler_enabled = body.ruler_enabled
    session.commit()
    session.refresh(s)
    return s
