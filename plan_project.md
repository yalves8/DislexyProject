# DilexyProject — Planejamento do Projeto

> Documento de referência para o time. Atualizar conforme o projeto evolui.

---

## Visão Geral

Aplicação para adaptar exercícios escolares para crianças com dislexia, utilizando Gemini Vision e RAG com LlamaIndex. O sistema evoluiu de um MVP Streamlit para uma arquitetura web completa com autenticação de perfis **Professor** e **Aluno**.

---

## Stack Tecnológica

| Camada       | Tecnologia                     | Justificativa                                      |
|--------------|--------------------------------|----------------------------------------------------|
| Frontend     | React + TypeScript + Vite      | Fiel ao design Figma; ecossistema maduro           |
| Estilo       | Tailwind CSS                   | Rápido, utilitário, compatível com tokens Figma    |
| Backend      | FastAPI (Python)               | Mantém código Python existente; alta performance   |
| Auth         | JWT (python-jose) + bcrypt     | Leve, stateless, sem dependência externa           |
| Banco de dados | SQLite (MVP) → PostgreSQL    | Simples para MVP, escalável                        |
| IA           | Google Gemini + LlamaIndex     | Já existente, sem mudança                          |

---

## Estrutura do Repositório (Monorepo)

```
DilexyProject/
├── frontend/                        # React + TypeScript
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginSelect.tsx      # Tela 1: escolha Professor / Aluno
│   │   │   ├── StudentLogin.tsx     # Tela 2: login aluno + configurações de leitura
│   │   │   ├── StudentPortal.tsx    # Portal do aluno (upload + adaptação + tutor)
│   │   │   └── TeacherDashboard.tsx # Dashboard do professor (ver atividades dos alunos)
│   │   ├── components/
│   │   │   ├── ReadingSettings.tsx  # Fonte, régua, cor de sobreposição, tamanho
│   │   │   └── ActivityCard.tsx     # Card de atividade adaptada
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # Estado global de autenticação (JWT)
│   │   └── services/
│   │       └── api.ts               # Cliente HTTP para o backend
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                         # FastAPI (Python)
│   ├── app/
│   │   ├── main.py                  # Entry point FastAPI
│   │   ├── routers/
│   │   │   ├── auth.py              # POST /auth/login, /auth/logout
│   │   │   ├── students.py          # GET/POST /students/activities
│   │   │   └── teacher.py           # GET /teacher/students e atividades
│   │   ├── models/
│   │   │   ├── user.py              # User, Student, Teacher (SQLModel)
│   │   │   └── activity.py          # Activity (conteúdo adaptado)
│   │   ├── services/
│   │   │   ├── gemini_vision.py     # Migrado de utils/gemini_vision.py
│   │   │   └── rag.py               # Migrado de utils/rag.py
│   │   └── database.py              # Conexão SQLite + inicialização
│   ├── requirements.txt
│   └── .env.example
│
├── docs/
│   └── superpowers/specs/           # Design specs gerados durante brainstorming
├── plan_project.md                  # Este arquivo
├── README.md
└── .gitignore
```

---

## Modelo de Dados

```
User
  id, username, password_hash, role (student | teacher), created_at

Student  →  herda User
  font_preference (OpenDyslexic | Comic Sans MS | Arial)
  font_size (px)
  overlay_color (hex)
  ruler_enabled (boolean)

Activity
  id, student_id (FK), original_text, adapted_text, image_path, created_at

TeacherStudentLink
  teacher_id (FK), student_id (FK)
```

---

## Fluxo de Telas

```
/ → LoginSelect
      ├── [Acessar como Aluno]     → /student/login
      │        └── [Entrar]        → /student/portal
      └── [Acessar como Professor] → /teacher/login
               └── [Entrar]        → /teacher/dashboard
```

---

## Configuração do Repositório para o Time

### 1. Criar a branch `develop`

```bash
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

### 2. Estrutura de branches

```
main          ← código estável e revisado (protegido)
  └── develop ← integração contínua do time
        ├── feat/frontend-login
        ├── feat/backend-auth
        ├── feat/student-portal
        ├── feat/teacher-dashboard
        └── fix/nome-do-bug
```

**Prefixos obrigatórios:** `feat/`, `fix/`, `chore/`, `docs/`

### 3. Proteção de branches

Acessar: **GitHub → Settings → Branches → Add branch protection rule**

**Para `main`:**
```
Branch name pattern: main
✅ Require a pull request before merging
✅ Require 1 approving review
✅ Dismiss stale pull request approvals when new commits are pushed
✅ Do not allow bypassing the above settings
```

**Para `develop`** (recomendado):
```
Branch name pattern: develop
✅ Require a pull request before merging
✅ Require 1 approving review
```

### 4. Convidar o segundo contribuidor

```
GitHub → Settings → Collaborators and teams → Add people
  → Buscar pelo username ou e-mail do colega
  → Role: Write
```

---

## Time (2 Contribuidores)

| Papel sugerido  | Responsabilidade principal                        |
|-----------------|---------------------------------------------------|
| Contribuidor A  | Frontend — React, telas, UX, integração com API   |
| Contribuidor B  | Backend — FastAPI, banco de dados, lógica de IA   |

> Os papéis não são rígidos. Ambos podem contribuir em qualquer área; a divisão facilita a criação de issues e code reviews.

---

## GitHub Project (Kanban)

**Criar em:** GitHub → Projects → New project → Board

**Colunas:**
```
📥 Backlog  →  🔄 In Progress  →  👀 In Review  →  ✅ Done
```

**Linkar ao repositório:** Project Settings → Linked repositories

---

## Labels

Criar em **Issues → Labels**:

| Label      | Cor     | Uso                                  |
|------------|---------|--------------------------------------|
| frontend   | Azul    | Tudo que roda no React               |
| backend    | Verde   | FastAPI, banco, serviços Python       |
| auth       | Roxo    | Login, JWT, permissões               |
| database   | Laranja | Modelos, migrations, queries         |
| feature    | Amarelo | Nova funcionalidade                  |
| bug        | Vermelho| Correção de comportamento errado     |
| docs       | Cinza   | Documentação                         |

---

## Milestones

| Milestone                    | Escopo                                                          |
|------------------------------|-----------------------------------------------------------------|
| V1 — Auth + Login            | Telas de login, JWT, banco de dados inicial, roles             |
| V2 — Portal do Aluno         | Upload de imagem, adaptação Gemini, configurações de leitura    |
| V3 — Dashboard do Professor  | Listagem de alunos, visualização de atividades por aluno        |

---

## Issues Iniciais

### Chore — Setup e Infraestrutura

```
[chore]  Estruturar monorepo (criar pastas frontend/ e backend/)       → chore          ✅ feito
[chore]  Inicializar projeto React com Vite + TypeScript + Tailwind    → frontend, chore  ✅ feito
[chore]  Configurar React Router DOM e estrutura de rotas              → frontend, chore  ✅ feito
[chore]  Script de seed — criar usuários iniciais para testes          → backend, chore  ✅ feito
```

### Backend — Banco de Dados e Modelos

```
[feat]   Configurar FastAPI com SQLite e SQLModel                      → backend, database  ✅ feito
[feat]   Criar models User, Student, Teacher, Activity                 → backend, database  ✅ feito
[feat]   Criar tabela TeacherStudentLink (vincular professor ↔ aluno)  → backend, database  ✅ feito
```

### Backend — Autenticação

```
[feat]   Implementar POST /auth/register — criar conta aluno/professor → backend, auth      ✅ feito
[feat]   Implementar POST /auth/login com JWT                          → backend, auth      ✅ feito
[feat]   Middleware JWT — proteger rotas autenticadas no FastAPI        → backend, auth      ✅ feito
```

### Backend — Endpoints de Aluno

```
[feat]   PUT  /students/settings — salvar configurações de leitura     → backend, feature   ✅ feito
[feat]   POST /students/activities — salvar atividade adaptada         → backend, feature   ✅ feito
[feat]   POST /students/adapt-image — Gemini Vision → texto adaptado   → backend, feature   ✅ feito
[feat]   POST /students/ask — RAG → resposta do tutor                  → backend, feature   ✅ feito
```

### Backend — Endpoints de Professor

```
[feat]   GET /teacher/students — listar alunos vinculados              → backend, feature   ✅ feito
[feat]   GET /teacher/students/{id}/activities — atividades do aluno   → backend, feature   ✅ feito
```

### Frontend — Componentes

```
[feat]   Componente ReadingSettings — fonte, régua, cor, tamanho       → frontend, feature  ✅ feito
[feat]   Componente ActivityCard — card de atividade adaptada          → frontend, feature  ✅ feito
[feat]   AuthContext — JWT storage + rotas protegidas                  → frontend, auth     ✅ feito
[feat]   Rotas protegidas — redirecionar para login se sem JWT         → frontend, auth     ✅ feito
```

### Frontend — Telas

```
[feat]   Tela LoginSelect — escolha Professor / Aluno                  → frontend, feature  ✅ feito
[feat]   Tela StudentLogin com ReadingSettings                         → frontend, feature  ✅ feito
[feat]   Tela TeacherLogin — login do professor                        → frontend, feature  ✅ feito
[feat]   Tela StudentPortal — upload + adaptação + tutor               → frontend, feature  ✅ feito
[feat]   Tela TeacherDashboard — listagem de atividades por aluno      → frontend, feature  ✅ feito
```

### Documentação

```
[docs]   Atualizar README com nova arquitetura                         → docs
[docs]   Documentar campos dos endpoints (complementar Swagger)        → docs
```

---

## Convenção de Commits

Seguir **Conventional Commits** (https://www.conventionalcommits.org):

```
feat:     nova funcionalidade
fix:      correção de bug
chore:    setup, config, dependências
docs:     documentação
refactor: refatoração sem mudança de comportamento
test:     adição ou correção de testes
style:    formatação, lint (sem mudança de lógica)
```

**Exemplos:**
```
feat(auth): add JWT login endpoint
feat(frontend): create LoginSelect screen
fix(rag): handle empty Gemini response
chore: add .gitignore rules for monorepo
docs: update README with new architecture
```

---

## Workflow do Time

```
1. Pegar issue no Backlog → mover para "In Progress"
2. Criar branch:
     git checkout develop && git pull origin develop
     git checkout -b feat/nome-da-feature
3. Desenvolver com commits frequentes (conventional commits)
4. Abrir PR apontando para develop
5. O outro contribuidor revisa e aprova
6. Merge em develop → mover issue para "Done"
7. Quando develop estiver estável → abrir PR develop → main
```

---

## Configuração Local (Desenvolvimento)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # adicionar GEMINI_API_KEY
uvicorn app.main:app --reload
# API disponível em: http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App disponível em: http://localhost:5173
```
