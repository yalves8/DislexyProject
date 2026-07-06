import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AppLogo from "./AppLogo";

interface Props {
  onAccessibility: () => void;
  showDesktopAccessibility?: boolean;
}

export default function AppNavbar({ onAccessibility, showDesktopAccessibility = false }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    logout();
    navigate("/", { replace: true });
  }

  function goToLibrary() {
    setSidebarOpen(false);
    navigate("/");
  }

  function openAccessibility() {
    setSidebarOpen(false);
    onAccessibility();
  }

  function openHistory() {
    setSidebarOpen(false);
    navigate("/historico");
  }

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <button
            type="button"
            onClick={goToLibrary}
            className="flex min-w-0 items-center text-left font-bold text-gray-800"
            aria-label="Ir para o leitor Luz"
          >
            <AppLogo />
          </button>

          <nav className="hidden items-center gap-4 md:flex">
            <button
              type="button"
              onClick={goToLibrary}
              className="text-sm font-medium text-[#061c44] transition hover:text-blue-700"
            >
              Leitor
            </button>
            {user && (
              <button
                type="button"
                onClick={openHistory}
                className="text-sm font-medium text-[#061c44] transition hover:text-blue-700"
              >
                Histórico
              </button>
            )}
            {showDesktopAccessibility && (
              <button
                type="button"
                onClick={openAccessibility}
                className="text-sm font-medium text-[#061c44] transition hover:text-blue-700"
              >
                Acessibilidade
              </button>
            )}
            {user && <span className="text-sm text-gray-500">{user.username}</span>}
            <button
              type="button"
              onClick={handleLogout}
              className={`text-sm transition hover:underline ${user ? "text-red-500" : "font-medium text-[#061c44]"}`}
            >
              {user ? "Sair" : "Entrar"}
            </button>
          </nav>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-[#061c44] shadow-sm md:hidden"
            aria-label="Abrir menu"
          >
            ☰
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          />

          <aside className="relative flex h-full w-72 flex-col gap-5 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center">
                  <AppLogo />
                </div>
                {user && <p className="mt-1 text-sm text-gray-500">{user.username}</p>}
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg px-3 py-1 text-xl leading-none text-gray-500 hover:bg-gray-100"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="h-px bg-gray-100" />

            <button
              type="button"
              onClick={goToLibrary}
              className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-[#061c44] hover:bg-gray-50"
            >
              Leitor
            </button>
            {user && (
              <button
                type="button"
                onClick={openHistory}
                className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-[#061c44] hover:bg-gray-50"
              >
                Histórico
              </button>
            )}
            <button
              type="button"
              onClick={openAccessibility}
              className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-[#061c44] hover:bg-gray-50"
            >
              Acessibilidade
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className={`mt-auto rounded-lg px-3 py-3 text-left text-sm font-semibold ${
                user ? "text-red-500 hover:bg-red-50" : "text-[#061c44] hover:bg-gray-50"
              }`}
            >
              {user ? "Sair" : "Entrar"}
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
