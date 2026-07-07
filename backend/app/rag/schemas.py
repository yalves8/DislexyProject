from dataclasses import dataclass


@dataclass(frozen=True)
class KnowledgeChunk:
    id: str
    title: str
    source: str
    source_type: str
    topic: str
    content: str


@dataclass(frozen=True)
class RetrievedContext:
    id: str
    title: str
    source: str
    score: float
    content: str

    def to_prompt_text(self) -> str:
        return (
            f"Fonte: {self.title} ({self.source})\n"
            f"Score: {self.score:.2f}\n"
            f"Trecho: {self.content}"
        )

    def to_api_dict(self) -> dict:
        preview = " ".join(self.content.split())
        return {
            "id": self.id,
            "title": self.title,
            "source": self.source,
            "score": round(self.score, 3),
            "contentPreview": preview[:360],
        }
