const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface PDFPageInfo {
  file_name: string;
  page_count: number;
}

export interface ExtractedPDFSelection {
  file_name: string;
  page_count: number;
  start_page: number;
  end_page: number;
  extracted_text: string;
}

export interface AdaptPDFSelectionInput {
  fileName: string;
  startPage: number;
  endPage: number;
  extractedText: string;
}

export interface RetrievedRagContext {
  id: string;
  title: string;
  source: string;
  score: number;
  contentPreview: string;
}

export interface RagMetadata {
  enabled: boolean;
  retriever: string;
  topK: number;
  contexts: RetrievedRagContext[];
}

export interface AdaptationPayload {
  title?: string;
  summary?: string;
  keyIdeas?: Array<{ title?: string; description?: string }>;
  glossary?: Array<{ term?: string; definition?: string }>;
  stepByStep?: string[];
  visualMap?: string;
  examples?: Array<{ title?: string; description?: string }>;
  formulas?: Array<{ title?: string; description?: string }>;
  studyGuide?: string[];
  quiz?: Array<{ question?: string; answer?: string }>;
}

export interface AdaptPDFSelectionResponse {
  adaptation: AdaptationPayload;
  rag: RagMetadata;
  mode: "ai_real" | "fallback";
  notice?: string | null;
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return fallback;
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function asArray<T = unknown>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

function normalizeAdaptationPayload(value: unknown): AdaptationPayload {
  const payload = isRecord(value) ? value : {};

  return {
    title: asString(payload.title),
    summary: asString(payload.summary) || asString(payload.adapted_text) || asString(payload.adapted),
    keyIdeas: asArray<{ title?: string; description?: string }>(payload.keyIdeas),
    glossary: asArray<{ term?: string; definition?: string }>(payload.glossary),
    stepByStep: asArray<string>(payload.stepByStep) || asArray<string>(payload.steps),
    visualMap: asString(payload.visualMap) || asString(payload.conceptMap),
    examples: asArray<{ title?: string; description?: string }>(payload.examples),
    formulas: asArray<{ title?: string; description?: string }>(payload.formulas),
    studyGuide: asArray<string>(payload.studyGuide),
    quiz: asArray<{ question?: string; answer?: string }>(payload.quiz),
  };
}

function normalizeRag(value: unknown): RagMetadata {
  const rag = isRecord(value) ? value : {};
  const contexts = asArray(rag.contexts)
    ?.filter(isRecord)
    .map((context, index) => ({
      id: asString(context.id) || `rag-context-${index + 1}`,
      title: asString(context.title) || "Diretriz de acessibilidade",
      source: asString(context.source) || "base-local",
      score: asNumber(context.score),
      contentPreview:
        asString(context.contentPreview) ||
        asString(context.content_preview) ||
        asString(context.content) ||
        "Trecho recuperado da base local de acessibilidade.",
    })) ?? [];

  return {
    enabled: typeof rag.enabled === "boolean" ? rag.enabled : contexts.length > 0,
    retriever: asString(rag.retriever) || "local-keyword",
    topK: Number.isFinite(Number(rag.topK)) ? Number(rag.topK) : contexts.length,
    contexts,
  };
}

function normalizeAdaptSelectionResponse(data: unknown): AdaptPDFSelectionResponse {
  const root = isRecord(data) ? data : {};
  const rawAdaptation = isRecord(root.adaptation) ? root.adaptation : root;
  const rawMode = asString(root.mode);

  return {
    adaptation: normalizeAdaptationPayload(rawAdaptation),
    rag: normalizeRag(root.rag),
    mode: rawMode === "ai_real" ? "ai_real" : "fallback",
    notice: asString(root.notice) ?? null,
  };
}

export async function getPDFPageInfo(file: File): Promise<PDFPageInfo> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE}/pdfs/page-info`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Não consegui ler as informações do PDF."));
  }

  return response.json();
}

export async function extractPDFSelection(file: File, pages: number[]): Promise<ExtractedPDFSelection> {
  const form = new FormData();
  form.append("file", file);
  form.append("pages", pages.join(","));

  const response = await fetch(`${API_BASE}/pdfs/extract-selection`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Não consegui extrair o texto do PDF."));
  }

  return response.json();
}

export async function adaptPDFSelection(input: AdaptPDFSelectionInput): Promise<AdaptPDFSelectionResponse> {
  const response = await fetch(`${API_BASE}/pdfs/adapt-selection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_name: input.fileName,
      start_page: input.startPage,
      end_page: input.endPage,
      extracted_text: input.extractedText,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Não consegui adaptar o conteúdo com IA."));
  }

  return normalizeAdaptSelectionResponse(await response.json());
}
