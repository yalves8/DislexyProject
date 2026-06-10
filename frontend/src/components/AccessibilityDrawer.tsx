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

      <aside className="relative flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#1e3a5f]">Ajustes de leitura</h2>
            <p className="mt-1 text-sm text-gray-500">Escolha como fica melhor para você.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Carregando ajustes...</p>
        ) : (
          <ReadingSettings value={settings} onChange={onChange} />
        )}

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-auto flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 rounded-xl bg-[#1e3a5f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#172e4b] disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar ajustes"}
          </button>
        </div>
      </aside>
    </div>
  );
}
