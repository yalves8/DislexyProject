# Assistente de Leitura para Estudantes com Dislexia

Aplicação MVP que adapta exercícios escolares para crianças com dislexia, utilizando Gemini Vision e RAG com LlamaIndex.

## O Problema

Ana tem 10 anos e sofre com o ritmo das salas de aula tradicionais. Enunciados longos, textos densos e métodos puramente fonéticos tornam o aprendizado frustrante — não por falta de inteligência, mas por uma forma diferente de processar informação. A dislexia afeta entre 5% e 17% da população mundial, e no Brasil estima-se que 2,3 a 7 milhões de alunos da educação básica convivam com algum grau dessa condição.

## Solução

Um assistente que recebe a foto de um exercício escolar e:

1. **Extrai e adapta o texto** — reescreve o enunciado com frases curtas, vocabulário simples e bullet points (Gemini Vision)
2. **Responde dúvidas** — o aluno pode perguntar sobre o conteúdo e receber uma explicação gentil e contextualizada (LlamaIndex RAG + Gemini)

## Tecnologias

| Camada | Tecnologia | Papel |
|---|---|---|
| LLM + Visão | Gemini 3 Flash (Google) | Extração de texto da imagem + reescrita acessível |
| RAG | LlamaIndex + VectorStoreIndex | Indexação do conteúdo adaptado para responder dúvidas |
| Interface | Streamlit | UI web simples e interativa |

## Arquitetura

```
app.py                  # Interface Streamlit — fluxo de 3 etapas
utils/
├── gemini_vision.py    # Gemini Vision: extrai e adapta texto da imagem
└── rag.py              # LlamaIndex: indexa conteúdo e responde perguntas
```

### Fluxo de dados

```
[Imagem do exercício]
        ↓
[Gemini Vision] → extrai texto + reescreve para dislexia
        ↓
[Streamlit exibe versão adaptada]
        ↓
[LlamaIndex indexa o conteúdo em memória]
        ↓
[Aluno faz pergunta] → RAG recupera contexto → Gemini responde
        ↓
[Tutor exibe resposta simples e encorajadora]
```

## Pré-requisitos

- Python 3.11+
- Chave de API do Google Gemini ([obter aqui](https://aistudio.google.com/app/apikey))

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/nome-do-repo.git
cd nome-do-repo

# 2. Instale as dependências
pip install -r requirements.txt

# 3. Configure a chave da API
cp .env.example .env
# Edite o .env e adicione sua GEMINI_API_KEY
```

## Como usar

```bash
python -m streamlit run app.py
```

Acesse `http://localhost:8501`, envie uma foto de exercício escolar e clique em **"Adaptar para mim ✨"**.

## Roadmap

- **V1** — RAG sobre apostilas e livros didáticos em PDF (LlamaIndex)
- **V2** — Agente autônomo que adapta atividades sem intervenção manual (LangGraph)
- **V3** — Analytics de progresso + privacidade local (Edge AI + LGPD)
