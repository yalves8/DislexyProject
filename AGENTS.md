# AGENTS.md — DilexyProject

Manual operacional para agentes de código. Branch ativa de desenvolvimento: **`develop`** (monorepo web). A branch **`main`** contém o MVP legado em Streamlit — não confundir com a arquitetura atual.

## Visão geral

Portal de leitura para estudantes com dislexia (~10 anos). Professores vinculam alunos e acompanham atividades; alunos adaptam exercícios via foto, personalizam leitura e tiram dúvidas com tutor RAG.

**Regra de produto:** todo texto voltado ao aluno deve ser simples, encorajador e com frases curtas.

## Estrutura do monorepo

```
DilexyProject/
├── frontend/              # React 19 + TypeScript + Vite + Tailwind v4
│   └── src/
│       ├── pages/         # LoginSelect, StudentLogin, StudentPortal, TeacherLogin, TeacherDashboard
│       ├── components/    # ReadingSettings, ActivityCard, ProtectedRoute
│       ├── contexts/      # AuthContext (JWT + role)
│       └── services/      # api.ts (cliente HTTP básico)
│
├── backend/               # FastAPI + SQLModel + SQLite
│   ├── app/
│   │   ├── main.py        # Entry point, CORS, lifespan
│   │   ├── auth.py        # JWT, bcrypt, require_role
│   │   ├── database.py    # Engine SQLite, get_session
│   │   ├── routers/       # auth, students, teacher
│   │   ├── models/        # User, StudentSettings, TeacherStudentLink, Activity
│   │   └── services/      # gemini_vision, rag (LlamaIndex)
│   ├── seed.py            # Usuários de teste
│   └── .env.example
│
├── plan_project.md        # Planejamento, issues, workflow do time
└── README.md              # Documentação humana
```

> **Legado:** `utils/` na raiz ainda existe (código Streamlit antigo). A lógica de IA vive em `backend/app/services/`. Não editar `utils/` salvo migração explícita.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4, React Router v7 |
| Backend | FastAPI, SQLModel, SQLite |
| Auth | JWT (python-jose) + bcrypt |
| IA — Visão | Google Gemini Vision (`gemini-3-flash-preview`) |
| IA — RAG | LlamaIndex + Gemini Embeddings (`text-embedding-004`) |

## Pré-requisitos

- Python 3.11+
- Node.js 18+
- Chave Gemini: https://aistudio.google.com/app/apikey

## Instalação e execução

### Variáveis de ambiente

```bash
cp backend/.env.example backend/.env
# Editar backend/.env:
#   GEMINI_API_KEY=sua_chave
#   SECRET_KEY=chave_jwt_longa_e_segura
#   DATABASE_URL=sqlite:///...  (opcional; padrão: backend/dilexy.db)
```

O `seed.py` também aceita `.env` na raiz do projeto como fallback.

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
python seed.py                  # uma vez — cria usuários de teste
uvicorn app.main:app --reload
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Health: `GET /health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173
- Proxy Vite: `/api/*` → `http://localhost:8000/*` (ver `frontend/vite.config.ts`)

**Ambos os servidores devem estar rodando** para fluxo completo.

## Credenciais de teste

Após `python seed.py` (em `backend/`):

| Perfil | Username | Senha | Role |
|--------|----------|-------|------|
| Aluno | `aluno` | `senha123` | `student` |
| Professor | `professor` | `senha123` | `teacher` |

O seed também cria vínculo professor ↔ aluno e configurações de leitura padrão.

## Fluxo de telas

```
/ → LoginSelect (escolha de perfil)
      ├── Sou Aluno     → /student/login  → /student/portal
      └── Sou Professor → /teacher/login  → /teacher/dashboard
```

Rotas protegidas usam `ProtectedRoute` + JWT em `localStorage` (`dilexy_auth`).

## API — Endpoints

Documentação interativa: **http://localhost:8000/docs**

### Auth (público)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Cria conta (`role`: `student` \| `teacher`) |
| POST | `/auth/login` | Retorna JWT + `role` + `username` |

### Aluno (`Authorization: Bearer <token>`, role=student)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/students/me/settings` | Configurações de leitura |
| PUT | `/students/me/settings` | Atualiza fonte, tamanho, cor, régua |
| POST | `/students/adapt-image` | Upload imagem → texto adaptado (multipart) |
| POST | `/students/ask` | Tutor RAG (`context` + `question`) |
| POST | `/students/activities` | Salva atividade adaptada |
| GET | `/students/activities` | Lista atividades do aluno |

### Professor (role=teacher)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/teacher/students` | Alunos vinculados + settings |
| GET | `/teacher/students/{id}/activities` | Atividades de um aluno (403 se não vinculado) |

## Fluxo de dados

```
[Aluno faz upload da imagem]
        ↓
[POST /students/adapt-image → Gemini Vision] → original + adapted + raw
        ↓
[POST /students/activities] → SQLite
        ↓
[Aluno pergunta ao tutor]
        ↓
[POST /students/ask → LlamaIndex RAG] → resposta simples
        ↓
[Professor no dashboard → GET /teacher/students/{id}/activities]
```

## Workflow de branches

```
main          ← estável (protegido, PR + 1 aprovação)
  └── develop ← integração contínua (branch de trabalho)
        └── feat/* | fix/* | chore/* | docs/*
```

1. Partir de `develop` atualizado
2. Branch com prefixo (`feat/nome`, `fix/nome`, etc.)
3. Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
4. PR para `develop`; quando estável, PR `develop` → `main`

Detalhes: `plan_project.md`.

## Convenções para agentes

- Responder em **português**; código pode usar nomes em inglês quando idiomático
- Diffs mínimos — não refatorar fora do escopo
- Backend: lógica em `routers/` (HTTP), `services/` (IA), `models/` (SQLModel)
- Frontend: páginas orquestram; componentes reutilizáveis em `components/`
- Prompts de LLM como constantes no topo dos módulos (`ADAPT_PROMPT`, `TUTOR_SYSTEM`, `QA_TEMPLATE`)
- Não adicionar dependências sem necessidade clara
- Sem suite de testes automatizada — validar manualmente

## Segurança e segredos

- **Nunca** commitar `.env`, chaves ou tokens
- Variáveis sensíveis: `GEMINI_API_KEY`, `SECRET_KEY`
- Gerar SECRET_KEY: `python -c "import secrets; print(secrets.token_hex(32))"`
- JWT expira em 24h (`ACCESS_TOKEN_EXPIRE_MINUTES` em `backend/app/auth.py`)
- Rotas protegidas via `require_role("student")` ou `require_role("teacher")`
- Professor só acessa atividades de alunos vinculados (`TeacherStudentLink`)

## Contexto aninhado

| Arquivo | Escopo |
|---------|--------|
| `backend/AGENTS.md` | FastAPI, routers, models, services, seed |
| `frontend/AGENTS.md` | React, rotas, AuthContext, proxy API |

## O que evitar

- Assumir arquitetura Streamlit (`app.py`, `st.session_state`) — é legado em `main`
- Editar `utils/` quando a tarefa é no monorepo `backend/` / `frontend/`
- Alterar formato de resposta do Gemini Vision sem atualizar `parse_result()`
- Trocar modelos Gemini sem alinhar `gemini_vision.py` e `rag.py`
- Texto longo ou vocabulário difícil em respostas ao aluno
- Expor valores reais de `.env` em código ou documentação

## Verificação antes de concluir

### Backend

1. `backend/.env` com `GEMINI_API_KEY` e `SECRET_KEY` definidos
2. `uvicorn app.main:app --reload` inicia sem erros
3. `GET http://localhost:8000/health` retorna `{"status":"ok"}`
4. Login via Swagger ou curl retorna JWT

### Frontend

1. `npm run dev` inicia em http://localhost:5173
2. Login aluno (`aluno` / `senha123`) → portal
3. Login professor (`professor` / `senha123`) → dashboard

### Fluxo completo (aluno)

1. Upload de imagem → texto adaptado exibido
2. Atividade salva (histórico)
3. Pergunta ao tutor → resposta simples e encorajadora
4. Professor vê atividade no dashboard

### Após mudanças em prompts/IA

1. Adaptação retorna `original` e `adapted` parseados corretamente
2. Tutor responde com tom acessível para ~10 anos
