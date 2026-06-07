import io
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from pydantic import BaseModel

from app.auth import require_role
from app.database import get_session
from app.models.user import User, StudentSettings
from app.models.activity import Activity
from app.services.gemini_vision import adapt_image, parse_result
from app.services.rag import build_query_engine, ask

router = APIRouter(prefix="/students", tags=["students"])

_student = require_role("student")


# ── Configurações de leitura ──────────────────────────────────────────────────

class SettingsBody(BaseModel):
    font_preference: str
    font_size: int
    overlay_color: str
    ruler_enabled: bool


@router.get("/me/settings")
def get_settings(
    current_user: User = Depends(_student),
    session: Session = Depends(get_session),
):
    s = session.get(StudentSettings, current_user.id)
    if not s:
        raise HTTPException(404, "Configuracoes nao encontradas")
    return s


@router.put("/me/settings")
def update_settings(
    body: SettingsBody,
    current_user: User = Depends(_student),
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


# ── Adaptação de imagem ───────────────────────────────────────────────────────

@router.post("/adapt-image")
async def adapt(
    file: UploadFile = File(...),
    current_user: User = Depends(_student),
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(500, "GEMINI_API_KEY nao configurada")

    content = await file.read()
    raw = adapt_image(content, api_key)
    original, adapted = parse_result(raw)
    return {"original": original, "adapted": adapted, "raw": raw}


# ── Tutor RAG ─────────────────────────────────────────────────────────────────

class AskBody(BaseModel):
    context: str
    question: str


@router.post("/ask")
def ask_tutor(
    body: AskBody,
    current_user: User = Depends(_student),
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(500, "GEMINI_API_KEY nao configurada")

    engine = build_query_engine(body.context, api_key)
    answer = ask(engine, body.question)
    return {"answer": answer}


# ── Atividades ────────────────────────────────────────────────────────────────

class ActivityBody(BaseModel):
    original_text: str
    adapted_text: str
    image_path: str | None = None


@router.post("/activities", status_code=201)
def save_activity(
    body: ActivityBody,
    current_user: User = Depends(_student),
    session: Session = Depends(get_session),
):
    activity = Activity(
        student_id=current_user.id,
        original_text=body.original_text,
        adapted_text=body.adapted_text,
        image_path=body.image_path,
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


@router.get("/activities")
def list_activities(
    current_user: User = Depends(_student),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(Activity).where(Activity.student_id == current_user.id).order_by(Activity.created_at.desc())
    ).all()
