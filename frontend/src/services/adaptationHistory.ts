import type { AdaptedStudyMaterialData } from "../components/AdaptedStudyMaterial";

export const SAVED_ADAPTATION_LIMIT = 5;
export const LEGACY_HISTORY_STORAGE_KEY = "leitor_pdf_adaptacoes_v1";
export const PENDING_ADAPTATION_STORAGE_KEY = "leitor_pdf_adaptacao_pendente";

export interface AdaptationHistoryItem {
  id: string;
  fileName: string;
  title: string;
  startPage: number;
  endPage: number;
  pageCount: number;
  createdAt: string;
  material: AdaptedStudyMaterialData;
  saved?: boolean;
}

export function createHistoryId(): string {
  return window.crypto?.randomUUID?.() ?? `adaptacao-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function historyStorageKey(username: string): string {
  return `leitor_pdf_adaptacoes:${username}`;
}

export function loadAdaptationHistory(username: string): AdaptationHistoryItem[] {
  try {
    const raw = localStorage.getItem(historyStorageKey(username));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item?.id && item?.material)
      .slice(0, SAVED_ADAPTATION_LIMIT) as AdaptationHistoryItem[];
  } catch {
    return [];
  }
}

export function saveAdaptationHistory(username: string, items: AdaptationHistoryItem[]) {
  localStorage.setItem(historyStorageKey(username), JSON.stringify(items.slice(0, SAVED_ADAPTATION_LIMIT)));
}

export function removeLegacyHistory() {
  localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY);
}

export function loadPendingAdaptation(): AdaptationHistoryItem | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ADAPTATION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdaptationHistoryItem) : null;
  } catch {
    return null;
  }
}

export function savePendingAdaptation(item: AdaptationHistoryItem) {
  sessionStorage.setItem(PENDING_ADAPTATION_STORAGE_KEY, JSON.stringify(item));
}

export function clearPendingAdaptation() {
  sessionStorage.removeItem(PENDING_ADAPTATION_STORAGE_KEY);
}
