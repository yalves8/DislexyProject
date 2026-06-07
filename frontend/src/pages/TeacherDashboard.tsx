import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import ActivityCard from "../components/ActivityCard";

interface Student {
  id: number;
  username: string;
  created_at: string;
}

interface Activity {
  id: number;
  original_text: string;
  adapted_text: string;
  created_at: string;
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${user!.token}` };

  useEffect(() => {
    fetch("/api/teacher/students", { headers })
      .then((r) => r.json())
      .then((data) => { setStudents(data); setLoading(false); });
  }, []);

  async function selectStudent(s: Student) {
    setSelected(s);
    const res = await fetch(`/api/teacher/students/${s.id}/activities`, { headers });
    setActivities(await res.json());
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-gray-800">🎓 Dashboard do Professor</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Olá, {user!.username}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Sair</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 flex gap-6">
        {/* Lista de alunos */}
        <aside className="w-64 flex-shrink-0">
          <h2 className="font-semibold text-gray-700 mb-3">Meus Alunos</h2>
          {loading && <p className="text-sm text-gray-400">Carregando...</p>}
          {!loading && students.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum aluno vinculado.</p>
          )}
          <div className="flex flex-col gap-2">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => selectStudent(s)}
                className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                  selected?.id === s.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                }`}
              >
                <p className="font-medium text-sm">{s.username}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Atividades do aluno selecionado */}
        <main className="flex-1">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              Selecione um aluno para ver as atividades
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-gray-700 mb-4">
                Atividades de <span className="text-blue-600">{selected.username}</span>
              </h2>
              {activities.length === 0
                ? <p className="text-gray-400 text-sm">Nenhuma atividade ainda.</p>
                : <div className="flex flex-col gap-4">{activities.map((a) => <ActivityCard key={a.id} activity={a} />)}</div>
              }
            </>
          )}
        </main>
      </div>
    </div>
  );
}
