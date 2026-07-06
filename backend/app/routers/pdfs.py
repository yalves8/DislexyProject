import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.auth import get_current_user
from app.models.user import User
from app.models.pdf_document import PDFDocument
from app.services.pdf_extractor import extract_text_from_pdf, extract_text_from_pdf_range, get_pdf_page_count
from app.services.pdf_adaptation import adapt_pdf_content_with_ai

router = APIRouter(prefix="/pdfs", tags=["pdfs"])

API_KEY = os.getenv("GEMINI_API_KEY", "")
if not API_KEY:
    import warnings
    warnings.warn("GEMINI_API_KEY não configurada — uploads de PDF falharão")


OCR_MESSAGE = (
    "Este PDF parece ser escaneado ou baseado em imagem. Para adaptar este conteúdo, "
    "será necessário aplicar OCR. Esta funcionalidade pode entrar como próxima evolução do projeto."
)


class PageInfoResponse(BaseModel):
    file_name: str
    page_count: int


class ExtractSelectionResponse(BaseModel):
    file_name: str
    page_count: int
    start_page: int
    end_page: int
    extracted_text: str


class AdaptSelectionBody(BaseModel):
    file_name: str
    start_page: int
    end_page: int
    extracted_text: str


class AdaptSelectionResponse(BaseModel):
    adaptation: dict
    rag: dict
    mode: str
    notice: str | None = None


def ensure_pdf(file: UploadFile) -> None:
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Escolha um arquivo PDF para continuar.")


@router.post("/page-info", response_model=PageInfoResponse)
def page_info(file: UploadFile = File(...)):
    ensure_pdf(file)

    try:
        pdf_bytes = file.file.read()
        page_count = get_pdf_page_count(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Não consegui ler as informações do PDF.") from exc

    if page_count < 1:
        raise HTTPException(status_code=422, detail="Este PDF não possui páginas legíveis.")

    return PageInfoResponse(file_name=file.filename or "documento.pdf", page_count=page_count)


@router.post("/extract-selection", response_model=ExtractSelectionResponse)
def extract_selection(
    file: UploadFile = File(...),
    start_page: int = Form(...),
    end_page: int = Form(...),
):
    ensure_pdf(file)

    try:
        pdf_bytes = file.file.read()
        extracted_text, page_count = extract_text_from_pdf_range(pdf_bytes, start_page, end_page)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Não consegui extrair o texto do PDF.") from exc

    if not extracted_text.strip():
        raise HTTPException(status_code=422, detail=OCR_MESSAGE)

    return ExtractSelectionResponse(
        file_name=file.filename or "documento.pdf",
        page_count=page_count,
        start_page=start_page,
        end_page=end_page,
        extracted_text=extracted_text,
    )


@router.post("/adapt-selection", response_model=AdaptSelectionResponse)
def adapt_selection(body: AdaptSelectionBody):
    extracted_text = body.extracted_text.strip()
    if not extracted_text:
        raise HTTPException(status_code=422, detail=OCR_MESSAGE)

    adaptation, rag, mode, notice = adapt_pdf_content_with_ai(
        file_name=body.file_name,
        start_page=body.start_page,
        end_page=body.end_page,
        extracted_text=extracted_text,
        api_key=os.getenv("GEMINI_API_KEY"),
    )

    return AdaptSelectionResponse(adaptation=adaptation, rag=rag, mode=mode, notice=notice)


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
        from app.services.gemini_vision import adapt_text

        adapted_text = adapt_text(original_text, API_KEY)
    except Exception:
        adapted_text = original_text  # fallback: usa texto original se Gemini indisponível

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
