import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import ReadingSettings, { ReadingSettingsValue } from "./ReadingSettings";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const FIRST_LOGIN_KEY = (username: string) =>
  `dislexy_first_login_done_${username}`;

const DEFAULT: ReadingSettingsValue = {
  font_preference: "OpenDyslexic",
  font_size: 18,
  overlay_color: "#FFF3CD",
  ruler_enabled: true,
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReadingSettingsValue>(DEFAULT);
  const [saving, setSaving] = useState(false);

  if (!open || !user) return null;

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    try {
      await fetch(`${API_BASE}/students/me/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(settings),
      });
    } finally {
      setSaving(false);
      localStorage.setItem(FIRST_LOGIN_KEY(user.username), "1");
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay — não fecha ao clicar */}
      <div className="absolute inset-0 bg-[#061c44]/55 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm px-6 py-7">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">⚙️</div>
          <h2 className="text-lg font-extrabold text-[#064e3b]">Configure sua leitura</h2>
          <p className="text-sm text-gray-500">Personalize antes de começar</p>
        </div>

        <ReadingSettings value={settings} onChange={setSettings} />

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full text-white font-bold py-3 rounded-xl mt-6 transition-opacity disabled:opacity-60 shadow-[0_4px_14px_rgba(16,185,129,0.30)]"
          style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
        >
          {saving ? "Salvando..." : "✓ Começar a Ler"}
        </button>
      </div>
    </div>
  );
}
