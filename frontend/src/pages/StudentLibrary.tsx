import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessibilityDrawer from "../components/AccessibilityDrawer";
import StudentNavbar from "../components/StudentNavbar";
import SubjectCard from "../components/SubjectCard";
import { librarySubjects } from "../data/mockLibrary";
import { useReadingSettings } from "../hooks/useReadingSettings";

export default function StudentLibrary() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { settings, setSettings, saveSettings, loading, saving, error } = useReadingSettings();

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#061c44]">
      <StudentNavbar onAccessibility={() => setDrawerOpen(true)} />

      <main className="mx-auto flex max-w-[1040px] flex-col gap-[30px] px-10 pb-12 pt-10 sm:px-14 lg:px-20">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-[30px] font-black leading-tight tracking-normal text-[#061c44]">
              Minha Biblioteca
              <span className="text-2xl" aria-hidden="true">
                📚
              </span>
            </h1>
            <p className="mt-2 text-[15px] font-medium text-[#4d5e7a]">Escolha uma matéria para começar a aprender</p>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-[#cbd2dc] bg-white px-4 py-2 text-[13px] font-bold text-[#061c44] shadow-sm transition hover:bg-[#f1f4f8] md:inline-flex"
          >
            <span aria-hidden="true">⚙</span>
            Acessibilidade
          </button>
        </header>

        <section className="flex min-h-[84px] flex-col gap-3 rounded-xl bg-[#ffedbd] px-5 py-4 text-[#061c44] shadow-[0_4px_12px_rgba(15,23,42,0.14)] ring-1 ring-[#e8d6a8] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <span className="inline-flex h-11 w-11 items-center justify-center" aria-hidden="true">
              <svg className="h-9 w-9" viewBox="0 0 48 48" fill="none">
                <path
                  d="M28.2 5.8c1.4 7.4-3.5 10.4-7.2 14.1-3.1 3.1-5 6.2-5 10.4 0 6.3 4.7 11.2 10.8 11.2 6.5 0 11.7-4.8 11.7-12 0-5.7-3.3-10.4-7.6-14.4.2 3.7-1 6-3.4 7.9.4-5.9-2.1-11-7.4-15.2Z"
                  fill="#ff7a3d"
                />
                <path
                  d="M24.3 40.2c-4.2-1-6.6-4.2-6.6-8.2 0-3.4 1.7-6 4.3-8.4 1.8-1.7 3.9-3.4 4.5-6.4 3.6 3.7 5.4 7.5 4.8 11.7 2.1-1.1 3.3-2.7 3.7-5 1.6 2.2 2.5 4.5 2.5 7.2 0 5.9-4.8 10.3-10.8 10.3-.8 0-1.6-.1-2.4-.2Z"
                  fill="#ff4f6d"
                  opacity="0.85"
                />
                <path
                  d="M25.9 39.9c-3.1-.8-5.3-3.1-5.3-6.3 0-2.8 1.6-5 4.1-7.4.3 3.1 1.8 4.9 4.3 6.1 1.1-1 1.7-2.2 1.8-3.8 2 2.8 1.6 6.9-.7 9.2-1.2 1.3-2.7 2-4.2 2.2Z"
                  fill="#ffd35c"
                />
              </svg>
            </span>
            <div>
              <p className="text-2xl font-black leading-tight">7 dias</p>
              <p className="text-sm font-medium text-[#4d5e7a]">Sequência de estudo!</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-[#40506d]">
            Continue assim! <span aria-hidden="true">🎉</span>
          </p>
        </section>

        <section className="grid grid-cols-1 gap-x-[22px] gap-y-[22px] md:grid-cols-2 lg:grid-cols-3">
          {librarySubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onClick={() => navigate(`/student/portal/${subject.id}/${subject.materials[0].id}`)}
            />
          ))}
        </section>

        <footer className="pt-1 text-center">
          <p className="text-[15px] italic font-medium text-[#52627f]">
            "Aprender no seu ritmo é aprender melhor!" <span aria-hidden="true">💙</span>
          </p>
        </footer>

        <AccessibilityDrawer
          open={drawerOpen}
          settings={settings}
          loading={loading}
          saving={saving}
          error={error}
          onChange={setSettings}
          onClose={() => setDrawerOpen(false)}
          onSave={saveSettings}
        />
      </main>
    </div>
  );
}
