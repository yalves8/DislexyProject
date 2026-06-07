import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ReadingSettings from "../components/ReadingSettings";

const DEFAULT_SETTINGS = {
  font_preference: "OpenDyslexic",
  font_size: 18,
  overlay_color: "#FFF3CD",
  ruler_enabled: true,
};

export default function StudentLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Credenciais inválidas");
      }

      const data = await res.json();
      if (data.role !== "student") throw new Error("Acesso negado para este perfil");

      login({ username: data.username, role: data.role, token: data.access_token });

      // Salva as configurações de leitura
      await fetch("/api/students/me/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.access_token}`,
        },
        body: JSON.stringify(settings),
      });

      navigate("/student/portal");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Portal de Leitura</h1>
      <p className="text-blue-500 text-sm mb-8">Bem-vindo ao seu espaço de leitura personalizado</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-6">
        {/* Credenciais */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Usuário</label>
            <input
              type="text"
              placeholder="Digite seu usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Senha</label>
            <input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Configurações de leitura */}
        <ReadingSettings value={settings} onChange={setSettings} />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-400 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? "Entrando..." : "→ Entrar no Portal"}
        </button>
      </form>
    </div>
  );
}
