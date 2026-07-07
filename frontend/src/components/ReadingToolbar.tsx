export type SpeechRate = 0.5 | 1 | 1.5;

interface Props {
  isPlaying: boolean;
  speechRate: SpeechRate;
  onTogglePlayback: () => void;
  onRateChange: (rate: SpeechRate) => void;
}

const RATES: SpeechRate[] = [0.5, 1, 1.5];

export default function ReadingToolbar({
  isPlaying,
  speechRate,
  onTogglePlayback,
  onRateChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#d7dce4] bg-white p-4 shadow-[0_5px_14px_rgba(15,23,42,0.13)]">
      <button
        type="button"
        onClick={onTogglePlayback}
        className="inline-flex items-center gap-2 rounded-lg bg-[#152b52] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#0e2144]"
      >
        <span aria-hidden="true">{isPlaying ? "Ⅱ" : "▷"}</span>
        {isPlaying ? "Pausar" : "Reproduzir"}
      </button>

      <span className="text-sm font-medium text-[#061c44]">
        <span aria-hidden="true">🔊</span> Velocidade:
      </span>

      <div className="flex items-center gap-2" aria-label="Velocidade da leitura">
        {RATES.map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => onRateChange(rate)}
            className={`min-w-12 rounded-lg border px-3 py-2 text-sm font-black transition ${
              speechRate === rate
                ? "border-[#152b52] bg-[#152b52] text-white"
                : "border-[#cbd2dc] bg-white text-[#061c44] hover:bg-[#f1f4f8]"
            }`}
          >
            {rate}x
          </button>
        ))}
      </div>
    </div>
  );
}
