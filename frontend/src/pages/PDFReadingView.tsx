import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AccessibilityDrawer from "../components/AccessibilityDrawer";
import AppNavbar from "../components/AppNavbar";
import ReadingRuler from "../components/ReadingRuler";
import ReadingToolbar, { type SpeechRate } from "../components/ReadingToolbar";
import { useAuth } from "../contexts/AuthContext";
import { useReadingSettings } from "../hooks/useReadingSettings";
import { getPDF, type PDFDocument } from "../services/pdfApi";

export default function PDFReadingView() {
  const navigate = useNavigate();
  const { pdfId } = useParams<{ pdfId: string }>();
  const { user } = useAuth();

  const [doc, setDoc] = useState<PDFDocument | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [docError, setDocError] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1);

  const { settings, setSettings, saveSettings, loading: settingsLoading, saving, error } = useReadingSettings();
  const readingStyle = {
    fontSize: settings.font_size,
    lineHeight: settings.line_height,
    letterSpacing: `${settings.letter_spacing}px`,
  };

  useEffect(() => {
    if (!user || !pdfId) return;

    let active = true;
    setLoadingDoc(true);
    setDocError("");

    getPDF(Number(pdfId), user.token)
      .then((data) => {
        if (active) setDoc(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setDocError(err instanceof Error ? err.message : "PDF não encontrado");
        }
      })
      .finally(() => {
        if (active) setLoadingDoc(false);
      });

    return () => {
      active = false;
    };
  }, [user, pdfId]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const visibleText = useMemo(() => {
    const raw = doc?.adapted_text ?? "";
    return raw
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^\*+\s*/gm, "- ");
  }, [doc]);

  const paragraphs = useMemo(() => visibleText.split(/\n\n+/).filter(Boolean), [visibleText]);

  useEffect(() => {
    if (!isPlaying || !doc) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(visibleText);
    utterance.lang = "pt-BR";
    utterance.rate = speechRate;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  }, [isPlaying, doc, speechRate, visibleText]);

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

  if (loadingDoc) {
    return (
      <div className="min-h-screen bg-[#f8f7f3] text-[#061c44]">
        <AppNavbar onAccessibility={() => setDrawerOpen(true)} showDesktopAccessibility />
        <main className="mx-auto flex max-w-[806px] flex-col gap-6 px-5 pb-12 pt-10">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-48 rounded-lg bg-gray-200" />
            <div className="h-16 rounded-xl bg-gray-200" />
            <div className="h-[400px] rounded-xl bg-gray-200" />
          </div>
        </main>
      </div>
    );
  }

  if (docError || !doc) {
    return (
      <div className="min-h-screen bg-[#f8f7f3] text-[#061c44]">
        <AppNavbar onAccessibility={() => setDrawerOpen(true)} showDesktopAccessibility />
        <main className="mx-auto flex max-w-[806px] flex-col items-center gap-6 px-5 pb-12 pt-20 text-center">
          <p className="text-lg font-semibold text-red-600">{docError || "PDF não encontrado"}</p>
          <button
            type="button"
            onClick={() => navigate("/library")}
            className="inline-flex items-center gap-2 rounded-lg border border-[#cbd2dc] bg-white px-4 py-2 text-sm font-bold text-[#061c44] shadow-sm transition hover:bg-[#f1f4f8]"
          >
            <span aria-hidden="true">←</span>
            Voltar à Biblioteca
          </button>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${settings.high_contrast ? "bg-[#050b14] text-white" : "bg-[#f8f7f3] text-[#061c44]"}`}
      style={readingStyle}
    >
      <AppNavbar onAccessibility={() => setDrawerOpen(true)} showDesktopAccessibility />

      <main className="mx-auto flex max-w-[806px] flex-col gap-6 px-5 pb-12 pt-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/library")}
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
          onTogglePlayback={handleTogglePlayback}
          onRateChange={handleRateChange}
        />

        <article className="relative overflow-hidden rounded-xl border border-[#d7dce4] bg-white px-[30px] py-[28px] shadow-[0_8px_18px_rgba(15,23,42,0.13)] sm:px-[30px]">
          <div className="relative">
            <h1 className="mb-7 text-2xl font-black text-[#061c44]">{doc.filename}</h1>

            <div className="relative rounded-lg">
              <div className="absolute inset-0 rounded-lg opacity-10" style={{ backgroundColor: settings.overlay_color }} />
              <div
                className={`relative z-0 min-h-[430px] whitespace-pre-wrap ${settings.high_contrast ? "text-white" : "text-[#061c44]"}`}
                style={{
                  fontSize: settings.font_size,
                  lineHeight: settings.line_height,
                  letterSpacing: `${settings.letter_spacing}px`,
                }}
              >
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="mb-5">
                    {paragraph}
                  </p>
                ))}
              </div>
              <ReadingRuler enabled={settings.ruler_enabled} overlayColor={settings.overlay_color} />
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => navigate("/library")}
                className="rounded-lg bg-[#152b52] px-8 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#0e2144]"
              >
                ✅ Concluir Leitura
              </button>
            </div>
          </div>
        </article>

        <p className="text-center text-sm font-medium text-[#52627f]">
          💡 Toque no texto e arraste para mover a régua (mobile) · Mova o mouse sobre o texto para posicionar a régua de leitura (desktop)
        </p>
      </main>

      <AccessibilityDrawer
        open={drawerOpen}
        settings={settings}
        loading={settingsLoading}
        saving={saving}
        error={error}
        onChange={setSettings}
        onClose={() => setDrawerOpen(false)}
        onSave={saveSettings}
      />
    </div>
  );
}
