export interface ReadingSettingsValue {
  font_preference: string;
  font_size: number;
  overlay_color: string;
  ruler_enabled: boolean;
  line_height: number;
  letter_spacing: number;
  high_contrast: boolean;
}

interface Props {
  value: ReadingSettingsValue;
  onChange: (s: ReadingSettingsValue) => void;
}

const FONTS = ["OpenDyslexic", "Comic Sans MS", "Arial"];

export default function ReadingSettings({ value, onChange }: Props) {
  const set = (patch: Partial<ReadingSettingsValue>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
        Ajustes de leitura
      </h3>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600 flex items-center gap-1">
          Fonte amigável
        </label>
        {FONTS.map((f) => (
          <label
            key={f}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
              value.font_preference === f ? "border-blue-500 bg-blue-50" : "border-gray-200"
            }`}
          >
            <input
              type="radio"
              name="font"
              checked={value.font_preference === f}
              onChange={() => set({ font_preference: f })}
              className="accent-blue-500"
            />
            <span style={{ fontFamily: f }}>{f}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">Régua de leitura</label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2">
          <input
            type="checkbox"
            checked={value.ruler_enabled}
            onChange={(e) => set({ ruler_enabled: e.target.checked })}
            className="accent-blue-500"
          />
          <span className="text-sm text-blue-600">Ativar régua de foco durante a leitura</span>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">Cor de sobreposição</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value.overlay_color}
            onChange={(e) => set({ overlay_color: e.target.value })}
            className="h-10 w-10 cursor-pointer rounded border border-gray-200"
          />
          <span className="text-sm text-gray-500">{value.overlay_color.toUpperCase()}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">
          Tamanho da fonte: <span className="font-medium text-blue-600">{value.font_size}px</span>
        </label>
        <input
          type="range"
          min={14}
          max={28}
          value={value.font_size}
          onChange={(e) => set({ font_size: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">
          Espaçamento entre linhas: <span className="font-medium text-blue-600">{value.line_height.toFixed(1)}x</span>
        </label>
        <input
          type="range"
          min={1.4}
          max={2.2}
          step={0.1}
          value={value.line_height}
          onChange={(e) => set({ line_height: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">
          Espaçamento entre letras: <span className="font-medium text-blue-600">{value.letter_spacing}px</span>
        </label>
        <input
          type="range"
          min={0}
          max={3}
          step={0.5}
          value={value.letter_spacing}
          onChange={(e) => set({ letter_spacing: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2">
        <input
          type="checkbox"
          checked={value.high_contrast}
          onChange={(e) => set({ high_contrast: e.target.checked })}
          className="accent-blue-500"
        />
        <span className="text-sm text-blue-600">Ativar alto contraste</span>
      </label>
    </div>
  );
}
