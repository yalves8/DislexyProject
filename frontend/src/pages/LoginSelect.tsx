import { useNavigate } from "react-router-dom";

export default function LoginSelect() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Portal de Leitura</h1>
      <p className="text-gray-500 mb-12">Escolha como você quer acessar</p>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        {/* Professor */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0-6l-3.5 2M12 20l3.5-2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Sou Professor</h2>
          <p className="text-gray-500 text-center text-sm">
            Gerencie turmas, crie atividades e acompanhe o progresso dos alunos
          </p>
          <button
            onClick={() => navigate("/teacher/login")}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-full transition-colors"
          >
            Acessar como Professor
          </button>
        </div>

        {/* Aluno */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Sou Aluno</h2>
          <p className="text-gray-500 text-center text-sm">
            Acesse suas atividades, leia textos e acompanhe seu progresso
          </p>
          <button
            onClick={() => navigate("/student/login")}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-full transition-colors"
          >
            Acessar como Aluno
          </button>
        </div>
      </div>
    </div>
  );
}
