import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from app.database import get_session
from app.auth import get_current_user
from app.models.user import User
from app.models.pdf_document import PDFDocument
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.gemini_vision import adapt_text

router = APIRouter(prefix="/pdfs", tags=["pdfs"])

API_KEY = os.getenv("GEMINI_API_KEY", "")
if not API_KEY:
    import warnings
    warnings.warn("GEMINI_API_KEY não configurada — uploads de PDF falharão")


@router.post("/upload", response_model=PDFDocument)
def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Arquivo deve ser um PDF")

    pdf_bytes = file.file.read()
    original_text, page_count = extract_text_from_pdf(pdf_bytes)

    if not original_text.strip():
        raise HTTPException(status_code=422, detail="Não foi possível extrair texto do PDF")

    try:
        adapted_text = adapt_text(original_text, API_KEY)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Falha ao adaptar texto: {exc}") from exc

    doc = PDFDocument(
        user_id=current_user.id,
        filename=file.filename,
        original_text=original_text,
        adapted_text=adapted_text,
        page_count=page_count,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return doc


@router.get("", response_model=List[PDFDocument])
def list_pdfs(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    docs = session.exec(
        select(PDFDocument)
        .where(PDFDocument.user_id == current_user.id)
        .order_by(PDFDocument.created_at.desc())
    ).all()
    return docs


@router.get("/{doc_id}", response_model=PDFDocument)
def get_pdf(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doc = session.get(PDFDocument, doc_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="PDF não encontrado")
    return doc


@router.delete("/{doc_id}")
def delete_pdf(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    doc = session.get(PDFDocument, doc_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="PDF não encontrado")
    session.delete(doc)
    session.commit()
    return {"ok": True}
