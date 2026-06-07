interface Settings {
  font_preference: string;
  font_size: number;
  overlay_color: string;
  ruler_enabled: boolean;
}

interface Props {
  value: Settings;
  onChange: (s: Settings) => void;
}

const FONTS = ["OpenDyslexic", "Comic Sans MS", "Arial"];

export default function ReadingSettings({ value, onChange }: Props) {
  const set = (patch: Partial<Settings>) => onChange({ ...value, ...patch });

  return (
    <div className="border border-gray-200 rounded-xl p-5 flex flex-col gap-5">
      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
        <span>⚙</span> Configurações de Leitura
      </h3>

      {/* Fonte */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600 flex items-center gap-1">
          <span>T</span> Fonte Amigável
        </label>
        {FONTS.map((f) => (
          <label
            key={f}
            className={`flex items-center gap-2 border rounded-lg px-4 py-2 cursor-pointer transition-colors ${
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

      {/* Régua */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">📏 Régua de Leitura</label>
        <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.ruler_enabled}
            onChange={(e) => set({ ruler_enabled: e.target.checked })}
            className="accent-blue-500"
          />
          <span className="text-sm text-blue-600">Ativar régua de foco durante a leitura</span>
        </label>
      </div>

      {/* Cor de sobreposição */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">🎨 Cor de Sobreposição</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value.overlay_color}
            onChange={(e) => set({ overlay_color: e.target.value })}
            className="w-10 h-10 rounded cursor-pointer border border-gray-200"
          />
          <span className="text-sm text-gray-500">{value.overlay_color.toUpperCase()}</span>
        </div>
      </div>

      {/* Tamanho da fonte */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-600">
          Tamanho da Fonte: <span className="text-blue-600 font-medium">{value.font_size}px</span>
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
    </div>
  );
}
