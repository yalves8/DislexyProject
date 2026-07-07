import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PAGES = 10;
const PREVIEW_WIDTH = 480; // px — rendered resolution for the main preview

interface Props {
  file: File;
  pageCount: number;
  initialSelected: number[];
  onConfirm: (pages: number[]) => void;
  onClose: () => void;
}

function parseInput(raw: string, maxPage: number): number[] {
  const pages = new Set<number>();
  for (const part of raw.split(/[,;\s]+/)) {
    const r = part.match(/^(\d+)\s*-\s*(\d+)$/);
    const s = part.match(/^(\d+)$/);
    if (r) {
      const a = Math.max(1, parseInt(r[1]));
      const b = Math.min(maxPage, parseInt(r[2]));
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) pages.add(i);
    } else if (s) {
      const n = parseInt(s[1]);
      if (n >= 1 && n <= maxPage) pages.add(n);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function formatPages(pages: number[]): string {
  if (!pages.length) return "";
  const sorted = [...pages].sort((a, b) => a - b);
  const out: string[] = [];
  let s = sorted[0], p = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === p + 1) { p = sorted[i]; }
    else { out.push(s === p ? `${s}` : `${s}-${p}`); s = sorted[i]; p = sorted[i]; }
  }
  out.push(s === p ? `${s}` : `${s}-${p}`);
  return out.join(", ");
}

export default function PDFPageRangePicker({
  file, pageCount, initialSelected, onConfirm, onClose,
}: Props) {
  const [thumbnails, setThumbnails] = useState<(string | null)[]>(() =>
    Array(pageCount).fill(null),
  );
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(initialSelected),
  );
  const [textValue, setTextValue] = useState(() => formatPages(initialSelected));
  const [textError, setTextError] = useState("");
  const cancelRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Render pages via pdfjs
  useEffect(() => {
    cancelRef.current = false;
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    async function loadPages() {
      const pdf = await pdfjsLib.getDocument({ url: objectUrl }).promise;
      for (let i = 1; i <= pageCount; i++) {
        if (cancelRef.current) break;
        try {
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = PREVIEW_WIDTH / base.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (!cancelRef.current) {
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            setThumbnails(prev => { const n = [...prev]; n[i - 1] = dataUrl; return n; });
          }
        } catch { /* skip */ }
      }
    }

    loadPages().catch(console.error);
    return () => {
      cancelRef.current = true;
      URL.revokeObjectURL(objectUrl);
      objectUrlRef.current = null;
    };
  }, [file, pageCount]);

  // Sync selected → textValue when selection changes via thumbnail clicks
  const syncText = useCallback((next: Set<number>) => {
    setTextValue(formatPages(Array.from(next).sort((a, b) => a - b)));
    setTextError("");
  }, []);

  function handleToggle(pageNum: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else if (next.size < MAX_PAGES) {
        next.add(pageNum);
      }
      syncText(next);
      return next;
    });
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setTextValue(raw);
    setTextError("");
    const parsed = parseInput(raw, pageCount);
    if (parsed.length > 0 && parsed.length <= MAX_PAGES) {
      setSelected(new Set(parsed));
    } else if (parsed.length > MAX_PAGES) {
      setSelected(new Set(parsed.slice(0, MAX_PAGES)));
    }
  }

  function commitText() {
    const parsed = parseInput(textValue, pageCount).slice(0, MAX_PAGES);
    if (!parsed.length && textValue.trim()) {
      setTextError("Formato inválido. Use: 1-5, 8, 10");
      return;
    }
    setSelected(new Set(parsed));
    setTextValue(formatPages(parsed));
    setTextError("");
  }

  function scrollToPage(pageNum: number) {
    pageRefs.current[pageNum - 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const sortedSelected = Array.from(selected).sort((a, b) => a - b);
  const count = sortedSelected.length;

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "#202124" }}>

      {/* ── Left: large preview ── */}
      <div
        className="flex flex-1 flex-col overflow-y-auto"
        style={{ background: "#3c4043" }}
      >
        <div className="flex flex-col items-center gap-6 px-8 py-10">
          {thumbnails.map((thumb, i) => {
            const pageNum = i + 1;
            const isSel = selected.has(pageNum);
            const isDisabled = !isSel && count >= MAX_PAGES;

            return (
              <div
                key={pageNum}
                ref={el => { pageRefs.current[i] = el; }}
                className="relative w-full max-w-2xl"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(pageNum)}
                  disabled={isDisabled}
                  title={isDisabled ? `Máximo de ${MAX_PAGES} páginas atingido` : `Selecionar página ${pageNum}`}
                  className={`group relative w-full cursor-pointer overflow-hidden rounded-sm shadow-2xl transition-all duration-150 ${
                    isSel
                      ? "ring-4 ring-[#10b981]"
                      : isDisabled
                        ? "cursor-not-allowed opacity-35"
                        : "opacity-60 hover:opacity-90 hover:ring-2 hover:ring-white/30"
                  }`}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={`Página ${pageNum}`}
                      className="block w-full"
                      draggable={false}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center bg-white"
                      style={{ aspectRatio: "1 / 1.414" }}
                    >
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#10b981] border-t-transparent" />
                    </div>
                  )}

                  {/* Selection overlay */}
                  {isSel && (
                    <div className="absolute inset-0 pointer-events-none bg-[#10b981]/10" />
                  )}

                  {/* Checkmark */}
                  {isSel && (
                    <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981] shadow-lg">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Page number below */}
                <p className={`mt-2 text-center text-sm font-semibold ${isSel ? "text-[#10b981]" : "text-[#9aa0a6]"}`}>
                  {pageNum}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: controls panel ── */}
      <div
        className="flex w-72 shrink-0 flex-col md:w-80"
        style={{ background: "#292a2d", color: "white" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Adaptar trecho</h2>
            <p className="mt-0.5 text-sm" style={{ color: "#9aa0a6" }}>{pageCount} páginas no total</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-lg leading-none transition hover:bg-white/10"
            style={{ color: "#9aa0a6" }}
          >×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Pages field */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "#9aa0a6" }}>
              Páginas
            </label>
            <div
              className="flex items-center rounded"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <input
                type="text"
                value={textValue}
                onChange={handleTextChange}
                onBlur={commitText}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), commitText())}
                placeholder="Ex.: 1-5, 8, 10"
                aria-label="Páginas a selecionar"
                className="flex-1 bg-transparent px-3 py-2.5 text-sm font-medium text-white placeholder:text-[#5f6368] outline-none"
              />
              {textValue && (
                <button
                  type="button"
                  onClick={() => { setTextValue(""); setSelected(new Set()); setTextError(""); }}
                  className="px-3 text-[#9aa0a6] hover:text-white transition"
                  aria-label="Limpar"
                >×</button>
              )}
            </div>
            {textError && <p className="mt-1 text-xs text-red-400">{textError}</p>}
            <p className="mt-1.5 text-xs" style={{ color: "#5f6368" }}>
              Use vírgulas e hifens. Ex.: 1-5, 8, 10
            </p>
          </div>

          {/* Counter */}
          <div
            className="flex items-center justify-between rounded px-4 py-3 text-sm"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span style={{ color: "#9aa0a6" }}>Selecionadas</span>
            <span className={`font-bold text-base ${count > 0 ? "text-[#10b981]" : ""}`} style={count === 0 ? { color: "#9aa0a6" } : {}}>
              {count} / {MAX_PAGES}
            </span>
          </div>

          {/* Selected pages quick-nav chips */}
          {sortedSelected.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium" style={{ color: "#9aa0a6" }}>Páginas selecionadas</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedSelected.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => scrollToPage(p)}
                    className="rounded px-2.5 py-1 text-xs font-bold transition hover:bg-[#10b981]/30"
                    style={{ background: "rgba(16,185,129,0.18)", color: "#10b981" }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {count >= MAX_PAGES && (
            <p className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
              Limite de {MAX_PAGES} páginas atingido. Desmarque uma para selecionar outra.
            </p>
          )}
        </div>

        {/* Footer buttons */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded px-5 py-2 text-sm font-medium transition hover:bg-white/10"
            style={{ color: "white" }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={count === 0}
            onClick={() => onConfirm(sortedSelected)}
            className="rounded px-5 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: count > 0 ? "linear-gradient(135deg, #10b981, #3b82f6)" : "#5f6368" }}
          >
            Adaptar
          </button>
        </div>
      </div>
    </div>
  );
}
