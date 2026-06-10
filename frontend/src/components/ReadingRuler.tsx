import { useState } from "react";

interface Props {
  enabled: boolean;
}

export default function ReadingRuler({ enabled }: Props) {
  const [top, setTop] = useState(120);
  const [dragging, setDragging] = useState(false);

  if (!enabled) return null;

  function updatePosition(clientY: number, currentTarget: HTMLDivElement) {
    const bounds = currentTarget.getBoundingClientRect();
    const nextTop = Math.max(0, Math.min(clientY - bounds.top - 16, bounds.height - 32));
    setTop(nextTop);
  }

  return (
    <div
      className="absolute inset-0 z-10 cursor-ns-resize"
      onMouseMove={(event) => updatePosition(event.clientY, event.currentTarget)}
      onPointerMove={(event) => {
        if (dragging) updatePosition(event.clientY, event.currentTarget);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      <div
        className="absolute left-0 right-0 flex h-11 items-center justify-center border-y border-[#f4c400] bg-[#fff1a6]/45 text-[11px] font-medium text-[#9b9481] shadow-[0_0_18px_rgba(250,204,21,0.28)] backdrop-blur-[2px]"
        style={{ top }}
        onPointerDown={(event) => {
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
      >
        ← Arraste para mover →
      </div>
    </div>
  );
}
