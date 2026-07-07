import { type ChangeEvent, type DragEvent, lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AccessibilityDrawer from "../components/AccessibilityDrawer";

const PDFPageRangePicker = lazy(() => import("../components/PDFPageRangePicker"));
import AdaptedStudyMaterial, {
  type AdaptedStudyMaterialData,
  type GlossaryItem,
  type QuizItem,
  type StudyCard,
} from "../components/AdaptedStudyMaterial";
import AppNavbar from "../components/AppNavbar";
import HistoricoGuestModal from "../components/HistoricoGuestModal";
import { useReadingSettings } from "../hooks/useReadingSettings";
import {
  adaptPDFSelection,
  extractPDFSelection,
  getPDFPageInfo,
  type AdaptPDFSelectionResponse,
} from "../services/pdfReaderApi";
import { downloadAdaptationPdf } from "../services/adaptationPdf";
import {
  addToHistory,
  createHistoryId,
  removeLegacyHistory,
  type AdaptationHistoryItem,
} from "../services/adaptationHistory";
import { useAuth } from "../contexts/AuthContext";

const FREE_PAGE_LIMIT = 10;

type ProcessingPhase = "idle" | "loading-pdf" | "extracting" | "retrieving-rag" | "adapting" | "rendering";

interface LocalPDFInfo {
  file: File;
  pageCount: number;
  sizeLabel: string;
  pageCountSource: "backend" | "estimated";
}

interface ParsedRange {
  start: number;
  end: number;
  count: number;
}

type DownloadStatus = "idle" | "generating" | "success" | "error";

const PROCESSING_LABELS: Record<ProcessingPhase, string> = {
  idle: "",
  "loading-pdf": "Abrindo seu PDF...",
  extracting: "Lendo o trecho escolhido...",
  "retrieving-rag": "Organizando as ideias principais...",
  adapting: "Montando o material adaptado...",
  rendering: "Quase pronto...",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function estimatePdfPageCount(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("iso-8859-1").decode(buffer);
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return Math.max(1, matches?.length ?? 1);
}


function normalizeCards(value: AdaptPDFSelectionResponse["adaptation"]["keyIdeas"], fallback: StudyCard[]): StudyCard[] {
  if (!Array.isArray(value)) return fallback;
  const cards = value
    .filter((item) => item?.title || item?.description)
    .map((item) => ({
      title: item.title || "Ideia importante",
      description: item.description || "Revise este ponto com atenção.",
    }));
  return cards.length ? cards : fallback;
}

function normalizeGlossary(value: AdaptPDFSelectionResponse["adaptation"]["glossary"], fallback: GlossaryItem[]): GlossaryItem[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((item) => item?.term || item?.definition)
    .map((item) => ({
      term: item.term || "Termo importante",
      definition: item.definition || "Definição simples.",
    }));
  return items.length ? items : fallback;
}

function normalizeList(value: string[] | undefined, fallback: string[]): string[] {
  const items = Array.isArray(value) ? value.filter(Boolean) : [];
  return items.length ? items : fallback;
}

function normalizeQuiz(value: AdaptPDFSelectionResponse["adaptation"]["quiz"], fallback: QuizItem[]): QuizItem[] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((item) => item?.question || item?.answer)
    .map((item) => ({
      question: item.question || "O que você entendeu deste trecho?",
      answer: item.answer || "Explique com suas palavras.",
    }));
  return items.length ? items : fallback;
}

function fallbackMaterialTitle(fileName: string): string {
  return fileName.replace(/\.pdf$/i, "") || "PDF selecionado";
}

function buildAdaptedMaterial(
  pdfInfo: LocalPDFInfo,
  range: ParsedRange,
  response: AdaptPDFSelectionResponse,
): AdaptedStudyMaterialData {
  const fallbackCards = [
    { title: "Ideia principal", description: "Leia o resumo e encontre o ponto central do trecho." },
    { title: "Termos importantes", description: "Revise palavras difíceis antes de estudar os detalhes." },
    { title: "Revisão ativa", description: "Use o quiz para conferir se você entendeu." },
  ];
  const fallbackQuiz = [
    {
      question: "Qual é a ideia mais importante deste trecho?",
      answer: "Responda com uma frase curta usando suas palavras.",
    },
  ];

  return {
    title: response.adaptation.title || `Estudo guiado: ${fallbackMaterialTitle(pdfInfo.file.name)}`,
    sourceLabel: `PDF: ${pdfInfo.file.name} · páginas ${range.start}-${range.end} de ${pdfInfo.pageCount}`,
    summary: response.adaptation.summary || "O trecho foi organizado em partes menores para facilitar o estudo.",
    keyIdeas: normalizeCards(response.adaptation.keyIdeas, fallbackCards),
    glossary: normalizeGlossary(response.adaptation.glossary, [
      { term: "Ideia principal", definition: "O ponto mais importante do trecho." },
    ]),
    steps: normalizeList(response.adaptation.stepByStep, [
      "Leia o resumo.",
      "Revise os cards.",
      "Responda ao quiz.",
    ]),
    visualMap:
      response.adaptation.visualMap ||
      `graph TD; A[${fallbackMaterialTitle(pdfInfo.file.name).slice(0, 24)}] --> B[Páginas ${range.start}-${range.end}]; B --> C[Revisão]`,
    examples: normalizeCards(response.adaptation.examples, [
      { title: "Exemplo de revisão", description: "Explique uma ideia do trecho em voz alta." },
    ]),
    formulas: normalizeCards(response.adaptation.formulas, [
      { title: "Fórmulas ou regras", description: "Se houver fórmula, revise uma por vez." },
    ]),
    studyGuide: normalizeList(response.adaptation.studyGuide, [
      "Comece pelo resumo.",
      "Depois revise o glossário.",
      "Finalize com o quiz.",
    ]),
    quiz: normalizeQuiz(response.adaptation.quiz, fallbackQuiz),
    mode: response.mode,
    notice:
      response.mode === "fallback"
        ? "Não foi possível processar a IA real. Exibindo uma adaptação demonstrativa baseada no texto extraído."
        : undefined,
    rag: response.rag,
  };
}

export default function PDFLibrary() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<LocalPDFInfo | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [limitMessage, setLimitMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [fileHandlerFallbackMessage, setFileHandlerFallbackMessage] = useState("");
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>("idle");
  const [activeAdaptation, setActiveAdaptation] = useState<AdaptationHistoryItem | null>(null);
  const [downloadState, setDownloadState] = useState<{
    id: string | null;
    status: DownloadStatus;
    message: string;
  }>({ id: null, status: "idle", message: "" });
  const [showGuestModal, setShowGuestModal] = useState(false);

  const { settings, setSettings, saveSettings, loading, saving, error } = useReadingSettings();

  const selectedCount = selectedPages.length;
  const isProcessing = processingPhase !== "idle";
  const isDownloadGenerating = downloadState.status === "generating";
  const openedFromFileRoute = location.pathname === "/open";
  const readingStyle = {
    fontSize: settings.font_size,
    lineHeight: settings.line_height,
    letterSpacing: `${settings.letter_spacing}px`,
  };

  useEffect(() => {
    if (!("launchQueue" in window) || !window.launchQueue) return;

    window.launchQueue.setConsumer((launchParams) => {
      const [handle] = launchParams.files ?? [];
      if (!handle) {
        if (openedFromFileRoute) {
          setFileHandlerFallbackMessage("Não foi possível receber o arquivo automaticamente. Use o botão abaixo para abrir o PDF.");
        }
        return;
      }

      void handle.getFile().then((file) => {
        void handlePDF(file);
      });
    });
  }, [openedFromFileRoute]);

  useEffect(() => {
    if (!openedFromFileRoute) {
      setFileHandlerFallbackMessage("");
      return;
    }

    if (!("launchQueue" in window) || !window.launchQueue) {
      setFileHandlerFallbackMessage("Não foi possível receber o arquivo automaticamente. Use o botão abaixo para abrir o PDF.");
    }
  }, [openedFromFileRoute]);

  useEffect(() => {
    removeLegacyHistory();
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handlePDF(file: File | undefined) {
    setErrorMessage("");
    setLimitMessage("");
    setSaveMessage("");
    setFileHandlerFallbackMessage("");
    setDownloadState({ id: null, status: "idle", message: "" });
    setActiveAdaptation(null);

    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Escolha um arquivo PDF para continuar.");
      return;
    }

    setProcessingPhase("loading-pdf");

    try {
      const info = await getPDFPageInfo(file);
      const defaultEnd = Math.min(info.page_count, FREE_PAGE_LIMIT);
      setPdfInfo({
        file,
        pageCount: info.page_count,
        sizeLabel: formatFileSize(file.size),
        pageCountSource: "backend",
      });
      setSelectedPages(Array.from({ length: defaultEnd }, (_, i) => i + 1));
      setShowRangePicker(true);
    } catch (err) {
      const pageCount = await estimatePdfPageCount(file);
      const defaultEnd = Math.min(pageCount, FREE_PAGE_LIMIT);
      setPdfInfo({
        file,
        pageCount,
        sizeLabel: formatFileSize(file.size),
        pageCountSource: "estimated",
      });
      setSelectedPages(Array.from({ length: defaultEnd }, (_, i) => i + 1));
      setShowRangePicker(true);
      setErrorMessage(
        err instanceof Error
          ? `${err.message} Usando uma estimativa local de páginas.`
          : "Usando uma estimativa local de páginas.",
      );
    } finally {
      setProcessingPhase("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void handlePDF(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    void handlePDF(event.dataTransfer.files?.[0]);
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


  async function handleAdapt(overridePages?: number[]) {
    if (!pdfInfo) {
      setErrorMessage("Abra um PDF antes de adaptar o conteúdo.");
      return;
    }

    const pages = overridePages ?? selectedPages;

    if (pages.length === 0) {
      setLimitMessage("Selecione pelo menos uma página antes de adaptar.");
      return;
    }

    if (pages.length > FREE_PAGE_LIMIT) {
      setLimitMessage(`Você pode adaptar até ${FREE_PAGE_LIMIT} páginas por vez.`);
      return;
    }

    const start = Math.min(...pages);
    const end = Math.max(...pages);

    setErrorMessage("");
    setLimitMessage("");
    setSaveMessage("");
    setDownloadState({ id: null, status: "idle", message: "" });
    setActiveAdaptation(null);

    const effectiveRange: ParsedRange = { start, end, count: pages.length };

    try {
      setProcessingPhase("extracting");
      const extracted = await extractPDFSelection(pdfInfo.file, pages);

      setProcessingPhase("retrieving-rag");
      await new Promise((resolve) => setTimeout(resolve, 250));

      setProcessingPhase("adapting");
      const response = await adaptPDFSelection({
        fileName: pdfInfo.file.name,
        startPage: start,
        endPage: end,
        extractedText: extracted.extracted_text,
      });

      setProcessingPhase("rendering");
      const material = buildAdaptedMaterial(pdfInfo, effectiveRange, response);
      const historyItem: AdaptationHistoryItem = {
        id: createHistoryId(),
        fileName: pdfInfo.file.name,
        title: material.title,
        startPage: start,
        endPage: end,
        pageCount: pdfInfo.pageCount,
        createdAt: new Date().toISOString(),
        material,
        saved: false,
      };

      addToHistory(historyItem, user?.username);
      setActiveAdaptation({ ...historyItem, saved: true });
      setSaveMessage("Adaptação salva no histórico.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Não consegui processar este PDF agora. Tente outro intervalo ou outro arquivo.",
      );
    } finally {
      setProcessingPhase("idle");
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
      <AppNavbar
        onAccessibility={() => setDrawerOpen(true)}
        showDesktopAccessibility
      />

      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFileChange} />

      <main className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 pt-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <section
            className={`rounded-2xl border p-4 ${
              settings.high_contrast
                ? "border-white/30 bg-white/5"
                : "border-white/60 bg-white/80 shadow-[0_8px_32px_rgba(16,185,129,0.10)] backdrop-blur-sm"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold">Luz</h1>
                <p className={`mt-1 text-sm font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                  Leitor acessível de PDF.
                </p>
              </div>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`mt-4 rounded-xl border-2 border-dashed p-4 transition ${
                dragActive
                  ? "border-[#10b981] bg-[#d1fae5]"
                  : settings.high_contrast
                    ? "border-white/40 bg-white/5"
                    : "border-[#a7f3d0] bg-[#f0fdf4]"
              }`}
            >
              <p className={`mt-1 text-sm font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                Arraste ou escolha um arquivo PDF.
              </p>
              <button
                type="button"
                onClick={openFilePicker}
                disabled={isProcessing}
                className="mt-4 min-h-11 w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(16,185,129,0.30)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
              >
                Selecionar PDF
              </button>
            </div>
          </section>

          {pdfInfo && (
            <section
              className={`rounded-2xl border p-4 ${
                settings.high_contrast
                  ? "border-white/30 bg-white/5"
                  : "border-white/60 bg-white/80 shadow-[0_8px_32px_rgba(16,185,129,0.10)] backdrop-blur-sm"
              }`}
            >
              <h2 className="text-lg font-extrabold">Arquivo aberto</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] items-center gap-3">
                  <dt className={`font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>Nome</dt>
                  <dd className="min-w-0 truncate text-right font-bold" title={pdfInfo.file.name}>
                    {pdfInfo.file.name}
                  </dd>
                </div>
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3">
                  <dt className={`font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>Páginas</dt>
                  <dd className="text-right font-bold">
                    {pdfInfo.pageCount}
                    {pdfInfo.pageCountSource === "estimated" && <span className="font-medium"> estimadas</span>}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {pdfInfo && (
            <section
              className={`rounded-2xl border p-4 ${
                settings.high_contrast
                  ? "border-white/30 bg-white/5"
                  : "border-white/60 bg-white/80 shadow-[0_8px_32px_rgba(16,185,129,0.10)] backdrop-blur-sm"
              }`}
            >
              <h2 className="text-lg font-extrabold">Trecho selecionado</h2>

              {/* Selected range display */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={`rounded-xl px-3 py-2 text-sm font-bold ${
                    settings.high_contrast ? "bg-white/10 text-white" : "bg-[#d1fae5] text-[#064e3b]"
                  }`}
                >
                  {selectedCount > 0 ? `${selectedCount} página${selectedCount === 1 ? "" : "s"}` : "Nenhuma seleção"}
                </span>
                {selectedCount > 0 && (
                  <span
                    className={`text-sm font-semibold ${settings.high_contrast ? "text-[#9ca3af]" : "text-[#047857]"}`}
                  >
                    {selectedCount > 1
                      ? `${Math.min(...selectedPages)}–${Math.max(...selectedPages)}`
                      : `pág. ${selectedPages[0]}`}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowRangePicker(true)}
                disabled={isProcessing}
                className={`mt-3 min-h-11 w-full rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  settings.high_contrast
                    ? "border-white/30 text-white hover:bg-white/10"
                    : "border-[#a7f3d0] text-[#047857] hover:bg-[#d1fae5]"
                }`}
              >
                Ver PDF e alterar seleção
              </button>

              <button
                type="button"
                onClick={() => void handleAdapt()}
                disabled={isProcessing || selectedCount === 0}
                className="mt-3 min-h-11 w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(16,185,129,0.30)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
              >
                {isProcessing ? "Processando..." : "Adaptar trecho"}
              </button>

              {limitMessage && (
                <div className="mt-3 rounded-xl border border-[#f0d08a] bg-[#fff7df] px-4 py-3 text-sm font-bold text-[#76520a]">
                  <p>{limitMessage}</p>
                </div>
              )}
            </section>
          )}

          {errorMessage && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {errorMessage}
            </p>
          )}
        </aside>

        <section className="min-w-0">
          <div
            className={`flex min-h-[calc(100vh-120px)] flex-col rounded-2xl border p-6 ${
              processingPhase !== "idle"
                ? settings.high_contrast
                  ? "border-white/30 bg-white/10"
                  : "border-[#a7f3d0] bg-[#d1fae5]"
                : settings.high_contrast
                  ? "border-white/30 bg-white/5"
                  : "border-white/60 bg-white/80 shadow-[0_8px_32px_rgba(16,185,129,0.10)] backdrop-blur-sm"
            }`}
          >
            {!pdfInfo && !activeAdaptation && (
              <div className="flex min-h-[520px] flex-col items-center justify-center px-4 py-12 text-center">
                {openedFromFileRoute ? (
                  <>
                    <h2 className="text-2xl font-extrabold">Arquivo aberto no Luz</h2>
                    <p className={`mt-3 max-w-xl font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                      {fileHandlerFallbackMessage || "Não foi possível receber o arquivo automaticamente. Use o botão abaixo para abrir o PDF."}
                    </p>
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="mt-6 min-h-11 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(16,185,129,0.30)] transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
                    >
                      Selecionar PDF
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#047857" }}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Sem cadastro necessário
                    </div>

                    <h2 className={`text-3xl font-extrabold leading-tight ${settings.high_contrast ? "text-white" : "text-[#064e3b]"}`}>
                      Leitura acessível para<br />quem tem dislexia
                    </h2>

                    <p className={`mt-3 max-w-md text-base font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                      Abra qualquer PDF e receba o conteúdo adaptado pela IA em um formato mais fácil de ler.
                    </p>

                    <ul className={`mt-6 space-y-2 text-sm font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#065f46]"}`}>
                      <li className="flex items-center gap-2 justify-center">
                        <span className="text-[#10b981]">✦</span> Selecione até 10 páginas de qualquer PDF
                      </li>
                      <li className="flex items-center gap-2 justify-center">
                        <span className="text-[#10b981]">✦</span> IA adapta o conteúdo para facilitar a leitura
                      </li>
                      <li className="flex items-center gap-2 justify-center">
                        <span className="text-[#10b981]">✦</span> Fontes, cores e régua de leitura personalizáveis
                      </li>
                    </ul>

                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="mt-8 min-h-12 rounded-xl px-8 py-3.5 text-base font-bold text-white shadow-[0_4px_18px_rgba(16,185,129,0.35)] transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
                    >
                      Selecionar PDF
                    </button>

                    <p className={`mt-3 text-xs ${settings.high_contrast ? "text-[#9aa0a6]" : "text-[#6b7280]"}`}>
                      Ou arraste um arquivo PDF aqui
                    </p>

                  </>
                )}
              </div>
            )}

            {pdfInfo && !activeAdaptation && processingPhase === "idle" && (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-[#10b981]">PDF pronto</p>
                <h2 className="mt-2 text-2xl font-extrabold">Escolha as páginas.</h2>
                <p className={`mt-3 max-w-xl font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                  Depois clique em "Adaptar trecho".
                </p>
                <p className={`mt-2 text-sm font-semibold ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#047857]"}`}>
                  Você pode adaptar até 10 páginas por vez.
                </p>
              </div>
            )}

            {processingPhase !== "idle" && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-[#10b981]" />
                </div>
                <h2 className="mt-6 text-2xl font-extrabold text-[#064e3b]">Adaptando seu PDF...</h2>
                <p className="mt-3 font-semibold text-[#047857]">Estamos preparando uma versão mais fácil de ler.</p>
                <p className="mt-2 font-bold text-[#064e3b]">{PROCESSING_LABELS[processingPhase]}</p>
              </div>
            )}

            {activeAdaptation && processingPhase === "idle" && (
              <div className="flex flex-col gap-4">
                {saveMessage && (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-[#6ee7b7] bg-[#d1fae5] px-4 py-3 text-sm font-bold text-[#064e3b]">
                    <p>{saveMessage}</p>
                    <button
                      type="button"
                      onClick={() => user ? navigate("/historico") : setShowGuestModal(true)}
                      className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)] transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
                    >
                      Ver histórico
                    </button>
                  </div>
                )}

                <AdaptedStudyMaterial
                  material={activeAdaptation.material}
                  settings={settings}
                  onDownload={() => void handleDownload(activeAdaptation)}
                  isDownloading={downloadState.id === activeAdaptation.id && downloadState.status === "generating"}
                  downloadMessage={downloadState.id === activeAdaptation.id ? downloadState.message : ""}
                  downloadStatus={downloadState.id === activeAdaptation.id ? downloadState.status : "idle"}
                />
              </div>
            )}
          </div>
        </section>
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

      {showGuestModal && (
        <HistoricoGuestModal
          onConfirm={() => { setShowGuestModal(false); navigate("/login"); }}
          onCancel={() => setShowGuestModal(false)}
        />
      )}

      {showRangePicker && pdfInfo && (
        <Suspense fallback={null}>
          <PDFPageRangePicker
            file={pdfInfo.file}
            pageCount={pdfInfo.pageCount}
            initialSelected={selectedPages}
            onClose={() => setShowRangePicker(false)}
            onConfirm={(pages) => {
              setSelectedPages(pages);
              setShowRangePicker(false);
              void handleAdapt(pages);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
