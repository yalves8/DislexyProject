from __future__ import annotations

import math
import re
from collections import Counter
from functools import lru_cache
from pathlib import Path

from app.rag.schemas import KnowledgeChunk, RetrievedContext


KNOWLEDGE_BASE_DIR = Path(__file__).parent / "knowledge_base"
RETRIEVER_NAME = "local-keyword"
STOPWORDS = {
    "a",
    "as",
    "ao",
    "aos",
    "com",
    "como",
    "da",
    "das",
    "de",
    "do",
    "dos",
    "e",
    "em",
    "entre",
    "essa",
    "esse",
    "esta",
    "este",
    "o",
    "os",
    "ou",
    "para",
    "por",
    "que",
    "se",
    "sem",
    "ser",
    "um",
    "uma",
}


def tokenize(text: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[a-zA-ZÀ-ÿ0-9]{3,}", text.lower())
        if token not in STOPWORDS
    ]


def parse_markdown_with_frontmatter(path: Path) -> tuple[dict[str, str], str]:
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        return {}, raw.strip()

    _, frontmatter, body = raw.split("---", 2)
    metadata: dict[str, str] = {}
    for line in frontmatter.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip()

    return metadata, body.strip()


def split_into_chunks(content: str, max_words: int = 130) -> list[str]:
    blocks = [block.strip() for block in re.split(r"\n\s*\n", content) if block.strip()]
    chunks: list[str] = []
    current: list[str] = []
    current_count = 0

    for block in blocks:
        words = block.split()
        if current and current_count + len(words) > max_words:
            chunks.append("\n\n".join(current))
            current = []
            current_count = 0

        current.append(block)
        current_count += len(words)

    if current:
        chunks.append("\n\n".join(current))

    return chunks


@lru_cache(maxsize=1)
def load_knowledge_chunks() -> tuple[KnowledgeChunk, ...]:
    chunks: list[KnowledgeChunk] = []

    for path in sorted(KNOWLEDGE_BASE_DIR.glob("*.md")):
        metadata, content = parse_markdown_with_frontmatter(path)
        title = metadata.get("title", path.stem.replace("_", " ").title())
        source_type = metadata.get("source_type", "guideline")
        topic = metadata.get("topic", "")
        doc_id = metadata.get("id", path.stem)

        for index, chunk in enumerate(split_into_chunks(content), start=1):
            chunks.append(
                KnowledgeChunk(
                    id=f"{doc_id}#{index}",
                    title=title,
                    source=path.name,
                    source_type=source_type,
                    topic=topic,
                    content=chunk,
                )
            )

    return tuple(chunks)


def cosine_score(query_tokens: list[str], chunk_tokens: list[str]) -> float:
    if not query_tokens or not chunk_tokens:
        return 0.0

    query_counts = Counter(query_tokens)
    chunk_counts = Counter(chunk_tokens)
    shared = set(query_counts) & set(chunk_counts)
    dot = sum(query_counts[token] * chunk_counts[token] for token in shared)
    query_norm = math.sqrt(sum(value * value for value in query_counts.values()))
    chunk_norm = math.sqrt(sum(value * value for value in chunk_counts.values()))

    if query_norm == 0 or chunk_norm == 0:
        return 0.0

    return dot / (query_norm * chunk_norm)


def retrieve_accessibility_context(query: str, top_k: int = 5) -> list[RetrievedContext]:
    query_tokens = tokenize(query)
    scored: list[RetrievedContext] = []

    for chunk in load_knowledge_chunks():
        chunk_text = f"{chunk.title} {chunk.topic} {chunk.content}"
        score = cosine_score(query_tokens, tokenize(chunk_text))
        scored.append(
            RetrievedContext(
                id=chunk.id,
                title=chunk.title,
                source=chunk.source,
                score=score,
                content=chunk.content,
            )
        )

    scored.sort(key=lambda item: item.score, reverse=True)
    top = scored[:top_k]

    if all(item.score == 0 for item in top):
        return top

    return [item for item in top if item.score > 0][:top_k]


def build_rag_metadata(contexts: list[RetrievedContext], top_k: int) -> dict:
    return {
        "enabled": True,
        "retriever": RETRIEVER_NAME,
        "topK": top_k,
        "contexts": [context.to_api_dict() for context in contexts],
    }
