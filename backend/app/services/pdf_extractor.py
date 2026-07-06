import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        pages = len(doc)
        text = "\n\n".join(page.get_text() for page in doc)
        return text.strip(), pages
    finally:
        doc.close()


def get_pdf_page_count(pdf_bytes: bytes) -> int:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        return len(doc)
    finally:
        doc.close()


def extract_text_from_pdf_range(pdf_bytes: bytes, start_page: int, end_page: int) -> tuple[str, int]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        page_count = len(doc)

        if page_count < 1:
            return "", 0

        if start_page < 1 or end_page < start_page or end_page > page_count:
            raise ValueError("Intervalo de páginas inválido")

        text = "\n\n".join(doc[index].get_text("text") for index in range(start_page - 1, end_page))
        return text.strip(), page_count
    finally:
        doc.close()
