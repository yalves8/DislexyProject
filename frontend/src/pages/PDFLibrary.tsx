import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { uploadPDF, listPDFs, deletePDF, PDFDocument } from "../services/pdfApi";
import SettingsModal from "../components/SettingsModal";

const FIRST_LOGIN_KEY = (username: string) =>
  `dislexy_first_login_done_${username}`;

export default function PDFLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [showSettings, setShowSettings] = useState(
    user ? !localStorage.getItem(FIRST_LOGIN_KEY(user.username)) : false
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchLibrary();
  }, [user]);

  async function fetchLibrary() {
    if (!user) return;
    setLoading(true);
    try {
      const list = await listPDFs(user.token);
      setDocs(list);
    } catch {
      // silently fail on initial load; list stays empty
    } finally {
      setLoading(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadError("");
    setUploading(true);

    try {
      const newDoc = await uploadPDF(file, user.token);
      setDocs((prev) => [newDoc, ...prev]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar PDF");
    } finally {
      setUploading(false);
      // reset so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: number) {
    if (!user) return;
    try {
      await deletePDF(id, user.token);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // ignore delete errors silently
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] px-4 py-8">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Minha Biblioteca</h1>
        <button
          onClick={handleImportClick}
          disabled={uploading}
          className="bg-[#061c44] text-white font-semibold px-5 rounded-xl transition-colors hover:opacity-90 disabled:opacity-60 flex items-center gap-2 min-h-[48px]"
        >
          {uploading ? "Processando..." : "Importar PDF"}
        </button>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="max-w-5xl mx-auto mb-4">
          <p className="text-red-500 text-sm">{uploadError}</p>
        </div>
      )}

      {/* Divider */}
      <div className="max-w-5xl mx-auto border-t border-gray-200 mb-6" />

      {/* Content */}
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-500 text-sm">Carregando biblioteca...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-gray-500 text-center">
              Nenhum PDF ainda. Importe seu primeiro PDF!
            </p>
            <button
              onClick={handleImportClick}
              disabled={uploading}
              className="bg-[#061c44] text-white font-semibold px-5 rounded-xl transition-colors hover:opacity-90 disabled:opacity-60 flex items-center gap-2 min-h-[48px]"
            >
              {uploading ? "Processando..." : "Importar PDF"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3"
              >
                {/* Card info */}
                <div className="flex-1">
                  <h2 className="text-gray-800 font-semibold text-sm leading-snug line-clamp-2 mb-1">
                    {doc.filename}
                  </h2>
                  <p className="text-gray-500 text-xs">
                    {doc.page_count} {doc.page_count === 1 ? "página" : "páginas"}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {formatDate(doc.created_at)}
                  </p>
                </div>

                {/* Card actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/library/${doc.id}`)}
                    className="flex-1 bg-[#061c44] text-white text-sm font-semibold rounded-lg transition-colors hover:opacity-90 min-h-[44px]"
                  >
                    Ler
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="px-3 text-red-500 text-sm font-medium rounded-lg border border-red-100 hover:bg-red-50 transition-colors min-h-[44px]"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
