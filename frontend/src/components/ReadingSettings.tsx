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

export default function ReadingSettings({ value, onChange }: Props) {
  const set = (patch: Partial<ReadingSettingsValue>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-600">
          Tamanho da fonte: <span className="font-bold text-[#10b981]">{value.font_size}px</span>
        </label>
        <input
          type="range"
          min={16}
          max={24}
          value={value.font_size}
          onChange={(e) => set({ font_size: Number(e.target.value) })}
          className="w-full accent-[#10b981]"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Menor</span>
          <span>Maior</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-600">Cor de sobreposição</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value.overlay_color}
            onChange={(e) => set({ overlay_color: e.target.value })}
            className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200"
          />
          <div
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500"
            style={{ backgroundColor: value.overlay_color + "66" }}
          >
            {value.overlay_color.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
