import type { AdaptedStudyMaterialData } from "../components/AdaptedStudyMaterial";

export const SAVED_ADAPTATION_LIMIT = 5;
export const HISTORY_STORAGE_KEY = "dilexy_adaptacoes";

// Legacy keys — kept only for cleanup
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

function historyKey(username?: string | null): string {
  return username ? `${HISTORY_STORAGE_KEY}_${username}` : `${HISTORY_STORAGE_KEY}__guest`;
}

export function createHistoryId(): string {
  return window.crypto?.randomUUID?.() ?? `adaptacao-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function loadHistory(username?: string | null): AdaptationHistoryItem[] {
  try {
    const raw = localStorage.getItem(historyKey(username));
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

export function saveHistory(items: AdaptationHistoryItem[], username?: string | null): void {
  localStorage.setItem(historyKey(username), JSON.stringify(items.slice(0, SAVED_ADAPTATION_LIMIT)));
}

export function addToHistory(item: AdaptationHistoryItem, username?: string | null): void {
  const current = loadHistory(username);
  const updated = [{ ...item, saved: true }, ...current.filter((h) => h.id !== item.id)];
  saveHistory(updated, username);
}

export function removeFromHistory(id: string, username?: string | null): void {
  saveHistory(loadHistory(username).filter((h) => h.id !== id), username);
}

export function removeLegacyHistory(): void {
  localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY);
  // migrate old global key to guest if present
  const old = localStorage.getItem(HISTORY_STORAGE_KEY);
  if (old) {
    const guestKey = historyKey(null);
    if (!localStorage.getItem(guestKey)) {
      localStorage.setItem(guestKey, old);
    }
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  }
  sessionStorage.removeItem(PENDING_ADAPTATION_STORAGE_KEY);
}

// Kept for backward compatibility — not called in new code
export function loadPendingAdaptation(): AdaptationHistoryItem | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ADAPTATION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdaptationHistoryItem) : null;
  } catch {
    return null;
  }
}

export function savePendingAdaptation(item: AdaptationHistoryItem): void {
  sessionStorage.setItem(PENDING_ADAPTATION_STORAGE_KEY, JSON.stringify(item));
}

export function clearPendingAdaptation(): void {
  sessionStorage.removeItem(PENDING_ADAPTATION_STORAGE_KEY);
}
