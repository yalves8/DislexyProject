interface Props {
  enabled: boolean;
  overlayColor?: string;
}

export default function ReadingRuler({ enabled, overlayColor = "#FFF3CD" }: Props) {
  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[32%] z-0 h-10 border-y-2 border-[#f4c400] opacity-70"
      style={{ backgroundColor: overlayColor }}
      aria-hidden="true"
    />
  );
}
