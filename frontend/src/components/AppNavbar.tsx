import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import HistoricoGuestModal from "./HistoricoGuestModal";
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
  const [showGuestModal, setShowGuestModal] = useState(false);

  const isOnLeitor = location.pathname === "/" || location.pathname === "/open";
  const isOnHistorico = location.pathname === "/historico";

  function openAccessibility() {
    setSidebarOpen(false);
    onAccessibility();
  }

  function handleHistoricoClick() {
    setSidebarOpen(false);
    if (user) {
      navigate("/historico");
    } else {
      setShowGuestModal(true);
    }
  }

  function handleLogout() {
    setSidebarOpen(false);
    logout();
    navigate("/");
  }

  function navClass(active: boolean) {
    return active
      ? "text-sm font-bold text-[#10b981] border-b-2 border-[#10b981] pb-0.5"
      : "text-sm font-semibold text-[#064e3b] transition hover:text-[#10b981]";
  }

  function mobileNavClass(active: boolean) {
    return active
      ? "rounded-xl bg-[#d1fae5] px-3 py-3 text-left text-sm font-bold text-[#10b981]"
      : "rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#064e3b] hover:bg-[#f0fdf4]";
  }

  return (
    <>
      <header className="border-b border-[#a7f3d0] bg-white/90 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex min-w-0 items-center text-left font-bold text-[#064e3b]"
            aria-label="Ir para o leitor Luz"
          >
            <AppLogo />
          </button>

          <nav className="hidden items-center gap-6 md:flex">
            <button type="button" onClick={() => navigate("/")} className={navClass(isOnLeitor)}>
              Leitor
            </button>
            <button type="button" onClick={handleHistoricoClick} className={navClass(isOnHistorico)}>
              Histórico
            </button>
            {showDesktopAccessibility && (
              <button type="button" onClick={openAccessibility} className={navClass(false)}>
                Acessibilidade
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#047857]">{user.username}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-[#a7f3d0] bg-white/80 px-3 py-1.5 text-sm font-bold text-[#064e3b] transition hover:bg-[#f0fdf4]"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-xl px-4 py-1.5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)] transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
              >
                Entrar
              </button>
            )}
          </nav>

          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl border border-[#a7f3d0] bg-white/80 px-3 py-2 text-sm font-bold text-[#064e3b] shadow-sm transition hover:bg-[#f0fdf4] md:hidden"
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

          <aside className="relative flex h-full w-72 flex-col gap-2 bg-white/95 p-5 shadow-2xl backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center">
                <AppLogo />
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-xl px-3 py-1 text-xl leading-none text-[#047857] hover:bg-[#f0fdf4]"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {user && (
              <p className="px-3 text-sm font-bold text-[#047857]">{user.username}</p>
            )}

            <div className="h-px bg-[#a7f3d0] mb-1" />

            <button
              type="button"
              onClick={() => { setSidebarOpen(false); navigate("/"); }}
              className={mobileNavClass(isOnLeitor)}
            >
              Leitor
            </button>
            <button
              type="button"
              onClick={handleHistoricoClick}
              className={mobileNavClass(isOnHistorico)}
            >
              Histórico
            </button>
            <button
              type="button"
              onClick={openAccessibility}
              className={mobileNavClass(false)}
            >
              Acessibilidade
            </button>
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#064e3b] hover:bg-[#f0fdf4]"
              >
                Sair
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setSidebarOpen(false); navigate("/login"); }}
                className="mt-1 rounded-xl px-3 py-3 text-left text-sm font-bold text-white hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
              >
                Entrar
              </button>
            )}
          </aside>
        </div>
      )}

      {showGuestModal && (
        <HistoricoGuestModal
          onConfirm={() => { setShowGuestModal(false); navigate("/login"); }}
          onCancel={() => setShowGuestModal(false)}
        />
      )}
    </>
  );
}
