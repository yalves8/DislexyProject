import google.generativeai as genai
import io
from PIL import Image

ADAPT_PROMPT = """
Você é um assistente educacional para crianças com dislexia de 10 anos.
Analise esta imagem de material escolar e faça duas coisas:

1. Extraia o texto/enunciado presente na imagem.
2. Reescreva de forma acessível para uma criança com dislexia:
   - Frases curtas (máximo 12 palavras cada)
   - Palavras simples e do dia a dia
   - Organize em tópicos com bullet points
   - Destaque as palavras mais importantes em negrito

Formato obrigatório da resposta:
**Texto Original:**
[texto extraído da imagem]

**Versão Adaptada:**
[texto reescrito]
"""

def adapt_image(image_bytes: bytes, api_key: str) -> str:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")
    img = Image.open(io.BytesIO(image_bytes))
    response = model.generate_content([ADAPT_PROMPT, img])
    return response.text

TEXT_ADAPT_PROMPT = """Você é um assistente para pessoas com dislexia.
Reescreva o texto a seguir de forma acessível:
- Frases curtas (máximo 12 palavras cada)
- Palavras simples e do dia a dia
- Organize em tópicos com bullet points quando aplicável
- Preserve o sentido original

**Texto Original:**
{text}

**Versão Adaptada:**
"""

def adapt_text(text: str, api_key: str) -> str:
    """Adapta texto puro para leitura por pessoas com dislexia."""
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(TEXT_ADAPT_PROMPT.format(text=text))
    return response.text

def parse_result(text: str) -> tuple[str, str]:
    # Separa "Texto Original" de "Versão Adaptada" usando os marcadores do prompt
    original = ""
    adapted = ""
    if "**Versão Adaptada:**" in text:
        parts = text.split("**Versão Adaptada:**", 1)
        adapted = parts[1].strip()
        if "**Texto Original:**" in parts[0]:
            original = parts[0].split("**Texto Original:**", 1)[1].strip()
        else:
            original = parts[0].strip()
    else:
        adapted = text.strip()
    return original, adapted
