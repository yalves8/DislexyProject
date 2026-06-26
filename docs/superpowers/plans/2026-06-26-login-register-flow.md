# Login / Cadastro / Modal de Configurações — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a tela de login monolítica por três unidades separadas: LoginPage, RegisterPage e SettingsModal — com identidade visual verde-menta + glassmorphism e fluxo claro de primeiro login.

**Architecture:** LoginPage e RegisterPage são páginas independentes com o mesmo visual (gradiente fixo + cartão glassmorphism). O SettingsModal é montado dentro de PDFLibrary — aparece na primeira visita pós-login verificando uma flag no localStorage.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Router v6, Fetch API. Backend FastAPI existente sem alterações.

## Global Constraints

- Paleta: fundo `linear-gradient(145deg, #d1fae5 0%, #a7f3d0 30%, #bfdbfe 100%)`, botões `from-[#10b981] to-[#3b82f6]`, títulos `text-[#064e3b]`, subtítulos `text-[#047857]`
- Glassmorphism: `bg-white/80 backdrop-blur-md rounded-3xl` com `shadow-[0_8px_32px_rgba(16,185,129,0.15)]`
- Flag de primeiro login: `localStorage` key `dislexy_first_login_done_<username>`
- `AuthUser` (AuthContext) tem apenas `username: string` e `token: string` — usar `username` como chave da flag
- `API_BASE = import.meta.env.VITE_API_URL || '/api'`
- TypeScript strict — sem `any`
- Sem comentários desnecessários no código

---

## Mapa de Arquivos

| Ação | Arquivo |
|---|---|
| **Criar** | `frontend/src/pages/LoginPage.tsx` |
| **Criar** | `frontend/src/pages/RegisterPage.tsx` |
| **Criar** | `frontend/src/components/SettingsModal.tsx` |
| **Modificar** | `frontend/src/App.tsx` |
| **Deletar** | `frontend/src/pages/Login.tsx` |
| **Modificar** | `frontend/src/pages/PDFLibrary.tsx` |

---

## Task 1: LoginPage

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/App.tsx`
- Delete: `frontend/src/pages/Login.tsx`

**Interfaces:**
- Consome: `useAuth()` → `{ login }`, `API_BASE`
- Produz: navegação para `/library` após login (com `state: { firstLogin: true }` se for o primeiro acesso)

A verificação de primeiro login usa `localStorage.getItem('dislexy_first_login_done_<username>')`.

- [ ] **Step 1: Criar `LoginPage.tsx`**

Criar `frontend/src/pages/LoginPage.tsx` com o seguinte conteúdo:

```tsx
import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const FIRST_LOGIN_KEY = (username: string) =>
  `dislexy_first_login_done_${username}`;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Credenciais inválidas");
      }

      const data = await res.json();
      login({ username: data.username, token: data.access_token });

      const isFirst = !localStorage.getItem(FIRST_LOGIN_KEY(data.username));
      navigate("/library", { state: { firstLogin: isFirst } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(145deg, #d1fae5 0%, #a7f3d0 30%, #bfdbfe 100%)",
      }}
    >
      <div className="bg-white/80 backdrop-blur-md rounded-3xl px-8 py-10 w-full max-w-sm shadow-[0_8px_32px_rgba(16,185,129,0.15)] border border-white/85">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-[0_4px_14px_rgba(16,185,129,0.35)]"
            style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
          >
            📖
          </div>
          <h1 className="text-xl font-extrabold text-[#064e3b]">Leitor Dislexy</h1>
          <p className="text-sm font-semibold text-[#047857]">Sua leitura acessível</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#065f46]">USUÁRIO</label>
            <input
              type="text"
              placeholder="Digite seu usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="bg-white/90 border-[1.5px] border-[#a7f3d0] rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#065f46]">SENHA</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="bg-white/90 border-[1.5px] border-[#a7f3d0] rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-3 rounded-xl transition-opacity disabled:opacity-60 shadow-[0_4px_14px_rgba(16,185,129,0.30)] mt-1"
            style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
          >
            {loading ? "Entrando..." : "→ Entrar"}
          </button>

          <Link
            to="/register"
            className="text-sm text-[#059669] font-medium text-center hover:text-[#10b981] transition-colors"
          >
            Não tem conta? <span className="font-bold underline">Cadastre-se</span>
          </Link>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Atualizar `App.tsx`**

Substituir a importação de `Login` por `LoginPage` e adicionar a rota `/register` (que será implementada na Task 2):

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import PDFLibrary from "./pages/PDFLibrary";
import PDFReadingView from "./pages/PDFReadingView";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/library" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/library" replace /> : <LoginPage />}
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <PDFLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library/:pdfId"
        element={
          <ProtectedRoute>
            <PDFReadingView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Deletar `Login.tsx`**

```bash
rm frontend/src/pages/Login.tsx
```

- [ ] **Step 4: Verificar compilação**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Testar manualmente no browser**
  - Acesse `http://localhost:5173/login`
  - Verifique: gradiente verde-menta, cartão glassmorphism, logo 📖, campos com borda verde
  - Teste login com credenciais corretas → redireciona para `/library`
  - Teste login com senha errada → exibe "Credenciais inválidas"
  - Verifique: link "Cadastre-se" navega para `/register` (página 404 por ora, ok)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/App.tsx
git rm frontend/src/pages/Login.tsx
git commit -m "feat: add LoginPage with green-mint glassmorphism design"
```

---

## Task 2: RegisterPage

**Files:**
- Create: `frontend/src/pages/RegisterPage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consome: `API_BASE`, `FIRST_LOGIN_KEY` (mesmo padrão da LoginPage)
- Produz: após cadastro + login automático, navega para `/library` com `state: { firstLogin: true }`

- [ ] **Step 1: Criar `RegisterPage.tsx`**

Criar `frontend/src/pages/RegisterPage.tsx`:

```tsx
import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const FIRST_LOGIN_KEY = (username: string) =>
  `dislexy_first_login_done_${username}`;

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      const registerRes = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => ({}));
        throw new Error(data.detail || "Erro ao cadastrar");
      }

      // login automático após cadastro
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!loginRes.ok) {
        throw new Error("Conta criada, mas não foi possível entrar. Tente fazer login.");
      }

      const data = await loginRes.json();
      login({ username: data.username, token: data.access_token });

      // sempre primeiro login após cadastro
      navigate("/library", { state: { firstLogin: true } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(145deg, #d1fae5 0%, #a7f3d0 30%, #bfdbfe 100%)",
      }}
    >
      <div className="bg-white/80 backdrop-blur-md rounded-3xl px-8 py-10 w-full max-w-sm shadow-[0_8px_32px_rgba(16,185,129,0.15)] border border-white/85">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-[0_4px_14px_rgba(16,185,129,0.35)]"
            style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
          >
            📖
          </div>
          <h1 className="text-xl font-extrabold text-[#064e3b]">Criar conta</h1>
          <p className="text-sm font-semibold text-[#047857]">É rápido e gratuito</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#065f46]">USUÁRIO</label>
            <input
              type="text"
              placeholder="Escolha um nome de usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="bg-white/90 border-[1.5px] border-[#a7f3d0] rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#065f46]">SENHA</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="bg-white/90 border-[1.5px] border-[#a7f3d0] rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#065f46]">CONFIRMAR SENHA</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="bg-white/90 border-[1.5px] border-[#a7f3d0] rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-[#10b981]"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-3 rounded-xl transition-opacity disabled:opacity-60 shadow-[0_4px_14px_rgba(16,185,129,0.30)] mt-1"
            style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
          >
            {loading ? "Criando conta..." : "✓ Criar conta"}
          </button>

          <Link
            to="/login"
            className="text-sm text-[#059669] font-medium text-center hover:text-[#10b981] transition-colors"
          >
            Já tem conta? <span className="font-bold underline">Entrar</span>
          </Link>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar rota `/register` em `App.tsx`**

Substituir o placeholder de `/register` do Task 1 pelo componente real:

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PDFLibrary from "./pages/PDFLibrary";
import PDFReadingView from "./pages/PDFReadingView";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/library" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/library" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/library" replace /> : <RegisterPage />}
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <PDFLibrary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library/:pdfId"
        element={
          <ProtectedRoute>
            <PDFReadingView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Verificar compilação**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Testar manualmente**
  - Acesse `http://localhost:5173/register`
  - Verifique: mesmo visual do login, título "Criar conta", 3 campos
  - Cadastre usuário novo → deve redirecionar para `/library`
  - Tente cadastrar o mesmo usuário → exibe "Usuário já existe"
  - Tente senhas diferentes → exibe "As senhas não coincidem" (sem chamar API)
  - Clique "Já tem conta? Entrar" → navega para `/login`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/RegisterPage.tsx frontend/src/App.tsx
git commit -m "feat: add RegisterPage with password confirmation and auto-login"
```

---

## Task 3: SettingsModal

**Files:**
- Create: `frontend/src/components/SettingsModal.tsx`
- Modify: `frontend/src/pages/PDFLibrary.tsx`

**Interfaces:**
- Consome: `useAuth()` → `user.username`, `useReadingSettings()` hook, `ReadingSettingsValue`
- Produz: `SettingsModal` — props `{ open: boolean; onClose: () => void }`
- PDFLibrary lê `location.state.firstLogin` via `useLocation()` para decidir se exibe o modal

- [ ] **Step 1: Criar `SettingsModal.tsx`**

Criar `frontend/src/components/SettingsModal.tsx`:

```tsx
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import ReadingSettings, { ReadingSettingsValue } from "./ReadingSettings";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const FIRST_LOGIN_KEY = (username: string) =>
  `dislexy_first_login_done_${username}`;

const DEFAULT: ReadingSettingsValue = {
  font_preference: "OpenDyslexic",
  font_size: 18,
  overlay_color: "#FFF3CD",
  ruler_enabled: true,
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReadingSettingsValue>(DEFAULT);
  const [saving, setSaving] = useState(false);

  if (!open || !user) return null;

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    try {
      await fetch(`${API_BASE}/students/me/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(settings),
      });
    } finally {
      setSaving(false);
      localStorage.setItem(FIRST_LOGIN_KEY(user.username), "1");
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay — não fecha ao clicar */}
      <div className="absolute inset-0 bg-[#061c44]/55 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm px-6 py-7">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">⚙️</div>
          <h2 className="text-lg font-extrabold text-[#064e3b]">Configure sua leitura</h2>
          <p className="text-sm text-gray-500">Personalize antes de começar</p>
        </div>

        <ReadingSettings value={settings} onChange={setSettings} />

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full text-white font-bold py-3 rounded-xl mt-6 transition-opacity disabled:opacity-60 shadow-[0_4px_14px_rgba(16,185,129,0.30)]"
          style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
        >
          {saving ? "Salvando..." : "✓ Começar a Ler"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrar `SettingsModal` em `PDFLibrary.tsx`**

Adicionar no topo de `PDFLibrary.tsx`:

```tsx
import { useLocation } from "react-router-dom";
import SettingsModal from "../components/SettingsModal";
```

Dentro do componente `PDFLibrary`, adicionar logo após a abertura da função:

```tsx
const location = useLocation();
const [showSettings, setShowSettings] = useState(
  !!(location.state as { firstLogin?: boolean } | null)?.firstLogin
);
```

E no JSX, antes do `</div>` final do return:

```tsx
<SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
```

- [ ] **Step 3: Verificar compilação**

```bash
cd frontend && npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 4: Testar fluxo completo de primeiro login**
  - Limpe o localStorage no DevTools (Application → Local Storage → Clear all)
  - Faça login com um usuário existente
  - Esperado: modal de configurações aparece sobre a biblioteca desfocada
  - Selecione uma fonte, ajuste tamanho
  - Clique "✓ Começar a Ler"
  - Esperado: modal fecha, biblioteca visível, flag `dislexy_first_login_done_<username>` no localStorage
  - Faça logout e login novamente com o mesmo usuário
  - Esperado: modal NÃO aparece

- [ ] **Step 5: Testar fluxo de cadastro novo**
  - Cadastre um usuário novo em `/register`
  - Esperado: vai direto para a biblioteca COM o modal aberto
  - Feche o modal → biblioteca disponível
  - Faça logout e login → modal não aparece

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/SettingsModal.tsx frontend/src/pages/PDFLibrary.tsx
git commit -m "feat: add SettingsModal shown only on first login via localStorage flag"
```
