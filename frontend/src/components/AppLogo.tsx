import { useState } from "react";

export default function AppLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="inline-flex h-14 w-28 shrink-0 items-center justify-center rounded-lg bg-[#061c44] text-lg font-black text-white">
        Luz
      </span>
    );
  }

  return (
    <img
      src="/brand/luz-logo.png?v=20260701-2"
      alt="Luz"
      className="h-14 w-auto max-w-[210px] shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}
