import { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import ActivityCard from "../components/ActivityCard";

interface Activity {
  id: number;
  original_text: string;
  adapted_text: string;
  created_at: string;
}

export default function StudentPortal() {
  const { user, logout } = useAuth();

  const [adapted, setAdapted] = useState("");
  const [original, setOriginal] = useState("");
  const [rawContext, setRawContext] = useState("");
  const [question, setQuestion] = useState("");
  const [, setAnswer] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingAdapt, setLoadingAdapt] = useState(false);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [tab, setTab] = useState<"atividade" | "historico">("atividade");
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Bearer ${user!.token}` };

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingAdapt(true);
    setAdapted("");
    setOriginal("");
    setShowTutor(false);
    setHistory([]);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/students/adapt-image", { method: "POST", headers, body: form });
    const data = await res.json();
    setAdapted(data.adapted);
    setOriginal(data.original);
    setRawContext(data.raw);
    setLoadingAdapt(false);

    // Salva atividade automaticamente
    await fetch("/api/students/activities", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ original_text: data.original, adapted_text: data.adapted }),
    });
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoadingAsk(true);

    const res = await fetch("/api/students/ask", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ context: rawContext, question }),
    });
    const data = await res.json();
    setHistory((h) => [{ q: question, a: data.answer }, ...h]);
    setQuestion("");
    setAnswer(data.answer);
    setLoadingAsk(false);
  }

  async function loadHistory() {
    const res = await fetch("/api/students/activities", { headers });
    setActivities(await res.json());
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-gray-800">📚 Portal de Leitura</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Olá, {user!.username}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Sair</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["atividade", "historico"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === "historico") loadHistory(); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === t ? "bg-blue-500 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {t === "atividade" ? "Nova Atividade" : "Histórico"}
            </button>
          ))}
        </div>

        {tab === "atividade" && (
          <div className="flex flex-col gap-6">
            {/* Upload */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-700 mb-4">1. Envie a foto do exercício</h2>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
              >
                Clique para escolher uma imagem
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>

            {/* Resultado */}
            {loadingAdapt && <p className="text-center text-gray-500 animate-pulse">Lendo e adaptando...</p>}

            {adapted && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
                <h2 className="font-semibold text-gray-700">2. Versão adaptada para você 🎯</h2>
                {original && (
                  <details className="text-sm text-gray-400">
                    <summary className="cursor-pointer">Ver texto original</summary>
                    <p className="mt-2 text-gray-500">{original}</p>
                  </details>
                )}
                <p className="text-gray-700 leading-relaxed">{adapted}</p>
                {!showTutor && (
                  <button
                    onClick={() => setShowTutor(true)}
                    className="self-start text-sm text-blue-500 hover:underline"
                  >
                    Tenho uma dúvida sobre isso 🤔
                  </button>
                )}
              </div>
            )}

            {/* Tutor */}
            {showTutor && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
                <h2 className="font-semibold text-gray-700">3. Pergunte ao tutor 💬</h2>
                <form onSubmit={handleAsk} className="flex gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="O que você não entendeu?"
                    className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                  <button
                    type="submit"
                    disabled={loadingAsk}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
                  >
                    {loadingAsk ? "..." : "🚀"}
                  </button>
                </form>
                {history.map((h, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-gray-700">Você: {h.q}</p>
                    <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">Tutor: {h.a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "historico" && (
          <div className="flex flex-col gap-4">
            {activities.length === 0
              ? <p className="text-center text-gray-400 py-12">Nenhuma atividade ainda.</p>
              : activities.map((a) => <ActivityCard key={a.id} activity={a} />)
            }
          </div>
        )}
      </div>
    </div>
  );
}
