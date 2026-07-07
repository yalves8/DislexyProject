from llama_index.core import VectorStoreIndex, Document, Settings
from llama_index.core.prompts import PromptTemplate
from llama_index.llms.gemini import Gemini
from llama_index.embeddings.gemini import GeminiEmbedding

TUTOR_SYSTEM = (
    "Você é um tutor gentil para crianças com dislexia. "
    "Use APENAS o conteúdo do exercício para responder. "
    "Responda de forma muito simples e encorajadora, "
    "com frases curtas e um exemplo prático quando ajudar."
)

QA_TEMPLATE = PromptTemplate(
    "Contexto do exercício:\n"
    "---------------------\n"
    "{context_str}\n"
    "---------------------\n"
    f"{TUTOR_SYSTEM}\n\n"
    "Pergunta: {query_str}\n"
    "Resposta:"
)

def build_query_engine(adapted_text: str, api_key: str):
    Settings.llm = Gemini(api_key=api_key, model="models/gemini-3-flash-preview")
    Settings.embed_model = GeminiEmbedding(api_key=api_key, model_name="models/text-embedding-004")
    doc = Document(text=adapted_text)
    index = VectorStoreIndex.from_documents([doc])
    return index.as_query_engine(similarity_top_k=2, text_qa_template=QA_TEMPLATE)

def ask(query_engine, question: str) -> str:
    response = query_engine.query(question)
    return str(response)
