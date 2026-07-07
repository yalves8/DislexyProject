import { useEffect, useState } from "react";

interface Props {
  enabled: boolean;
  overlayColor?: string;
}

const RULER_HEIGHT = 40;

export default function ReadingRuler({ enabled, overlayColor = "#FFF3CD" }: Props) {
  const [y, setY] = useState(-RULER_HEIGHT);

  useEffect(() => {
    if (!enabled) return;

    function onMouseMove(e: MouseEvent) {
      setY(e.clientY - RULER_HEIGHT / 2);
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 border-y-2 border-[#f4c400] opacity-60"
      style={{
        top: y,
        height: RULER_HEIGHT,
        backgroundColor: overlayColor,
      }}
      aria-hidden="true"
    />
  );
}
