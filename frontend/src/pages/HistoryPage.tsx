import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import AccessibilityDrawer from "../components/AccessibilityDrawer";
import AdaptedStudyMaterial from "../components/AdaptedStudyMaterial";
import AppNavbar from "../components/AppNavbar";
import { useAuth } from "../contexts/AuthContext";
import { useReadingSettings } from "../hooks/useReadingSettings";
import { downloadAdaptationPdf } from "../services/adaptationPdf";
import {
  loadHistory,
  removeFromHistory,
  SAVED_ADAPTATION_LIMIT,
  type AdaptationHistoryItem,
} from "../services/adaptationHistory";

type DownloadStatus = "idle" | "generating" | "success" | "error";

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, setSettings, saveSettings, loading, saving, error } = useReadingSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<AdaptationHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AdaptationHistoryItem | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadState, setDownloadState] = useState<{
    id: string | null;
    status: DownloadStatus;
    message: string;
  }>({ id: null, status: "idle", message: "" });

  const isDownloadGenerating = downloadState.status === "generating";
  const historyLimitReached = history.length >= SAVED_ADAPTATION_LIMIT;
  const readingStyle = {
    fontSize: settings.font_size,
    lineHeight: settings.line_height,
    letterSpacing: `${settings.letter_spacing}px`,
  };

  if (!user) return <Navigate to="/login" replace />;

  useEffect(() => {
    setHistory(loadHistory(user?.username));
  }, [user?.username]);

  function handleDelete(item: AdaptationHistoryItem) {
    const confirmed = window.confirm("Excluir esta adaptação do histórico?");
    if (!confirmed) return;
    removeFromHistory(item.id, user?.username);
    setHistory(loadHistory(user?.username));
    if (selectedItem?.id === item.id) setSelectedItem(null);
    setStatusMessage("Adaptação excluída do histórico.");
  }

  async function handleDownload(item: AdaptationHistoryItem) {
    if (isDownloadGenerating) return;

    setDownloadState({ id: item.id, status: "generating", message: "" });

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      downloadAdaptationPdf({
        fileName: item.fileName,
        startPage: item.startPage,
        endPage: item.endPage,
        createdAt: item.createdAt,
        material: item.material,
      });
      setDownloadState({ id: item.id, status: "success", message: "PDF baixado com sucesso." });
      window.setTimeout(() => {
        setDownloadState((current) =>
          current.id === item.id && current.status === "success"
            ? { id: null, status: "idle", message: "" }
            : current,
        );
      }, 2500);
    } catch {
      setDownloadState({ id: item.id, status: "error", message: "Não foi possível baixar o PDF. Tente novamente." });
    }
  }

  return (
    <div
      className={`min-h-screen ${settings.high_contrast ? "bg-[#050b14] text-white" : "text-[#064e3b]"}`}
      style={
        settings.high_contrast
          ? readingStyle
          : { ...readingStyle, background: "linear-gradient(145deg, #d1fae5 0%, #a7f3d0 30%, #bfdbfe 100%)" }
      }
    >
      <AppNavbar onAccessibility={() => setDrawerOpen(true)} showDesktopAccessibility />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-10 pt-5">
        <section
          className={`rounded-2xl border p-5 ${
            settings.high_contrast
              ? "border-white/30 bg-white/5"
              : "border-white/60 bg-white/80 shadow-[0_8px_32px_rgba(16,185,129,0.10)] backdrop-blur-sm"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold">Histórico</h1>
              <p className={`mt-1 text-sm font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                {user ? `Histórico de ${user.username}` : "Suas adaptações como visitante"}
              </p>
            </div>
            <span
              className={`w-fit rounded-xl px-3 py-2 text-sm font-bold ${
                historyLimitReached ? "bg-[#fff7df] text-[#76520a]" : "bg-[#d1fae5] text-[#064e3b]"
              }`}
            >
              {history.length}/{SAVED_ADAPTATION_LIMIT}
            </span>
          </div>

          {statusMessage && (
            <p className="mt-4 rounded-xl border border-[#6ee7b7] bg-[#d1fae5] px-4 py-3 text-sm font-bold text-[#064e3b]">
              {statusMessage}
            </p>
          )}

          {history.length === 0 ? (
            <div
              className={`mt-5 rounded-2xl border border-dashed p-6 text-center ${
                settings.high_contrast ? "border-white/30" : "border-[#a7f3d0]"
              }`}
            >
              <p className={`text-sm font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                Nenhuma adaptação salva ainda.
              </p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-4 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(16,185,129,0.30)] transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
              >
                Adaptar um PDF
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {history.map((item) => (
                <article
                  key={item.id}
                  className={`min-w-0 rounded-2xl border p-4 ${
                    settings.high_contrast ? "border-white/30 bg-white/5" : "border-[#a7f3d0] bg-white/90"
                  }`}
                >
                  <h2 className="truncate font-extrabold" title={item.fileName}>
                    {item.fileName}
                  </h2>
                  <p className={`mt-2 text-sm font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                    Páginas {item.startPage}–{item.endPage}
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                    {formatHistoryDate(item.createdAt)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setStatusMessage("");
                      }}
                      className="rounded-xl px-3 py-2 text-sm font-bold text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)] transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownload(item)}
                      disabled={isDownloadGenerating}
                      className="rounded-xl border border-[#a7f3d0] bg-white/80 px-3 py-2 text-sm font-bold text-[#064e3b] transition hover:bg-[#f0fdf4] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadState.id === item.id && downloadState.status === "generating" ? "Gerando..." : "Baixar PDF"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                    >
                      Excluir
                    </button>
                  </div>

                  {downloadState.id === item.id && downloadState.message && (
                    <p
                      className={`mt-3 text-sm font-bold ${
                        downloadState.status === "error" ? "text-red-700" : "text-[#064e3b]"
                      }`}
                    >
                      {downloadState.message}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedItem && (
          <AdaptedStudyMaterial
            material={selectedItem.material}
            settings={settings}
            onDownload={() => void handleDownload(selectedItem)}
            isDownloading={downloadState.id === selectedItem.id && downloadState.status === "generating"}
            downloadMessage={downloadState.id === selectedItem.id ? downloadState.message : ""}
            downloadStatus={downloadState.id === selectedItem.id ? downloadState.status : "idle"}
            onToggleRuler={() => setSettings((s) => ({ ...s, ruler_enabled: true }))}
          />
        )}
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
