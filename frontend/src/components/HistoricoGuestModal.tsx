interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function HistoricoGuestModal({ onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Fechar"
      />
      <div className="relative w-full max-w-sm rounded-3xl border border-white/80 bg-white/95 px-8 py-8 shadow-[0_8px_32px_rgba(16,185,129,0.18)] backdrop-blur-md">
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d1fae5]">
          <svg className="h-6 w-6 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="mt-4 text-lg font-extrabold text-[#064e3b]">
          Histórico requer conta
        </h2>
        <p className="mt-2 text-sm font-semibold text-[#047857]">
          Para salvar e acessar seu histórico de adaptações, você precisa criar uma conta ou fazer login.
        </p>
        <p className="mt-1 text-xs text-[#6b7280]">
          Sem conta, a adaptação atual fica disponível só enquanto você está nesta página.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(16,185,129,0.30)] transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
          >
            Ir para o login
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-[#a7f3d0] bg-white/60 py-3 text-sm font-bold text-[#047857] transition hover:bg-[#d1fae5]"
          >
            Ficar aqui
          </button>
        </div>
      </div>
    </div>
  );
}
