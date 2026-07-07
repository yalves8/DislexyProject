import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { ReadingSettingsValue } from "../components/ReadingSettings";

export const DEFAULT_READING_SETTINGS: ReadingSettingsValue = {
  font_preference: "OpenDyslexic",
  font_size: 18, // clamped to 16–22 in UI
  overlay_color: "#FFF3CD",
  ruler_enabled: true,
  line_height: 1.8,
  letter_spacing: 0.5,
  high_contrast: false,
};

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const LOCAL_SETTINGS_KEY = "dilexy_local_reading_settings";

function mergeSettings(value: Partial<ReadingSettingsValue> | null | undefined): ReadingSettingsValue {
  return { ...DEFAULT_READING_SETTINGS, ...value };
}

function localSettingsKey(username?: string): string {
  return username ? `${LOCAL_SETTINGS_KEY}:${username}` : LOCAL_SETTINGS_KEY;
}

function readLocalSettings(username?: string): Partial<ReadingSettingsValue> | null {
  try {
    const raw = localStorage.getItem(localSettingsKey(username));
    return raw ? (JSON.parse(raw) as Partial<ReadingSettingsValue>) : null;
  } catch {
    return null;
  }
}

function loadLocalSettings(username?: string): ReadingSettingsValue {
  return mergeSettings(readLocalSettings(username));
}

function saveLocalSettings(settings: ReadingSettingsValue, username?: string) {
  localStorage.setItem(localSettingsKey(username), JSON.stringify(settings));
}

export function useReadingSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReadingSettingsValue>(DEFAULT_READING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      if (!user) {
        setSettings(loadLocalSettings());
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE}/students/me/settings`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (!res.ok) throw new Error("Não consegui carregar seus ajustes.");

        const data = (await res.json()) as Partial<ReadingSettingsValue>;
        const localSettings = readLocalSettings(user.username) ?? readLocalSettings();
        if (active) setSettings(mergeSettings({ ...data, ...localSettings }));
      } catch (err) {
        if (active) {
          setSettings(loadLocalSettings(user.username));
          setError(err instanceof Error ? err.message : "Não consegui carregar seus ajustes.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, [user]);

  async function saveSettings() {
    saveLocalSettings(settings, user?.username);

    if (!user) {
      return true;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/students/me/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          font_preference: settings.font_preference,
          font_size: settings.font_size,
          overlay_color: settings.overlay_color,
          ruler_enabled: settings.ruler_enabled,
        }),
      });

      if (!res.ok) throw new Error("Não consegui salvar seus ajustes.");
      return true;
    } catch (err) {
      setError(err instanceof Error ? `${err.message} Ajustes salvos neste navegador.` : "Ajustes salvos neste navegador.");
      return true;
    } finally {
      setSaving(false);
    }
  }

  return { settings, setSettings, saveSettings, loading, saving, error };
}
