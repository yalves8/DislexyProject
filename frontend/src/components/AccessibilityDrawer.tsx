import ReadingSettings from "./ReadingSettings";
import type { ReadingSettingsValue } from "./ReadingSettings";

interface Props {
  open: boolean;
  settings: ReadingSettingsValue;
  loading?: boolean;
  saving?: boolean;
  error?: string;
  onChange: (settings: ReadingSettingsValue) => void;
  onClose: () => void;
  onSave: () => Promise<boolean>;
}

export default function AccessibilityDrawer({
  open,
  settings,
  loading = false,
  saving = false,
  error = "",
  onChange,
  onClose,
  onSave,
}: Props) {
  if (!open) return null;

  async function handleSave() {
    const saved = await onSave();
    if (saved) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar ajustes" onClick={onClose} />

      <aside className="relative flex h-full w-full max-w-xs flex-col gap-6 overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[#064e3b]">Leitura</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-2xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Carregando...</p>
        ) : (
          <ReadingSettings value={settings} onChange={onChange} />
        )}

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </aside>
    </div>
  );
}
