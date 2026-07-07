# AGENTS.md — backend/

Contexto para agentes trabalhando na API FastAPI. Leia `AGENTS.md` na raiz para visão geral do monorepo.

## Responsabilidade

API REST com autenticação JWT, persistência SQLite e serviços de IA (Gemini Vision + RAG). Expõe perfis **student** e **teacher**.

## Estrutura

```
backend/
├── app/
│   ├── main.py              # FastAPI, CORS (localhost:5173), lifespan → create_db_and_tables
│   ├── auth.py              # hash/verify password, JWT, get_current_user, require_role
│   ├── database.py          # SQLModel engine, get_session, DATABASE_URL
│   ├── routers/
│   │   ├── auth.py          # POST /auth/register, /auth/login
│   │   ├── students.py      # settings, adapt-image, ask, activities
│   │   └── teacher.py       # students, activities por aluno
│   ├── models/
│   │   ├── user.py          # User, StudentSettings, TeacherStudentLink
│   │   └── activity.py      # Activity
│   └── services/
│       ├── gemini_vision.py # adapt_image(), parse_result()
│       └── rag.py           # build_query_engine(), ask()
├── seed.py                  # Usuários e vínculos de teste
├── requirements.txt
├── .env.example
└── dilexy.db                # Criado automaticamente (gitignored)
```

## Variáveis de ambiente

Arquivo: `backend/.env` (ou `.env` na raiz — `seed.py` carrega ambos).

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `GEMINI_API_KEY` | Sim (endpoints IA) | Chave Google Gemini |
| `SECRET_KEY` | Sim (produção) | Assinatura JWT; padrão inseguro: `change-me` |
| `DATABASE_URL` | Não | Padrão: `sqlite:///<backend>/dilexy.db` |

## Routers — contratos

### `auth.py` (`/auth`)

- `POST /register` — body: `{ username, password, role }`; cria `StudentSettings` se student
- `POST /login` — retorna `{ access_token, token_type, role, username }`

### `students.py` (`/students`) — requer role=student

| Endpoint | Entrada | Saída |
|----------|---------|-------|
| `GET /me/settings` | JWT | StudentSettings |
| `PUT /me/settings` | SettingsBody | StudentSettings |
| `POST /adapt-image` | multipart file | `{ original, adapted, raw }` |
| `POST /ask` | `{ context, question }` | `{ answer }` |
| `POST /activities` | ActivityBody | Activity |
| `GET /activities` | JWT | Activity[] |

`context` em `/ask` deve ser o campo `raw` de `/adapt-image`.

### `teacher.py` (`/teacher`) — requer role=teacher

- `GET /students` — alunos vinculados + settings
- `GET /students/{id}/activities` — 403 se aluno não vinculado

## Models

```python
User          # id, username, password_hash, role, created_at
StudentSettings  # user_id (PK/FK), font_preference, font_size, overlay_color, ruler_enabled
TeacherStudentLink  # teacher_id + student_id (PK composta)
Activity      # id, student_id, original_text, adapted_text, image_path?, created_at
```

## Services — contratos de IA

### `gemini_vision.py`

- `adapt_image(image_bytes, api_key) -> str` — resposta bruta do modelo
- `parse_result(text) -> (original, adapted)` — depende dos marcadores `**Texto Original:**` e `**Versão Adaptada:**`

### `rag.py`

- `build_query_engine(adapted_text, api_key)` — índice in-memory LlamaIndex
- `ask(query_engine, question) -> str` — RAG com `similarity_top_k=2`

Prompts: `ADAPT_PROMPT`, `TUTOR_SYSTEM`, `QA_TEMPLATE` — manter tom acessível.

## seed.py

```bash
cd backend
python seed.py
```

Cria (idempotente):

- `professor` / `senha123` (teacher)
- `aluno` / `senha123` (student) + StudentSettings padrão
- TeacherStudentLink professor → aluno

## Comandos

```powershell
cd backend
.venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

- Swagger: http://localhost:8000/docs
- Health: `GET /health`

## Convenções

- Injeção de dependência: `Depends(get_session)`, `Depends(require_role(...))`
- Erros: `HTTPException` com `detail` em português
- Novos endpoints: router correspondente + tag Swagger + summary/description
- Lógica de IA apenas em `services/`; routers orquestram e validam

## Verificação

1. Servidor inicia com `.env` configurado
2. `POST /auth/login` com credenciais do seed
3. `POST /students/adapt-image` com imagem de teste (JWT aluno)
4. `POST /students/ask` com context do adapt-image
5. `GET /teacher/students/{id}/activities` com JWT professor
