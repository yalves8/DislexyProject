import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessibilityDrawer from "../components/AccessibilityDrawer";
import AdaptedStudyMaterial from "../components/AdaptedStudyMaterial";
import AppNavbar from "../components/AppNavbar";
import { useAuth } from "../contexts/AuthContext";
import { useReadingSettings } from "../hooks/useReadingSettings";
import { downloadAdaptationPdf } from "../services/adaptationPdf";
import {
  loadAdaptationHistory,
  saveAdaptationHistory,
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
    fontFamily: settings.font_preference,
    fontSize: settings.font_size,
    lineHeight: settings.line_height,
    letterSpacing: `${settings.letter_spacing}px`,
  };

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setSelectedItem(null);
      return;
    }

    const loaded = loadAdaptationHistory(user.username);
    setHistory(loaded);
    setSelectedItem((current) => {
      if (!current) return null;
      return loaded.find((item) => item.id === current.id) ?? null;
    });
  }, [user]);

  function persistHistory(items: AdaptationHistoryItem[]) {
    if (!user) return;
    setHistory(items);
    saveAdaptationHistory(user.username, items);
  }

  function handleDelete(item: AdaptationHistoryItem) {
    const confirmed = window.confirm("Excluir esta adaptação do histórico?");
    if (!confirmed) return;

    const nextHistory = history.filter((historyItem) => historyItem.id !== item.id);
    persistHistory(nextHistory);
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
      className={`min-h-screen ${settings.high_contrast ? "bg-[#050b14] text-white" : "bg-[#f3f5ef] text-[#0f2d4a]"}`}
      style={readingStyle}
    >
      <AppNavbar onAccessibility={() => setDrawerOpen(true)} showDesktopAccessibility />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-10 pt-5">
        <section className={`rounded-lg border p-5 ${settings.high_contrast ? "border-white/30 bg-white/5" : "border-[#d8e2ea] bg-white"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black">Histórico</h1>
              <p className={`mt-1 text-sm ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                Suas adaptações salvas
              </p>
            </div>

            {user && (
              <span
                className={`w-fit rounded-lg px-3 py-2 text-sm font-black ${
                  historyLimitReached ? "bg-[#fff7df] text-[#76520a]" : "bg-[#eef8f1] text-[#2c6e63]"
                }`}
              >
                {history.length}/{SAVED_ADAPTATION_LIMIT}
              </span>
            )}
          </div>

          {!user ? (
            <div className="mt-6 rounded-lg border border-dashed border-[#d8e2ea] bg-[#fbfcf8] p-5">
              <h2 className="text-lg font-black">Entre para acessar seu histórico.</h2>
              <p className="mt-2 text-sm text-[#52627f]">
                As adaptações só ficam salvas quando você está logado.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login", { state: { from: "/historico" } })}
                className="mt-4 min-h-11 rounded-lg bg-[#0f2d4a] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173f66]"
              >
                Entrar
              </button>
            </div>
          ) : (
            <>
              <p className={`mt-4 text-sm ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                Plano gratuito: 5 adaptações salvas.
              </p>

              {statusMessage && (
                <p className="mt-4 rounded-lg border border-[#b9d7c7] bg-[#eef8f1] px-4 py-3 text-sm font-bold text-[#2c6e63]">
                  {statusMessage}
                </p>
              )}

              {history.length === 0 ? (
                <p className={`mt-4 rounded-lg border border-dashed p-4 text-sm ${settings.high_contrast ? "border-white/30 text-[#dce8f3]" : "border-[#d8e2ea] text-[#52627f]"}`}>
                  Nenhuma adaptação salva ainda.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {history.map((item) => (
                    <article
                      key={item.id}
                      className={`min-w-0 rounded-lg border p-4 ${
                        settings.high_contrast ? "border-white/30 bg-white/5" : "border-[#d8e2ea] bg-[#fbfcf8]"
                      }`}
                    >
                      <h2 className="truncate font-black" title={item.fileName}>
                        {item.fileName}
                      </h2>
                      <p className={`mt-2 text-sm ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                        Páginas {item.startPage}-{item.endPage}
                      </p>
                      <p className={`mt-1 text-sm ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                        {formatHistoryDate(item.createdAt)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setStatusMessage("");
                          }}
                          className="rounded-lg bg-[#0f2d4a] px-3 py-2 text-sm font-black text-white transition hover:bg-[#173f66]"
                        >
                          Abrir
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownload(item)}
                          disabled={isDownloadGenerating}
                          className="rounded-lg border border-[#b9cbd9] bg-white px-3 py-2 text-sm font-black text-[#0f2d4a] transition hover:bg-[#f4f8fb] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {downloadState.id === item.id && downloadState.status === "generating" ? "Gerando..." : "Baixar PDF"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 transition hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>

                      {downloadState.id === item.id && downloadState.message && (
                        <p
                          className={`mt-3 text-sm font-bold ${
                            downloadState.status === "error" ? "text-red-700" : "text-[#2c6e63]"
                          }`}
                        >
                          {downloadState.message}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {user && selectedItem && (
          <AdaptedStudyMaterial
            material={selectedItem.material}
            settings={settings}
            onDownload={() => void handleDownload(selectedItem)}
            isDownloading={downloadState.id === selectedItem.id && downloadState.status === "generating"}
            downloadMessage={downloadState.id === selectedItem.id ? downloadState.message : ""}
            downloadStatus={downloadState.id === selectedItem.id ? downloadState.status : "idle"}
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
