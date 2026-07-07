# AGENTS.md — frontend/

Contexto para agentes trabalhando no app React. Leia `AGENTS.md` na raiz para visão geral do monorepo.

## Responsabilidade

Interface web com perfis aluno e professor: login, configurações de leitura, adaptação de exercícios, tutor RAG e dashboard do professor.

## Stack

React 19, TypeScript, Vite 6, Tailwind CSS v4, React Router v7.

## Estrutura

```
frontend/src/
├── main.tsx                 # StrictMode, BrowserRouter, AuthProvider
├── App.tsx                  # Rotas e redirecionamentos por auth
├── pages/
│   ├── LoginSelect.tsx      # / — escolha aluno ou professor
│   ├── StudentLogin.tsx     # /student/login — login + ReadingSettings
│   ├── StudentPortal.tsx    # /student/portal — upload, adaptação, tutor, histórico
│   ├── TeacherLogin.tsx     # /teacher/login
│   └── TeacherDashboard.tsx # /teacher/dashboard — alunos e atividades
├── components/
│   ├── ReadingSettings.tsx  # fonte, tamanho, cor overlay, régua
│   ├── ActivityCard.tsx     # card de atividade adaptada
│   └── ProtectedRoute.tsx   # guard por role
├── contexts/
│   └── AuthContext.tsx      # login/logout, localStorage dilexy_auth
├── services/
│   └── api.ts               # get/post com BASE_URL (uso limitado)
└── index.css                # Tailwind + estilos globais
```

## Rotas

| Rota | Página | Guard |
|------|--------|-------|
| `/` | LoginSelect | Redireciona se autenticado |
| `/student/login` | StudentLogin | — |
| `/student/portal` | StudentPortal | ProtectedRoute student |
| `/teacher/login` | TeacherLogin | — |
| `/teacher/dashboard` | TeacherDashboard | ProtectedRoute teacher |

## AuthContext

```typescript
type Role = "student" | "teacher";
interface AuthUser { username: string; role: Role; token: string; }
```

- `login(user)` — persiste em `localStorage` (`dilexy_auth`)
- `logout()` — limpa storage
- `useAuth()` — hook obrigatório dentro de `AuthProvider`

## Comunicação com API

### Proxy Vite (dev)

`vite.config.ts` redireciona `/api/*` → `http://localhost:8000/*`.

As páginas usam `fetch("/api/...")` — **não** `api.ts` na maioria dos fluxos.

### Padrões de chamada

```typescript
// Login
POST /api/auth/login  →  { access_token, role, username }

// Rotas autenticadas
headers: { Authorization: `Bearer ${token}` }

// Upload imagem (StudentPortal)
const form = new FormData();
form.append("file", file);
fetch("/api/students/adapt-image", { method: "POST", headers: { Authorization }, body: form })

// Tutor RAG
POST /api/students/ask  →  { context: raw, question }
```

### api.ts

Cliente básico com `BASE_URL = "http://localhost:8000"`. Preferir `/api/` nas páginas para funcionar com proxy em dev.

## Fluxos por página

### StudentLogin

1. `POST /api/auth/login` — valida `role === "student"`
2. `login()` no context
3. `PUT /api/students/me/settings` com ReadingSettings
4. Navega para `/student/portal`

### StudentPortal

1. Upload → `POST /api/students/adapt-image`
2. Auto-save → `POST /api/students/activities`
3. Tutor → `POST /api/students/ask` com `raw` como context
4. Histórico → `GET /api/students/activities`

### TeacherDashboard

1. `GET /api/teacher/students`
2. Por aluno: `GET /api/teacher/students/{id}/activities`

## Comandos

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc + vite build
npm run preview  # preview da build
```

**Backend deve estar em http://localhost:8000** para chamadas funcionarem.

## Credenciais de teste

Após `python seed.py` no backend:

- Aluno: `aluno` / `senha123`
- Professor: `professor` / `senha123`

## Convenções

- Componentes funcionais + hooks; props tipadas com `interface`
- Estado de auth global no context; estado de UI local na página
- Tailwind para estilos; evitar CSS inline exceto valores dinâmicos (ex.: font_size)
- Textos de UI em português, linguagem simples
- Fontes suportadas: OpenDyslexic, Comic Sans MS, Arial

## Verificação

1. `npm run dev` sem erros
2. Login aluno → portal → upload → adaptação exibida
3. Tutor responde pergunta
4. Login professor → dashboard lista aluno e atividades
5. `npm run build` passa sem erros TypeScript
