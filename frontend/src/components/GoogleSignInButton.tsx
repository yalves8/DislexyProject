import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

interface Props {
  text?: "signin_with" | "signup_with" | "continue_with";
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Não foi possível carregar o login Google.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar o login Google."));
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton({ text = "continue_with", onCredential, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const label = text === "signup_with" ? "Criar conta com Google" : "Entrar com Google";

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let active = true;

    loadGoogleScript()
      .then(() => {
        if (!active || !containerRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response.credential) {
              onError("Não foi possível entrar com Google.");
              return;
            }
            onCredential(response.credential);
          },
        });

        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text,
          width: 320,
        });

        setReady(true);
      })
      .catch((error: unknown) => {
        if (active) onError(error instanceof Error ? error.message : "Não foi possível carregar o login Google.");
      });

    return () => {
      active = false;
    };
  }, [onCredential, onError, text]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        onClick={() => onError("Login Google não configurado. Defina VITE_GOOGLE_CLIENT_ID no frontend e GOOGLE_CLIENT_ID no backend.")}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-[#1f2937] shadow-sm transition hover:bg-gray-50"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-xs font-black text-blue-600" aria-hidden="true">
          G
        </span>
        {label}
      </button>
    );
  }

  return (
    <div className="flex min-h-11 w-full justify-center">
      {!ready && (
        <div className="flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-500">
          Carregando Google...
        </div>
      )}
      <div ref={containerRef} className={ready ? "flex w-full justify-center" : "hidden"} />
    </div>
  );
}
