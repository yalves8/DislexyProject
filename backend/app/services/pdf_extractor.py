import fitz  # PyMuPDF

def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    """Extrai texto e contagem de páginas de um PDF em bytes."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = len(doc)
    text = "\n\n".join(page.get_text() for page in doc)
    doc.close()
    return text.strip(), pages
