import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import AccessibilityDrawer from "../components/AccessibilityDrawer";
import ReadingRuler from "../components/ReadingRuler";
import ReadingToolbar, { type SpeechRate } from "../components/ReadingToolbar";
import StudentNavbar from "../components/StudentNavbar";
import { findMaterial } from "../data/mockLibrary";
import { useReadingSettings } from "../hooks/useReadingSettings";

export default function StudentReadingView() {
  const navigate = useNavigate();
  const { subjectId, materialId } = useParams();
  const { subject, material } = findMaterial(subjectId, materialId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [simplified, setSimplified] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1);
  const { settings, setSettings, saveSettings, loading, saving, error } = useReadingSettings();

  const visibleText = simplified ? material?.adaptedText ?? "" : material?.originalText ?? "";
  const paragraphs = useMemo(() => visibleText.split(/\n\n+/).filter(Boolean), [visibleText]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !material) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(visibleText);
    utterance.lang = "pt-BR";
    utterance.rate = speechRate;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  }, [isPlaying, material, speechRate, visibleText]);

  if (!subject || !material) return <Navigate to="/student/portal" replace />;

  function handleTogglePlayback() {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
  }

  function handleRateChange(rate: SpeechRate) {
    setSpeechRate(rate);
  }

  function handleToggleSimplified() {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setSimplified((current) => !current);
  }

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#061c44]">
      <StudentNavbar onAccessibility={() => setDrawerOpen(true)} />

      <main className="mx-auto flex max-w-[806px] flex-col gap-6 px-5 pb-12 pt-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/student/portal")}
            className="inline-flex items-center gap-2 rounded-lg border border-[#cbd2dc] bg-white px-4 py-2 text-sm font-bold text-[#061c44] shadow-sm transition hover:bg-[#f1f4f8]"
          >
            <span aria-hidden="true">←</span>
            Voltar à Biblioteca
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-[#cbd2dc] bg-white px-4 py-2 text-sm font-bold text-[#061c44] shadow-sm transition hover:bg-[#f1f4f8] md:inline-flex"
          >
            <span aria-hidden="true">⚙</span>
            Ajustes
          </button>
        </header>

        <ReadingToolbar
          isPlaying={isPlaying}
          speechRate={speechRate}
          simplified={simplified}
          onTogglePlayback={handleTogglePlayback}
          onRateChange={handleRateChange}
          onToggleSimplified={handleToggleSimplified}
        />

        <article className="relative overflow-hidden rounded-xl border border-[#d7dce4] bg-white px-[30px] py-[28px] shadow-[0_8px_18px_rgba(15,23,42,0.13)] sm:px-[30px]">
          <div className="relative">
            <h1 className="mb-7 text-2xl font-black text-[#061c44]">{subject.name}: {material.title}</h1>

            <div className="relative rounded-lg">
              <div className="absolute inset-0 rounded-lg opacity-10" style={{ backgroundColor: settings.overlay_color }} />
              <div
                className="relative z-0 min-h-[430px] whitespace-pre-wrap text-[#061c44]"
                style={{
                  fontFamily: settings.font_preference,
                  fontSize: settings.font_size,
                  lineHeight: 1.9,
                }}
              >
                {paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mb-5">
                    {paragraph}
                  </p>
                ))}
              </div>
              <ReadingRuler enabled={settings.ruler_enabled} />
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => navigate("/student/portal")}
                className="rounded-lg bg-[#152b52] px-8 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#0e2144]"
              >
                ✅ Concluir Leitura
              </button>
            </div>
          </div>
        </article>

        <p className="text-center text-sm font-medium text-[#52627f]">
          💡 Dica: Mova o mouse sobre o texto para posicionar a régua de leitura
        </p>
      </main>

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
    </div>
  );
}
