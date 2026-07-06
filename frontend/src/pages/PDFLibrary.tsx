import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AccessibilityDrawer from "../components/AccessibilityDrawer";
import AdaptedStudyMaterial, {
  type AdaptedStudyMaterialData,
  type GlossaryItem,
  type QuizItem,
  type StudyCard,
} from "../components/AdaptedStudyMaterial";
import AppNavbar from "../components/AppNavbar";
import { useAuth } from "../contexts/AuthContext";
import { useReadingSettings } from "../hooks/useReadingSettings";
import {
  adaptPDFSelection,
  extractPDFSelection,
  getPDFPageInfo,
  type AdaptPDFSelectionResponse,
} from "../services/pdfReaderApi";
import { downloadAdaptationPdf } from "../services/adaptationPdf";
import {
  clearPendingAdaptation,
  createHistoryId,
  loadAdaptationHistory,
  loadPendingAdaptation,
  removeLegacyHistory,
  saveAdaptationHistory,
  savePendingAdaptation,
  SAVED_ADAPTATION_LIMIT,
  type AdaptationHistoryItem,
} from "../services/adaptationHistory";

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

function parsePageRange(value: string, pageCount: number): ParsedRange | null {
  const clean = value.trim().replace(/\s/g, "");
  const match = clean.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);

  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 1 || end < start || end > pageCount) return null;

  return { start, end, count: end - start + 1 };
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
  const [rangeInput, setRangeInput] = useState("1-10");
  const [errorMessage, setErrorMessage] = useState("");
  const [limitMessage, setLimitMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showGuestSavePrompt, setShowGuestSavePrompt] = useState(false);
  const [fileHandlerFallbackMessage, setFileHandlerFallbackMessage] = useState("");
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>("idle");
  const [history, setHistory] = useState<AdaptationHistoryItem[]>([]);
  const [activeAdaptation, setActiveAdaptation] = useState<AdaptationHistoryItem | null>(null);
  const [downloadState, setDownloadState] = useState<{
    id: string | null;
    status: DownloadStatus;
    message: string;
  }>({ id: null, status: "idle", message: "" });

  const { settings, setSettings, saveSettings, loading, saving, error } = useReadingSettings();

  const parsedRange = useMemo(() => {
    if (!pdfInfo) return null;
    return parsePageRange(rangeInput, pdfInfo.pageCount);
  }, [pdfInfo, rangeInput]);

  const selectedCount = parsedRange?.count ?? 0;
  const isOverFreeLimit = selectedCount > FREE_PAGE_LIMIT;
  const isProcessing = processingPhase !== "idle";
  const isDownloadGenerating = downloadState.status === "generating";
  const openedFromFileRoute = location.pathname === "/open";
  const readingStyle = {
    fontFamily: settings.font_preference,
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

    if (!user) {
      setHistory([]);
      return;
    }

    const loadedHistory = loadAdaptationHistory(user.username);
    const pendingAdaptation = loadPendingAdaptation();

    if (!pendingAdaptation) {
      setHistory(loadedHistory);
      return;
    }

    clearPendingAdaptation();
    setShowGuestSavePrompt(false);

    if (loadedHistory.length >= SAVED_ADAPTATION_LIMIT) {
      setHistory(loadedHistory);
      setActiveAdaptation({ ...pendingAdaptation, saved: false });
      setSaveMessage("Seu histórico está cheio. Exclua uma adaptação antiga para salvar esta.");
      return;
    }

    const savedItem = { ...pendingAdaptation, saved: true };
    const nextHistory = [savedItem, ...loadedHistory].slice(0, SAVED_ADAPTATION_LIMIT);
    setHistory(nextHistory);
    saveAdaptationHistory(user.username, nextHistory);
    setActiveAdaptation(savedItem);
    setSaveMessage("Adaptação salva no histórico.");
  }, [user]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handlePDF(file: File | undefined) {
    setErrorMessage("");
    setLimitMessage("");
    setSaveMessage("");
    setShowGuestSavePrompt(false);
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
      setRangeInput(`1-${defaultEnd}`);
    } catch (err) {
      const pageCount = await estimatePdfPageCount(file);
      const defaultEnd = Math.min(pageCount, FREE_PAGE_LIMIT);
      setPdfInfo({
        file,
        pageCount,
        sizeLabel: formatFileSize(file.size),
        pageCountSource: "estimated",
      });
      setRangeInput(`1-${defaultEnd}`);
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

  function persistHistory(items: AdaptationHistoryItem[]) {
    if (!user) return;
    setHistory(items);
    saveAdaptationHistory(user.username, items);
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

  function handleLoginToSave() {
    if (activeAdaptation) {
      savePendingAdaptation(activeAdaptation);
    }
    navigate("/login");
  }

  function handleContinueWithoutSaving() {
    setShowGuestSavePrompt(false);
    clearPendingAdaptation();
  }

  async function handleAdapt() {
    if (!pdfInfo) {
      setErrorMessage("Abra um PDF antes de adaptar o conteúdo.");
      return;
    }

    if (!parsedRange) {
      setLimitMessage("Informe um intervalo válido, como 1-5 ou 12-20.");
      return;
    }

    if (parsedRange.count > FREE_PAGE_LIMIT) {
      setLimitMessage(
        "Você pode adaptar até 10 páginas por vez. Escolha um trecho menor para continuar.",
      );
      return;
    }

    setErrorMessage("");
    setLimitMessage("");
    setSaveMessage("");
    setShowGuestSavePrompt(false);
    setDownloadState({ id: null, status: "idle", message: "" });
    setActiveAdaptation(null);

    try {
      setProcessingPhase("extracting");
      const extracted = await extractPDFSelection(pdfInfo.file, parsedRange.start, parsedRange.end);

      setProcessingPhase("retrieving-rag");
      await new Promise((resolve) => setTimeout(resolve, 250));

      setProcessingPhase("adapting");
      const response = await adaptPDFSelection({
        fileName: pdfInfo.file.name,
        startPage: parsedRange.start,
        endPage: parsedRange.end,
        extractedText: extracted.extracted_text,
      });

      setProcessingPhase("rendering");
      const material = buildAdaptedMaterial(pdfInfo, parsedRange, response);
      const historyItem: AdaptationHistoryItem = {
        id: createHistoryId(),
        fileName: pdfInfo.file.name,
        title: material.title,
        startPage: parsedRange.start,
        endPage: parsedRange.end,
        pageCount: pdfInfo.pageCount,
        createdAt: new Date().toISOString(),
        material,
        saved: false,
      };

      if (!user) {
        savePendingAdaptation(historyItem);
        setActiveAdaptation(historyItem);
        setShowGuestSavePrompt(true);
        setSaveMessage("Adaptação concluída.");
        return;
      }

      if (history.length >= SAVED_ADAPTATION_LIMIT) {
        setActiveAdaptation(historyItem);
        setSaveMessage("Seu histórico está cheio. Exclua uma adaptação antiga para salvar esta.");
        return;
      }

      const savedItem = { ...historyItem, saved: true };
      const nextHistory = [savedItem, ...history].slice(0, SAVED_ADAPTATION_LIMIT);
      persistHistory(nextHistory);
      setActiveAdaptation(savedItem);
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
      className={`min-h-screen ${settings.high_contrast ? "bg-[#050b14] text-white" : "bg-[#f3f5ef] text-[#0f2d4a]"}`}
      style={readingStyle}
    >
      <AppNavbar
        onAccessibility={() => setDrawerOpen(true)}
        showDesktopAccessibility
      />

      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFileChange} />

      <main className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 pt-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <section className={`rounded-lg border p-4 ${settings.high_contrast ? "border-white/30 bg-white/5" : "border-[#d8e2ea] bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-black">Luz</h1>
                <p className={`mt-1 text-sm ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
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
              className={`mt-4 rounded-lg border-2 border-dashed p-4 transition ${
                dragActive
                  ? "border-[#2c6e63] bg-[#e9f7ef]"
                  : settings.high_contrast
                    ? "border-white/40 bg-white/5"
                    : "border-[#b9cbd9] bg-[#fbfcf8]"
              }`}
            >
              <p className="text-sm font-bold">Abrir PDF</p>
              <p className={`mt-1 text-sm ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                Escolha um arquivo PDF.
              </p>
              <button
                type="button"
                onClick={openFilePicker}
                disabled={isProcessing}
                className="mt-4 min-h-11 w-full rounded-lg bg-[#0f2d4a] px-4 py-3 text-sm font-black text-white transition hover:bg-[#173f66] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Abrir PDF
              </button>
            </div>
          </section>

          {pdfInfo && (
            <section className={`rounded-lg border p-4 ${settings.high_contrast ? "border-white/30 bg-white/5" : "border-[#d8e2ea] bg-white"}`}>
              <h2 className="text-lg font-black">Arquivo aberto</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] items-center gap-3">
                  <dt className={settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}>Nome</dt>
                  <dd className="min-w-0 truncate text-right font-black" title={pdfInfo.file.name}>
                    {pdfInfo.file.name}
                  </dd>
                </div>
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3">
                  <dt className={settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}>Páginas</dt>
                  <dd className="text-right font-black">
                    {pdfInfo.pageCount}
                    {pdfInfo.pageCountSource === "estimated" && <span className="font-medium"> estimadas</span>}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {pdfInfo && (
            <section className={`rounded-lg border p-4 ${settings.high_contrast ? "border-white/30 bg-white/5" : "border-[#d8e2ea] bg-white"}`}>
              <h2 className="text-lg font-black">Trecho para adaptar</h2>
              <p className={`mt-1 text-sm ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                Você pode adaptar até 10 páginas por vez.
              </p>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-sm font-black">Intervalo de páginas</span>
                <input
                  value={rangeInput}
                  onChange={(event) => {
                    setRangeInput(event.target.value);
                    setLimitMessage("");
                  }}
                  inputMode="numeric"
                  placeholder="Ex.: 1-10"
                  className={`min-h-11 rounded-lg border px-4 text-base font-bold outline-none ${
                    settings.high_contrast
                      ? "border-white/40 bg-[#07111f] text-white"
                      : "border-[#b9cbd9] bg-white text-[#0f2d4a]"
                  }`}
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className={`rounded-lg px-3 py-2 font-bold ${settings.high_contrast ? "bg-white/10" : "bg-[#f4f8fb]"}`}>
                  {parsedRange ? selectedCount : 0} página{selectedCount === 1 ? "" : "s"}
                </span>
                <span className={`rounded-lg px-3 py-2 font-bold ${isOverFreeLimit ? "bg-red-50 text-red-700" : "bg-[#eef8f1] text-[#2c6e63]"}`}>
                  Máximo: {FREE_PAGE_LIMIT}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAdapt}
                disabled={isProcessing}
                className="mt-4 min-h-11 w-full rounded-lg bg-[#2c6e63] px-4 py-3 text-sm font-black text-white transition hover:bg-[#245c53] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? "Processando..." : "Adaptar trecho"}
              </button>

              {limitMessage && (
                <div className="mt-4 rounded-lg border border-[#f0d08a] bg-[#fff7df] px-4 py-3 text-sm font-bold text-[#76520a]">
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
          <div className={`min-h-[calc(100vh-120px)] rounded-lg border p-4 ${settings.high_contrast ? "border-white/30 bg-white/5" : "border-[#d8e2ea] bg-white"}`}>
            {!pdfInfo && !activeAdaptation && (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-black">
                  {openedFromFileRoute ? "Arquivo aberto no Luz" : "Abra um PDF para começar."}
                </h2>
                <p className={`mt-3 max-w-xl ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                  {openedFromFileRoute
                    ? fileHandlerFallbackMessage || "Não foi possível receber o arquivo automaticamente. Use o botão abaixo para abrir o PDF."
                    : "Escolha as páginas que deseja adaptar."}
                </p>
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="mt-6 min-h-11 rounded-lg bg-[#0f2d4a] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173f66]"
                >
                  Selecionar PDF
                </button>
              </div>
            )}

            {pdfInfo && !activeAdaptation && processingPhase === "idle" && (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <p className="text-sm font-black text-[#2c6e63]">PDF pronto</p>
                <h2 className="mt-2 text-2xl font-black">Escolha as páginas.</h2>
                <p className={`mt-3 max-w-xl ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                  Depois clique em “Adaptar trecho”.
                </p>
                <p className={`mt-2 text-sm ${settings.high_contrast ? "text-[#dce8f3]" : "text-[#52627f]"}`}>
                  Você pode adaptar até 10 páginas por vez.
                </p>
              </div>
            )}

            {processingPhase !== "idle" && (
              <div className="flex min-h-[520px] flex-col justify-center rounded-lg border border-[#b9d7c7] bg-[#eef8f1] p-6 text-center">
                <div className="h-2 w-full overflow-hidden rounded-lg bg-white">
                  <div className="h-full w-2/3 animate-pulse rounded-lg bg-[#2c6e63]" />
                </div>
                <h2 className="mt-6 text-2xl font-black text-[#2c6e63]">Adaptando seu PDF...</h2>
                <p className="mt-3 text-[#52627f]">Estamos preparando uma versão mais fácil de ler.</p>
                <p className="mt-2 font-black text-[#2c6e63]">{PROCESSING_LABELS[processingPhase]}</p>
              </div>
            )}

            {activeAdaptation && processingPhase === "idle" && (
              <div className="flex flex-col gap-4">
                {saveMessage && (
                  <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${
                    saveMessage.includes("cheio")
                      ? "border-[#f0d08a] bg-[#fff7df] text-[#76520a]"
                      : "border-[#b9d7c7] bg-[#eef8f1] text-[#2c6e63]"
                  }`}>
                    <p>{saveMessage}</p>
                    {user && saveMessage.includes("histórico") && (
                      <button
                        type="button"
                        onClick={() => navigate("/historico")}
                        className="mt-2 rounded-lg bg-[#0f2d4a] px-3 py-2 text-xs font-black text-white transition hover:bg-[#173f66]"
                      >
                        Ver histórico
                      </button>
                    )}
                  </div>
                )}

                {showGuestSavePrompt && !user && (
                  <section className="rounded-lg border border-[#d8e2ea] bg-white p-4">
                    <h3 className="font-black text-[#0f2d4a]">Quer acessar esta adaptação depois?</h3>
                    <p className="mt-2 text-sm text-[#52627f]">
                      Entre na sua conta para salvar este material no histórico.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleLoginToSave}
                        className="min-h-11 rounded-lg bg-[#0f2d4a] px-4 py-3 text-sm font-black text-white transition hover:bg-[#173f66]"
                      >
                        Entrar para salvar
                      </button>
                      <button
                        type="button"
                        onClick={handleContinueWithoutSaving}
                        className="min-h-11 rounded-lg border border-[#b9cbd9] bg-white px-4 py-3 text-sm font-black text-[#0f2d4a] transition hover:bg-[#f4f8fb]"
                      >
                        Continuar sem salvar
                      </button>
                    </div>
                  </section>
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
    </div>
  );
}
