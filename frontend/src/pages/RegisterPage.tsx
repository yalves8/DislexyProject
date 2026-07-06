import { useCallback, useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AppLogo from "../components/AppLogo";
import GoogleSignInButton from "../components/GoogleSignInButton";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError("");
      setGoogleLoading(true);

      try {
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Não foi possível criar conta com Google.");
        }

        const data = await res.json();
        login({ username: data.username, token: data.access_token });
        navigate("/library");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Não foi possível criar conta com Google.");
      } finally {
        setGoogleLoading(false);
      }
    },
    [login, navigate],
  );

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

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
      navigate("/library");
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
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3 flex h-16 items-center justify-center">
            <AppLogo />
          </div>
          <h1 className="text-xl font-extrabold text-[#064e3b]">Criar conta</h1>
          <p className="text-sm font-semibold text-[#047857]">Salve histórico e preferências</p>
        </div>

        <div className="flex flex-col gap-4">
          <GoogleSignInButton
            text="signup_with"
            onCredential={handleGoogleCredential}
            onError={handleGoogleError}
          />
          {googleLoading && <p className="text-center text-sm font-semibold text-[#047857]">Criando conta com Google...</p>}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-400">ou</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
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
            disabled={loading || googleLoading}
            className="w-full text-white font-bold py-3 rounded-xl transition-opacity disabled:opacity-60 shadow-[0_4px_14px_rgba(16,185,129,0.30)] mt-1"
            style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
          >
            {loading ? "Criando conta..." : "✓ Criar conta"}
          </button>

          <Link
            to="/"
            className="text-sm text-[#064e3b] font-bold text-center hover:text-[#10b981] transition-colors"
          >
            Voltar ao leitor
          </Link>

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
