import json
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.auth import get_current_user
from app.models.user import User
from app.models.pdf_document import PDFDocument
from app.services.pdf_extractor import extract_text_from_pdf, extract_text_from_pdf_range, extract_text_from_pdf_pages, get_pdf_page_count
from app.services.pdf_adaptation import adapt_pdf_content_with_ai
from app.services.image_extractor import is_image_file, extract_text_from_image

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


class SaveAdaptationBody(BaseModel):
    filename: str
    start_page: int
    end_page: int
    adaptation: dict


def ensure_supported_file(file: UploadFile) -> None:
    filename = file.filename or ""
    lower = filename.lower()
    if not lower.endswith(".pdf") and not is_image_file(lower):
        raise HTTPException(status_code=400, detail="Envie um arquivo PDF ou imagem (JPG, PNG, WEBP, etc.) para continuar.")


@router.post("/page-info", response_model=PageInfoResponse)
def page_info(file: UploadFile = File(...)):
    ensure_supported_file(file)
    filename = file.filename or "arquivo"

    if is_image_file(filename):
        return PageInfoResponse(file_name=filename, page_count=1)

    try:
        pdf_bytes = file.file.read()
        page_count = get_pdf_page_count(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Não consegui ler as informações do PDF.") from exc

    if page_count < 1:
        raise HTTPException(status_code=422, detail="Este PDF não possui páginas legíveis.")

    return PageInfoResponse(file_name=filename, page_count=page_count)


@router.post("/extract-selection", response_model=ExtractSelectionResponse)
def extract_selection(
    file: UploadFile = File(...),
    start_page: int = Form(default=1),
    end_page: int = Form(default=1),
    pages: str = Form(default=""),  # comma-separated, e.g. "1,3,5-7,10"
):
    ensure_supported_file(file)
    filename = file.filename or "arquivo"

    if is_image_file(filename):
        try:
            image_bytes = file.file.read()
            extracted_text = extract_text_from_image(image_bytes)
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Não consegui extrair o texto da imagem.") from exc

        if not extracted_text.strip():
            raise HTTPException(status_code=422, detail="Não encontrei texto legível nesta imagem.")

        return ExtractSelectionResponse(
            file_name=filename,
            page_count=1,
            start_page=1,
            end_page=1,
            extracted_text=extracted_text,
        )

    try:
        pdf_bytes = file.file.read()

        if pages.strip():
            page_list = _parse_pages_param(pages)
            if len(page_list) > 10:
                raise HTTPException(status_code=400, detail="Máximo de 10 páginas por adaptação.")
            extracted_text, page_count = extract_text_from_pdf_pages(pdf_bytes, page_list)
            start_page = min(page_list)
            end_page = max(page_list)
        else:
            extracted_text, page_count = extract_text_from_pdf_range(pdf_bytes, start_page, end_page)

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Não consegui extrair o texto do PDF.") from exc

    if not extracted_text.strip():
        raise HTTPException(status_code=422, detail=OCR_MESSAGE)

    return ExtractSelectionResponse(
        file_name=filename,
        page_count=page_count,
        start_page=start_page,
        end_page=end_page,
        extracted_text=extracted_text,
    )


def _parse_pages_param(raw: str) -> list[int]:
    pages: set[int] = set()
    for part in raw.split(","):
        part = part.strip()
        if "-" in part:
            bounds = part.split("-", 1)
            try:
                a, b = int(bounds[0]), int(bounds[1])
                pages.update(range(min(a, b), max(a, b) + 1))
            except ValueError:
                pass
        elif part.isdigit():
            pages.add(int(part))
    return sorted(pages)


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


MAX_SAVED_ADAPTATIONS = 5
MAX_PAGES_PER_ADAPTATION = 10


@router.post("/save-adaptation", response_model=PDFDocument)
def save_adaptation(
    body: SaveAdaptationBody,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    page_count = body.end_page - body.start_page + 1
    if body.start_page < 1 or body.end_page < body.start_page:
        raise HTTPException(status_code=400, detail="Intervalo de páginas inválido.")
    if page_count > MAX_PAGES_PER_ADAPTATION:
        raise HTTPException(
            status_code=400,
            detail=f"Você pode salvar adaptações de até {MAX_PAGES_PER_ADAPTATION} páginas por vez.",
        )

    existing = session.exec(
        select(PDFDocument).where(PDFDocument.user_id == current_user.id)
    ).all()
    if len(existing) >= MAX_SAVED_ADAPTATIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Você atingiu o limite de {MAX_SAVED_ADAPTATIONS} adaptações salvas. "
            "Exclua uma adaptação antiga para salvar uma nova.",
        )

    doc = PDFDocument(
        user_id=current_user.id,
        filename=body.filename,
        start_page=body.start_page,
        end_page=body.end_page,
        page_count=page_count,
        adaptation_json=json.dumps(body.adaptation, ensure_ascii=False),
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return doc


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
