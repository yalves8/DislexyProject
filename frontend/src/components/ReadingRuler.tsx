import { useState } from "react";

interface Props {
  enabled: boolean;
}

const STRIP_HEIGHT = 36;

export default function ReadingRuler({ enabled }: Props) {
  const [top, setTop] = useState(80);
  const [dragging, setDragging] = useState(false);

  if (!enabled) return null;

  function updatePosition(clientY: number, currentTarget: HTMLDivElement) {
    const bounds = currentTarget.getBoundingClientRect();
    const next = Math.max(0, Math.min(clientY - bounds.top - STRIP_HEIGHT / 2, bounds.height - STRIP_HEIGHT));
    setTop(next);
  }

  return (
    <div
      className="absolute inset-0 z-10 overflow-hidden"
      style={{ cursor: dragging ? "grabbing" : "ns-resize" }}
      onMouseMove={(event) => updatePosition(event.clientY, event.currentTarget)}
      onPointerMove={(event) => {
        if (dragging) updatePosition(event.clientY, event.currentTarget);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
    >
      {/* everything above: fully visible — no overlay */}

      {/* reading strip: clear window for the current line */}
      <div
        className="absolute inset-x-0 border-b-2 border-[#f4c400] bg-[#fffde7]/30"
        style={{ top, height: STRIP_HEIGHT }}
        onPointerDown={(event) => {
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
      />

      {/* everything below: blurred — not yet read */}
      <div
        className="absolute inset-x-0 bottom-0 backdrop-blur-[3px] bg-white/20"
        style={{ top: top + STRIP_HEIGHT }}
      />
    </div>
  );
}
