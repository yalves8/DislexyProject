import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function TeacherLogin() {
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
      if (data.role !== "teacher") throw new Error("Acesso negado para este perfil");

      login({ username: data.username, role: data.role, token: data.access_token });
      navigate("/teacher/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Portal de Leitura</h1>
      <p className="text-gray-500 text-sm mb-8">Área do Professor</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
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

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
