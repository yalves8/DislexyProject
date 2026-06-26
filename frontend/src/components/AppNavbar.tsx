import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AppLogo from "./AppLogo";

interface Props {
  onAccessibility: () => void;
  showDesktopAccessibility?: boolean;
}

export default function AppNavbar({ onAccessibility, showDesktopAccessibility = false }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function goToLibrary() {
    setSidebarOpen(false);
    navigate("/library");
  }

  function openAccessibility() {
    setSidebarOpen(false);
    onAccessibility();
  }

  return (
    <>
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <button
            type="button"
            onClick={goToLibrary}
            className="flex items-center gap-2 text-left font-bold text-gray-800"
          >
            <AppLogo />
            Leitor Dislexy
          </button>

          <nav className="hidden items-center gap-4 md:flex">
            <span className="text-sm text-gray-500">Olá, {user?.username}</span>
            {showDesktopAccessibility && (
              <button
                type="button"
                onClick={openAccessibility}
                className="text-sm font-medium text-[#061c44] transition hover:text-blue-700"
              >
                Acessibilidade
              </button>
            )}
            <button type="button" onClick={handleLogout} className="text-sm text-red-500 transition hover:underline">
              Sair
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
                <p className="font-bold text-[#061c44]">Leitor Dislexy</p>
                <p className="mt-1 text-sm text-gray-500">Olá, {user?.username}</p>
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
              Minha Biblioteca
            </button>
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
              className="mt-auto rounded-lg px-3 py-3 text-left text-sm font-semibold text-red-500 hover:bg-red-50"
            >
              Sair
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
