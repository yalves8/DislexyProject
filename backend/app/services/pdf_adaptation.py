import ast
import json
import re
from typing import Any

from google import genai

from app.rag.retriever import build_rag_metadata, retrieve_accessibility_context
from app.rag.schemas import RetrievedContext


SYSTEM_PROMPT = """
Você é um assistente especializado em adaptação de conteúdo educacional para pessoas com dislexia.

Você receberá:
1. Um trecho real extraído de um PDF.
2. Contextos recuperados de uma base local de acessibilidade, dislexia e aprendizagem.

Sua tarefa é adaptar o conteúdo do PDF sem inventar informações.

Use o contexto RAG como orientação de forma, linguagem e organização do material.
Não trate o contexto RAG como conteúdo principal da aula.
O conteúdo principal deve vir do PDF.
O RAG serve para decidir como adaptar.

Regras:
- Preserve o significado original.
- Não invente conceitos que não aparecem no PDF.
- Use linguagem simples.
- Use frases curtas.
- Evite parágrafos longos.
- Divida o conteúdo em blocos.
- Crie resumo, cards, glossário, passo a passo, mapa conceitual, exemplos e quiz.
- Destaque palavras-chave.
- Explique termos difíceis.
- Se houver fórmulas, explique cada parte da fórmula.
- Quando houver sequência ou processo, organize em etapas.
- Quando houver relação entre conceitos, gere mapa conceitual.
- Responda em JSON válido.
"""

JSON_SHAPE = """
{
  "title": "Título adaptado do conteúdo",
  "summary": "Resumo curto em linguagem simples",
  "keyIdeas": [
    { "title": "Ideia principal", "description": "Explicação simples e curta" }
  ],
  "glossary": [
    { "term": "Termo difícil", "definition": "Definição em linguagem simples" }
  ],
  "stepByStep": [
    "Primeiro ponto importante",
    "Segundo ponto importante"
  ],
  "visualMap": "graph TD; A[Conceito central] --> B[Ideia relacionada]",
  "examples": [
    { "title": "Exemplo prático", "description": "Exemplo explicado de forma simples" }
  ],
  "formulas": [
    { "title": "Fórmula ou regra", "description": "Explicação simples" }
  ],
  "studyGuide": [
    "O que revisar primeiro",
    "Como praticar",
    "Como saber se entendeu"
  ],
  "quiz": [
    { "question": "Pergunta simples de revisão", "answer": "Resposta esperada" }
  ]
}
"""


def build_user_prompt(
    file_name: str,
    start_page: int,
    end_page: int,
    extracted_text: str,
    rag_context: list[RetrievedContext],
) -> str:
    context_text = "\n\n---\n\n".join(context.to_prompt_text() for context in rag_context)
    return f"""
Arquivo: {file_name}
Páginas: {start_page} até {end_page}

Texto extraído do PDF:
{extracted_text[:18000]}

Contexto recuperado da base RAG:
{context_text}

Gere a adaptação exatamente neste formato JSON:
{JSON_SHAPE}
"""


def extract_json_object(text: str) -> dict[str, Any]:
    clean = text.strip()
    # Strip common markdown code fences (```json, ```python, ```)
    clean = re.sub(r"^```[a-zA-Z]*\n?", "", clean).strip()
    clean = re.sub(r"```$", "", clean).strip()

    try:
        parsed = json.loads(clean)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = clean.find("{")
    end = clean.rfind("}")
    if start >= 0 and end > start:
        candidate = clean[start : end + 1]
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
        # Fallback: Gemini às vezes retorna Python dict literal com aspas simples
        try:
            parsed = ast.literal_eval(candidate)
            if isinstance(parsed, dict):
                return parsed
        except (ValueError, SyntaxError):
            pass

    raise ValueError("Resposta da IA não está em JSON válido")


def _text(value: Any, fallback: str) -> str:
    return str(value).strip() if value else fallback


def _cards(value: Any, fallback: list[dict[str, str]]) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return fallback

    cards: list[dict[str, str]] = []
    for item in value[:6]:
        if isinstance(item, dict):
            cards.append(
                {
                    "title": _text(item.get("title") or item.get("term"), "Ideia importante"),
                    "description": _text(item.get("description") or item.get("definition"), "Revise este ponto com atenção."),
                }
            )
        elif item:
            cards.append({"title": "Ponto importante", "description": str(item).strip()})
    return cards or fallback


def _glossary(value: Any, fallback: list[dict[str, str]]) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return fallback

    items: list[dict[str, str]] = []
    for item in value[:8]:
        if isinstance(item, dict):
            items.append(
                {
                    "term": _text(item.get("term") or item.get("title"), "Termo importante"),
                    "definition": _text(item.get("definition") or item.get("description"), "Definição simples."),
                }
            )
    return items or fallback


def _string_list(value: Any, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return fallback

    items: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            items.append(item.strip())
        elif isinstance(item, dict):
            # Gemini às vezes retorna dicts em vez de strings nos campos de lista
            title = str(item.get("title") or item.get("step") or item.get("name") or "").strip()
            desc = str(item.get("description") or item.get("content") or "").strip()
            sub = item.get("steps") or item.get("items") or item.get("substeps")
            if isinstance(sub, list):
                if title:
                    items.append(title)
                for s in sub:
                    if isinstance(s, str) and s.strip():
                        items.append(s.strip())
            elif title and desc:
                items.append(f"{title}: {desc}")
            elif title:
                items.append(title)
            elif desc:
                items.append(desc)

    return items[:8] if items else fallback


def _quiz(value: Any, fallback: list[dict[str, str]]) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return fallback

    items: list[dict[str, str]] = []
    for item in value[:5]:
        if isinstance(item, dict):
            items.append(
                {
                    "question": _text(item.get("question"), "O que você entendeu deste trecho?"),
                    "answer": _text(item.get("answer"), "Explique com suas palavras."),
                }
            )
    return items or fallback


def normalize_material(raw: dict[str, Any], fallback: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": _text(raw.get("title"), fallback["title"]),
        "summary": _text(raw.get("summary"), fallback["summary"]),
        "keyIdeas": _cards(raw.get("keyIdeas"), fallback["keyIdeas"]),
        "glossary": _glossary(raw.get("glossary"), fallback["glossary"]),
        "stepByStep": _string_list(raw.get("stepByStep") or raw.get("steps"), fallback["stepByStep"]),
        "visualMap": _text(raw.get("visualMap") or raw.get("conceptMap"), fallback["visualMap"]),
        "examples": _cards(raw.get("examples"), fallback["examples"]),
        "formulas": _cards(raw.get("formulas"), fallback["formulas"]),
        "studyGuide": _string_list(raw.get("studyGuide"), fallback["studyGuide"]),
        "quiz": _quiz(raw.get("quiz"), fallback["quiz"]),
    }


def split_sentences(text: str) -> list[str]:
    clean = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=[.!?])\s+", clean)
    return [sentence.strip() for sentence in sentences if len(sentence.strip()) > 20]


def fallback_adaptation(file_name: str, start_page: int, end_page: int, extracted_text: str) -> dict[str, Any]:
    sentences = split_sentences(extracted_text)
    first = sentences[0] if sentences else "O trecho selecionado foi extraído do PDF e precisa ser estudado em partes pequenas."
    second = sentences[1] if len(sentences) > 1 else "Marque os conceitos principais e revise com exemplos."
    third = sentences[2] if len(sentences) > 2 else "Use o quiz para verificar se entendeu."

    return {
        "title": f"Guia de estudo: páginas {start_page}-{end_page}",
        "summary": first[:360],
        "keyIdeas": [
            {"title": "Ideia central", "description": first[:240]},
            {"title": "Ponto de apoio", "description": second[:240]},
            {"title": "Como revisar", "description": third[:240]},
        ],
        "glossary": [
            {
                "term": "Trecho selecionado",
                "definition": "Parte do PDF escolhida para estudar agora.",
            },
            {
                "term": "Ideia principal",
                "definition": "O ponto mais importante para entender antes dos detalhes.",
            },
            {
                "term": "Revisão",
                "definition": "Momento de conferir se você consegue explicar com suas palavras.",
            },
        ],
        "stepByStep": [
            "Leia o resumo primeiro.",
            "Revise cada card de ideia principal.",
            "Marque palavras que parecem difíceis.",
            "Explique o trecho em voz alta, com frases curtas.",
            "Responda ao quiz sem olhar as respostas.",
        ],
        "visualMap": f"graph TD; A[{file_name[:28]}] --> B[Páginas {start_page}-{end_page}]; B --> C[Ideias principais]; C --> D[Revisão]",
        "examples": [
            {
                "title": "Exemplo de uso",
                "description": "Escolha uma ideia do trecho e escreva uma frase simples explicando o que ela significa.",
            },
            {
                "title": "Exemplo de revisão",
                "description": "Cubra o texto e tente lembrar os três pontos mais importantes.",
            },
        ],
        "formulas": [
            {
                "title": "Fórmulas ou regras",
                "description": "Se houver fórmula no trecho, copie uma por vez e escreva o significado de cada parte.",
            }
        ],
        "studyGuide": [
            "Comece pelo resumo.",
            "Depois leia os cards.",
            "Por fim, pratique com perguntas curtas.",
        ],
        "quiz": [
            {
                "question": "Qual é a ideia mais importante destas páginas?",
                "answer": "Responda com uma frase curta usando suas palavras.",
            },
            {
                "question": "Que palavra ou conceito ainda parece difícil?",
                "answer": "Anote o termo e procure uma explicação simples.",
            },
        ],
    }


def adapt_pdf_content_with_ai(
    file_name: str,
    start_page: int,
    end_page: int,
    extracted_text: str,
    api_key: str | None,
    top_k: int = 5,
) -> tuple[dict[str, Any], dict[str, Any], str, str | None]:
    fallback = fallback_adaptation(file_name, start_page, end_page, extracted_text)
    rag_context = retrieve_accessibility_context(extracted_text, top_k=top_k)
    rag_metadata = build_rag_metadata(rag_context, top_k=top_k)

    if not api_key:
        return fallback, rag_metadata, "fallback", "GEMINI_API_KEY não configurada."

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                SYSTEM_PROMPT,
                build_user_prompt(file_name, start_page, end_page, extracted_text, rag_context),
            ],
        )
        raw_json = extract_json_object(response.text or "")
        return normalize_material(raw_json, fallback), rag_metadata, "ai_real", None
    except Exception as exc:
        return fallback, rag_metadata, "fallback", f"Falha ao adaptar com IA: {exc.__class__.__name__}"
