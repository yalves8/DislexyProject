# DilexyProject — Portal de Leitura para Estudantes com Dislexia

Plataforma web que adapta exercícios escolares para crianças com dislexia, com perfis distintos para **alunos** e **professores**.

## O Problema

A dislexia afeta entre 5% e 17% da população mundial. Enunciados longos, textos densos e fontes inadequadas tornam o aprendizado frustrante — não por falta de inteligência, mas por uma forma diferente de processar informação. Estimam-se 2,3 a 7 milhões de alunos brasileiros afetados.

## Solução

Um portal onde o professor vincula alunos e acompanha o progresso, e o aluno acessa um espaço personalizado que:

1. **Adapta exercícios** — envia foto do enunciado, recebe versão com frases curtas, vocabulário simples e bullet points (Gemini Vision)
2. **Responde dúvidas** — tutor gentil contextualizado ao conteúdo adaptado (LlamaIndex RAG + Gemini)
3. **Personaliza a leitura** — fonte amigável (OpenDyslexic, Comic Sans, Arial), régua de foco, cor de sobreposição e tamanho de fonte configuráveis

---

## Arquitetura

```
DilexyProject/          ← monorepo
├── frontend/           ← React 19 + TypeScript + Vite + Tailwind CSS v4
│   └── src/
│       ├── pages/      ← LoginSelect, StudentLogin, StudentPortal, TeacherLogin, TeacherDashboard
│       ├── components/ ← ReadingSettings, ActivityCard
│       ├── contexts/   ← AuthContext (JWT + role)
│       └── services/   ← api.ts (cliente HTTP)
│
├── backend/            ← FastAPI + SQLModel + SQLite
│   └── app/
│       ├── routers/    ← auth, students, teacher
│       ├── models/     ← User, StudentSettings, TeacherStudentLink, Activity
│       ├── services/   ← gemini_vision, rag (LlamaIndex)
│       ├── auth.py     ← JWT utilities + role guard
│       └── database.py ← engine SQLite + get_session
│
└── plan_project.md     ← planejamento e issues do projeto
```

### Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4, React Router v7 |
| Backend | FastAPI, SQLModel, SQLite |
| Auth | JWT (python-jose) + bcrypt |
| IA — Visão | Google Gemini Vision (gemini-3-flash-preview) |
| IA — RAG | LlamaIndex + Gemini Embeddings |

### Fluxo de dados

```
[Aluno faz upload da imagem]
        ↓
[FastAPI → Gemini Vision] → extrai texto + reescreve para dislexia
        ↓
[Atividade salva no banco (SQLite)]
        ↓
[Aluno faz pergunta ao tutor]
        ↓
[LlamaIndex RAG → Gemini] → resposta simples e encorajadora
        ↓
[Professor acessa dashboard → vê todas as atividades do aluno]
```

---

## Pré-requisitos

- Python 3.11+
- Node.js 18+
- Chave de API do Google Gemini ([obter aqui](https://aistudio.google.com/app/apikey))

---

## Instalação e execução

### 1. Clone e configure variáveis de ambiente

```bash
git clone <url-do-repo>
cd DilexyProject

cp .env.example .env
# Edite o .env:
#   GEMINI_API_KEY=sua_chave
#   SECRET_KEY=chave_jwt_longa_e_segura
#   DATABASE_URL=sqlite:///./dilexy.db
```

### 2. Backend

```bash
cd backend

python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

pip install -r requirements.txt

# Criar usuários de teste
python seed.py
# → professor / senha123
# → aluno     / senha123

# Iniciar servidor
uvicorn app.main:app --reload
# API disponível em: http://localhost:8000
# Swagger docs em:   http://localhost:8000/docs
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# App disponível em: http://localhost:5173
```

---

## API — Endpoints

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Cria conta de aluno ou professor |
| POST | `/auth/login` | Autentica e retorna JWT |

### Aluno (requer JWT com role=student)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/students/me/settings` | Configurações de leitura do aluno |
| PUT | `/students/me/settings` | Atualiza configurações de leitura |
| POST | `/students/adapt-image` | Envia imagem → retorna texto adaptado |
| POST | `/students/ask` | Pergunta ao tutor RAG |
| POST | `/students/activities` | Salva atividade adaptada |
| GET | `/students/activities` | Lista atividades do aluno |

### Professor (requer JWT com role=teacher)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/teacher/students` | Lista alunos vinculados |
| GET | `/teacher/students/{id}/activities` | Atividades de um aluno específico |

Documentação interativa completa: **http://localhost:8000/docs**

---

## Perfis e fluxo de telas

```
/ → Portal de Leitura (escolha de perfil)
      ├── Sou Aluno     → /student/login  → /student/portal
      └── Sou Professor → /teacher/login  → /teacher/dashboard
```

**Credenciais de teste (após rodar `seed.py`):**
```
Aluno:     username=aluno      senha=senha123
Professor: username=professor  senha=senha123
```

---

## Estrutura de branches

```
main          ← código estável (protegido, exige PR + 1 aprovação)
  └── develop ← integração contínua
        └── feat/* / fix/* / chore/*
```

Veja `plan_project.md` para o planejamento completo, issues e workflow do time.
