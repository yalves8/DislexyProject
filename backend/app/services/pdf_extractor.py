import fitz  # PyMuPDF

def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        pages = len(doc)
        text = "\n\n".join(page.get_text() for page in doc)
        return text.strip(), pages
    finally:
        doc.close()
