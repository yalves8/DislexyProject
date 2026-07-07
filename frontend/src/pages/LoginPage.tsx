import { useState, FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AppLogo from "../components/AppLogo";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/library";

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
      navigate(redirectTo);
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
        <div className="flex flex-col items-center mb-6">
          <div className="mb-3 flex h-16 items-center justify-center">
            <AppLogo />
          </div>
          <h1 className="text-xl font-extrabold text-[#064e3b]">Entrar</h1>
          <p className="text-sm font-semibold text-[#047857]">Salve histórico e preferências</p>
        </div>

        <Link
          to="/"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#a7f3d0] bg-white/60 px-4 py-2.5 text-sm font-bold text-[#047857] transition-colors hover:bg-[#d1fae5] mb-4"
        >
          Continuar sem conta
          <span aria-hidden>→</span>
        </Link>

        <p className="mb-4 text-center text-xs text-[#6b7280]">
          Login é opcional — adapte PDFs sem criar conta.
        </p>

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
            {loading ? "Entrando..." : "Entrar"}
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
