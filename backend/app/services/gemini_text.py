import google.generativeai as genai

SIMPLIFY_PROMPT = """
Você é um assistente educacional para crianças com dislexia de 10 anos.

Reescreva o texto abaixo para facilitar a leitura.

Regras:
- Use frases curtas.
- Use palavras simples.
- Explique ideias difíceis com calma.
- Organize em parágrafos curtos ou tópicos.
- Mantenha as informações importantes.
- Não invente fatos novos.
- Use um tom gentil e encorajador.

Texto:
{text}
"""


def simplify_text(text: str, api_key: str) -> str:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-3-flash-preview")
    response = model.generate_content(SIMPLIFY_PROMPT.format(text=text))
    return response.text.strip()
