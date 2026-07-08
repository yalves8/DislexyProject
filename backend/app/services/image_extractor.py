import io
import os
from pathlib import Path

from google import genai
from PIL import Image

IMAGE_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".tif"})

EXTRACT_TEXT_PROMPT = (
    "Transcreva todo o texto visível nesta imagem, mantendo a ordem de leitura natural. "
    "Retorne apenas o texto transcrito, sem comentários ou explicações adicionais."
)


def is_image_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in IMAGE_EXTENSIONS


def extract_text_from_image(image_bytes: bytes) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return ""
    client = genai.Client(api_key=api_key)
    img = Image.open(io.BytesIO(image_bytes))
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[EXTRACT_TEXT_PROMPT, img],
    )
    return response.text.strip() if response.text else ""
